/**
 * Dry-run merge of a RealAI SotdProposeEnvelope into live map + catalog copies.
 * Does not write sotd-shot-maps.ts / shot-catalog.ts — roc pastes the printed objects.
 *
 *   npx ts-node -T scripts/merge-sotd-envelope.ts path/to/envelope.json
 */
import * as fs from 'fs';
import * as path from 'path';

import { SHOT_CATALOG } from '../src/shots/shot-catalog';
import { SOTD_SHOT_MAPS } from '../src/realai/v2/sotd-shot-maps';
import {
  applySotdProposeEnvelope,
  SOTD_PROPOSE_APPLY_HELP,
} from '../src/realai/v2/sotd-propose-ingest';

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npx ts-node -T scripts/merge-sotd-envelope.ts <envelope.json>');
    process.exit(2);
  }
  const raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const result = applySotdProposeEnvelope(raw, {
    maps: SOTD_SHOT_MAPS,
    catalog: SHOT_CATALOG,
  });
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        persisted: false,
        action: result.action,
        how: SOTD_PROPOSE_APPLY_HELP,
        map: result.map,
        catalog: result.catalog,
        localGeometry: result.localGeometry,
      },
      null,
      2,
    ),
  );
}

main();
