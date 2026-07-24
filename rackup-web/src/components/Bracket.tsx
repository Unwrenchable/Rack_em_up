type MatchRow = {
  id: string;
  round: number;
  playerAId: string | null;
  playerBId: string | null;
  aScore: number | null;
  bScore: number | null;
  status: string;
};

export function Bracket({ matches }: { matches: MatchRow[] }) {
  const rounds: Record<number, MatchRow[]> = {};



  for (const m of matches) {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  }

  return (
    <div style={{ display: 'flex', gap: '40px' }}>
      {Object.entries(rounds).map(([round, ms]) => (
        <div key={round}>
          <h3>Round {round}</h3>
          {ms.map(match => (
            <div
              key={match.id}
              style={{
                border: '1px solid #444',
                padding: '10px',
                marginBottom: '10px',
                width: '180px',
              }}
            >
              <div>A: {match.playerAId ?? 'TBD'}</div>
              <div>B: {match.playerBId ?? 'TBD'}</div>
              <div>
                Score:{' '}
                {match.aScore !== null && match.bScore !== null
                  ? `${match.aScore} - ${match.bScore}`
                  : '—'}
              </div>
              <div>Status: {match.status}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
