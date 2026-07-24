type SwissMatch = {
  id: string;
  playerAId: string | null;
  playerBId: string | null;
  aScore: number | null;
  bScore: number | null;
  status: string;
};

type SwissStanding = {
  player: string;
  score: number;
};

export function SwissBracket({ rounds, standings }: { rounds: Record<number, SwissMatch[]>; standings: SwissStanding[] }) {
  return (

    <div style={{ display: 'flex', gap: '40px' }}>
      <div>
        <h2>Swiss Rounds</h2>
        {Object.entries(rounds).map(([round, matches]) => (
          <div key={round}>
            <h3>Round {round}</h3>
            {matches.map((m) => (
              <div
                key={m.id}
                style={{
                  border: '1px solid #444',
                  padding: '10px',
                  marginBottom: '10px',
                  width: '200px',
                  background: '#1e1e1e',
                  color: '#fff',
                }}
              >
                <div>A: {m.playerAId ?? 'TBD'}</div>
                <div>B: {m.playerBId ?? 'TBD'}</div>
                <div>
                  Score:{' '}
                  {m.aScore !== null && m.bScore !== null
                    ? `${m.aScore} - ${m.bScore}`
                    : '—'}
                </div>
                <div>Status: {m.status}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div>
        <h2>Standings</h2>
        {standings.map((s) => (
          <div key={s.player}>
            {s.player}: {s.score}
          </div>
        ))}
      </div>
    </div>
  );
}
