import React from 'react';

export function Bracket({ matches }) {
  // Group matches by round
  const rounds: Record<number, any[]> = {};
  for (const m of matches) {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  }

  return (
    <div style={{ display: 'flex', gap: '40px', padding: '20px' }}>
      {Object.entries(rounds).map(([round, ms]) => (
        <div key={round}>
          <h2 style={{ marginBottom: '10px' }}>Round {round}</h2>
          {ms.map(match => (
            <div
              key={match.id}
              style={{
                border: '1px solid #444',
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '12px',
                width: '200px',
                background: '#1e1e1e',
                color: '#fff',
              }}
            >
              <div><strong>A:</strong> {match.playerAId ?? 'TBD'}</div>
              <div><strong>B:</strong> {match.playerBId ?? 'TBD'}</div>
              <div style={{ marginTop: '6px' }}>
                <strong>Score:</strong>{' '}
                {match.aScore !== null && match.bScore !== null
                  ? `${match.aScore} - ${match.bScore}`
                  : '—'}
              </div>
              <div><strong>Status:</strong> {match.status}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
