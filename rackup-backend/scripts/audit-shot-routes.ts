/**
 * Physics audit of every SOTD catalogue route (no RealAI, no network).
 * Run: npm run audit:shot-routes   (exit 1 when a non-exempt map fails)
 */
import { listSotdMaps } from '../src/realai/v2/sotd-shot-maps';
import {
  ROUTE_AUDIT_EXEMPT,
  auditSotdRoute,
  formatRouteAudit,
} from '../src/realai/v2/sotd-route-audit';

function main() {
  const results = listSotdMaps().map((m) => auditSotdRoute(m));
  const counts = { pass: 0, warn: 0, fail: 0, exempt: 0 };
  let blocking = 0;
  for (const r of results) {
    const exempt = r.status === 'fail' && ROUTE_AUDIT_EXEMPT[r.id];
    if (exempt) counts.exempt += 1;
    else counts[r.status] += 1;
    if (r.status === 'fail' && !exempt) blocking += 1;
    const cut = r.cutDeg === null ? '' : ` cut ${r.cutDeg.toFixed(0)}°`;
    console.log(`${r.status.toUpperCase().padEnd(4)}${exempt ? ' (exempt)' : ''}${cut}  ${formatRouteAudit(r)}`);
    if (exempt) console.log(`      exempt: ${ROUTE_AUDIT_EXEMPT[r.id]}`);
  }
  console.log(
    `\n${results.length} routes: ${counts.pass} pass, ${counts.warn} warn, ${counts.fail} fail, ${counts.exempt} exempt (needs human review)`,
  );
  if (blocking) process.exitCode = 1;
}

main();
