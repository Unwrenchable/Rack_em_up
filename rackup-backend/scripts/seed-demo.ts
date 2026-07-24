/**
 * Idempotent demo seed: users, halls (Vegas), SOTD completions sample.
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
  const ace = await users.findOne({ where: { email: 'ace@rackup.demo' } as any });
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

  await ds.destroy();
  console.log('Seed complete. Demo password: demo1234');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
