import type { RocSplitBps } from './entities/roc-league.entity';
import { ROC_DEFAULT_SPLIT } from './entities/roc-league.entity';

export function cents(n: number | string | bigint): number {
  return Math.max(0, Math.round(Number(n)));
}

export function centsStr(n: number): string {
  return String(Math.max(0, Math.round(n)));
}

export function normalizeSplit(raw?: Partial<RocSplitBps> | null): RocSplitBps {
  const s = {
    players_fund_bps: Number(raw?.players_fund_bps ?? ROC_DEFAULT_SPLIT.players_fund_bps),
    operator_bps: Number(raw?.operator_bps ?? ROC_DEFAULT_SPLIT.operator_bps),
    platform_bps: Number(raw?.platform_bps ?? ROC_DEFAULT_SPLIT.platform_bps),
  };
  const sum = s.players_fund_bps + s.operator_bps + s.platform_bps;
  if (sum !== 10000) {
    return { ...ROC_DEFAULT_SPLIT };
  }
  return s;
}

/**
 * Integer split of A cents. Remainder → Players Fund (player-friendly dust policy).
 */
export function splitAmountUsd(
  amountUsdCents: number,
  split?: Partial<RocSplitBps> | null,
): {
  players_fund_cents: number;
  operator_cents: number;
  platform_cents: number;
  bps: RocSplitBps;
} {
  const A = cents(amountUsdCents);
  const bps = normalizeSplit(split);
  const operator_cents = Math.floor((A * bps.operator_bps) / 10000);
  const platform_cents = Math.floor((A * bps.platform_bps) / 10000);
  const players_fund_cents = A - operator_cents - platform_cents;
  return { players_fund_cents, operator_cents, platform_cents, bps };
}

export function formatUsd(centsAmount: number | string): string {
  const n = cents(centsAmount);
  return `$${(n / 100).toFixed(2)}`;
}
