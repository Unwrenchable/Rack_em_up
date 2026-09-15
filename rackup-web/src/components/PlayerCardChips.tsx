import { rocChipLabel, type PlayerCard } from '../lib/player-card';

type RocBits = {
  rating?: number | null;
  ratingDisplay?: string | null;
  band?: string | null;
  playerCard?: PlayerCard | null;
};

export function PlayerCardChips({
  rating,
  ratingDisplay,
  band,
  playerCard,
  compact = true,
  showEmptySlots = false,
}: RocBits & { compact?: boolean; showEmptySlots?: boolean }) {
  const roc = rocChipLabel({ rating, ratingDisplay, band, playerCard });
  const p = playerCard?.player;
  const fargo = p?.fargo_rating;
  const fargoPresent = fargo != null && Number.isFinite(fargo);
  const shadow = p?.rackup_shadow ?? null;
  const apa = p?.apa_sl ?? null;
  const bca = p?.bca_elo ?? null;
  const tap = p?.tap_stats?.skill ?? null;

  const fargoText = fargoPresent
    ? `Fargo ${Math.round(fargo!)}${
        p?.fargo_robustness != null ? ` · r${Math.round(p.fargo_robustness)}` : ''
      }`
    : 'Fargo —';

  const shadowText = shadow
    ? `RackUpRate ${Math.round(shadow.rating)} · r${Math.round(shadow.robustness)}`
    : 'RackUpRate —';

  return (
    <div className="player-card-chips" aria-label="Player ratings">
      <span className="rating-ring" title="ROC Glicko-2 (users.rating) — canonical ladder">
        {compact ? roc : `ROC ${roc}`}
      </span>
      {(fargoPresent || showEmptySlots) && (
        <span
          className={`chip chip-fargo${fargoPresent ? '' : ' chip-slot-empty'}`}
          title="FargoRate (read-only, never invented)"
        >
          {fargoText}
        </span>
      )}
      {(shadow != null || showEmptySlots) && (
        <span
          className={`chip chip-shadow${shadow ? '' : ' chip-slot-empty'}`}
          title="RackUpRate shadow — parallel display, does not overwrite Fargo or ROC"
        >
          {shadowText}
        </span>
      )}
      {apa != null && (
        <span className="chip chip-apa" title="APA skill level">
          APA SL {apa}
        </span>
      )}
      {bca != null && (
        <span className="chip chip-apa" title="BCA (manual import)">
          BCA {bca}
        </span>
      )}
      {tap != null && (
        <span className="chip chip-apa" title="TAP (manual import)">
          TAP {tap}
        </span>
      )}
    </div>
  );
}
