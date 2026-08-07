/**
 * Idempotent demo seed: users, halls (Vegas), SOTD completions, V2 season/tournament + id bridges.
 *
 * Usage:
 *   cd rackup-backend && npx ts-node -r dotenv/config scripts/seed-demo.ts
 *
 * Requires Postgres up (docker compose) and env DATABASE_URL / DB_* .
 */
import * as dotenv from 'dotenv';
dotenv.config();

import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/config/ormconfig';

async function main() {
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: true,
    entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
  });
  await ds.initialize();
  console.log('Connected');

  const users = ds.getRepository('User' as any);
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const demos = [
    { email: 'ace@rackup.demo', displayName: 'Ace Delgado', rating: 720 },
    { email: 'vee@rackup.demo', displayName: 'VegasVee', rating: 680 },
    { email: 'bank@rackup.demo', displayName: 'BankShot_B', rating: 640 },
  ];

  for (const d of demos) {
    const existing = await users.findOne({ where: { email: d.email } as any });
    if (existing) {
      console.log('user exists', d.email);
      continue;
    }
    await users.save(
      users.create({
        email: d.email,
        passwordHash,
        displayName: d.displayName,
        rating: d.rating,
        reputation: 10,
        role: 'USER',
      } as any),
    );
    console.log('created user', d.email);
  }

  const ace = await users.findOne({ where: { email: 'ace@rackup.demo' } as any });
  const vee = await users.findOne({ where: { email: 'vee@rackup.demo' } as any });
  const bank = await users.findOne({ where: { email: 'bank@rackup.demo' } as any });

  // Vegas halls via seed service JSON if halls table empty
  const halls = ds.getRepository('Hall' as any);
  const count = await halls.count();
  if (count === 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const vegas = require('../src/halls/v2/seed/las-vegas-halls.json');
      const list = Array.isArray(vegas) ? vegas : vegas.halls ?? [];
      for (const h of list.slice(0, 20)) {
        await halls.save(
          halls.create({
            name: h.name,
            lat: h.lat,
            lon: h.lon,
            address: h.address ?? null,
            tableCount: h.tableCount ?? h.tables ?? null,
            isVerified: true,
          } as any),
        );
      }
      console.log('seeded halls', Math.min(20, list.length));
    } catch (e) {
      console.warn('hall seed skipped', e);
    }
  } else {
    console.log('halls already present', count);
  }

  // Sample SOTD completion for first demo user
  if (ace) {
    try {
      const completions = ds.getRepository('SotdCompletion' as any);
      const today = new Date().toISOString().slice(0, 10);
      const ex = await completions.findOne({
        where: { userId: ace.id, completedOn: today } as any,
      });
      if (!ex) {
        await completions.save(
          completions.create({
            userId: ace.id,
            shotId: 'sotd-01',
            completedOn: today,
          } as any),
        );
        console.log('sotd completion for ace');
      }
    } catch (e) {
      console.warn('sotd completion skipped (table may not exist yet)', e);
    }
  }

  // --- Phase 3A: demo V2 season + tournament + id bridges ---
  try {
    const bridges = ds.getRepository('IdBridge' as any);
    const seasons = ds.getRepository('LeagueSeason' as any);
    const standings = ds.getRepository('LeagueStanding' as any);
    const tournamentsV2 = ds.getRepository('TournamentV2' as any);

    // V2 league season
    let season = await seasons.findOne({ where: { name: 'Demo Vegas Season' } as any });
    if (!season && ace) {
      season = await seasons.save(
        seasons.create({
          organizerId: ace.id,
          name: 'Demo Vegas Season',
          region: 'Las Vegas',
          status: 'ACTIVE',
          weekIndex: 1,
          weeklySchedule: [],
          startedAt: new Date(),
        } as any),
      );
      console.log('created league season V2', season.id);

      const playerIds = [ace, vee, bank].filter(Boolean).map((u: any) => u.id);
      for (const pid of playerIds) {
        const exists = await standings.findOne({
          where: { seasonId: season.id, playerId: pid } as any,
        });
        if (!exists) {
          await standings.save(
            standings.create({
              seasonId: season.id,
              playerId: pid,
              points: pid === ace.id ? 6 : pid === vee?.id ? 3 : 0,
              position: 0,
            } as any),
          );
        }
      }
      console.log('seeded standings for demo season');
    }

    // V2 tournament
    let tourney = await tournamentsV2.findOne({ where: { name: 'Demo RackUp Open' } as any });
    if (!tourney && ace) {
      const entrants = [ace, vee, bank].filter(Boolean).map((u: any) => u.id);
      tourney = await tournamentsV2.save(
        tournamentsV2.create({
          organizerId: ace.id,
          name: 'Demo RackUp Open',
          game: '9-ball',
          mode: 'SINGLE_ELIMINATION',
          status: 'DRAFT',
          entrants,
          formatConfigJson: {},
        } as any),
      );
      console.log('created tournament V2', tourney.id);
    }

    // Optional V1 league/tournament → V2 bridges (if V1 tables have rows)
    try {
      const leaguesV1 = ds.getRepository('League' as any);
      const v1Leagues = await leaguesV1.find({ take: 5 });
      if (season && v1Leagues.length) {
        for (const l of v1Leagues) {
          const existing = await bridges.findOne({
            where: { kind: 'league', v1Id: l.id } as any,
          });
          if (!existing) {
            await bridges.save(
              bridges.create({
                kind: 'league',
                v1Id: l.id,
                v2Id: season.id,
                meta: { seeded: true, seasonName: season.name },
              } as any),
            );
            console.log('id-bridge league', l.id, '→', season.id);
          }
        }
      } else if (season) {
        // Identity bridge: season maps to itself so resolvers always work
        const self = await bridges.findOne({
          where: { kind: 'league', v1Id: season.id } as any,
        });
        if (!self) {
          await bridges.save(
            bridges.create({
              kind: 'league',
              v1Id: season.id,
              v2Id: season.id,
              meta: { seeded: true, identity: true },
            } as any),
          );
          console.log('id-bridge league identity', season.id);
        }
      }
    } catch (e) {
      console.warn('league bridge seed skipped', e);
    }

    try {
      const toursV1 = ds.getRepository('Tournament' as any);
      const v1Tours = await toursV1.find({ take: 5 });
      if (tourney && v1Tours.length) {
        for (const t of v1Tours) {
          const existing = await bridges.findOne({
            where: { kind: 'tournament', v1Id: t.id } as any,
          });
          if (!existing) {
            await bridges.save(
              bridges.create({
                kind: 'tournament',
                v1Id: t.id,
                v2Id: tourney.id,
                meta: { seeded: true, name: tourney.name },
              } as any),
            );
            console.log('id-bridge tournament', t.id, '→', tourney.id);
          }
        }
      } else if (tourney) {
        const self = await bridges.findOne({
          where: { kind: 'tournament', v1Id: tourney.id } as any,
        });
        if (!self) {
          await bridges.save(
            bridges.create({
              kind: 'tournament',
              v1Id: tourney.id,
              v2Id: tourney.id,
              meta: { seeded: true, identity: true },
            } as any),
          );
          console.log('id-bridge tournament identity', tourney.id);
        }
      }
    } catch (e) {
      console.warn('tournament bridge seed skipped', e);
    }
  } catch (e) {
    console.warn('V2 / id-bridge seed skipped', e);
  }

  await ds.destroy();
  console.log('Seed complete. Demo password: demo1234');
  console.log('Tip: open league standings with V2 season id or bridged V1 league id.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
