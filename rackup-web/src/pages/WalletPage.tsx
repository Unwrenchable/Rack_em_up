import { useEffect, useState } from 'react';
import {
  fetchRocWallet,
  updateRocWalletPreferences,
  isDemoMode,
} from '../lib/api';
import { useToast } from '../lib/toast-context';

type WalletData = Awaited<ReturnType<typeof fetchRocWallet>>;

/**
 * Profile money block — Available / Pending / Lifetime paid out.
 * Single USD ledger (card + USDC pay-ins, session payouts).
 */
export function WalletPage() {
  const { push } = useToast();
  const [data, setData] = useState<WalletData | null>(null);
  const [method, setMethod] = useState<'stripe_bank' | 'usdc'>('stripe_bank');
  const [usdc, setUsdc] = useState('');

  useEffect(() => {
    fetchRocWallet()
      .then((w) => {
        setData(w);
        setMethod(w.preferredPayoutMethod ?? 'stripe_bank');
        setUsdc(w.usdcWalletAddress ?? '');
      })
      .catch(() => push('Could not load wallet', 'err'));
  }, [push]);

  async function savePrefs() {
    try {
      const w = await updateRocWalletPreferences({
        preferredPayoutMethod: method,
        usdcWalletAddress: method === 'usdc' ? usdc || null : undefined,
      });
      setData((d) => (d ? { ...d, ...w, history: d.history } : d));
      push('Payout preferences saved', 'ok');
    } catch {
      push('Save failed', 'err');
    }
  }

  if (!data) {
    return (
      <div className="page">
        <p className="muted">Loading wallet…</p>
      </div>
    );
  }

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">ROC · USD</p>
        <h1 className="h1" style={{ fontSize: '2.25rem' }}>
          Winnings
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          One USD ledger for card, Apple Pay, Google Pay, and USDC. Session
          payouts post here automatically.
        </p>
      </header>

      {isDemoMode() && (
        <div className="card muted">Demo mode — sample balances.</div>
      )}

      <div className="grid-2" style={{ gap: 12 }}>
        <article className="card">
          <p className="eyebrow">Available</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{data.availableUsd}</p>
        </article>
        <article className="card">
          <p className="eyebrow">Pending</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{data.pendingUsd}</p>
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Open sessions / projected
          </p>
        </article>
        <article className="card">
          <p className="eyebrow">Lifetime paid out</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {data.lifetimePaidOutUsd}
          </p>
        </article>
        <article className="card">
          <p className="eyebrow">Lifetime earned</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {data.lifetimeEarnedUsd}
          </p>
        </article>
      </div>

      <section className="card stack">
        <h2 style={{ fontWeight: 600 }}>Preferred payout method</h2>
        <div className="field">
          <label>Method</label>
          <select
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value as 'stripe_bank' | 'usdc')}
          >
            <option value="stripe_bank">Bank (Stripe)</option>
            <option value="usdc">USDC wallet</option>
          </select>
        </div>
        {method === 'usdc' && (
          <div className="field">
            <label>USDC wallet (Solana preferred)</label>
            <input
              className="input"
              value={usdc}
              onChange={(e) => setUsdc(e.target.value)}
              placeholder="Solana address"
            />
          </div>
        )}
        <button type="button" className="btn btn-primary" onClick={savePrefs}>
          Save preferences
        </button>
      </section>

      <section className="stack" style={{ gap: 8 }}>
        <h2 style={{ fontWeight: 600 }}>Transaction history</h2>
        {data.history.length === 0 && (
          <p className="muted">No payments or payouts yet.</p>
        )}
        {data.history.map((h) => (
          <article key={`${h.kind}-${h.id}`} className="card">
            <div className="row-between">
              <span className="chip">
                {h.kind === 'payment_in' ? 'Paid in' : 'Payout'}
              </span>
              <strong>{h.amountUsd}</strong>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 6 }}>
              {h.method} · {h.status}
              {h.sessionId ? ` · session ${h.sessionId.slice(0, 8)}` : ''}
              {h.stripeRef ? ` · ${h.stripeRef.slice(0, 16)}…` : ''}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
