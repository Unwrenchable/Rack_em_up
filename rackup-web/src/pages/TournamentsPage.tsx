import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Bracket } from '../components/Bracket';
import { io } from 'socket.io-client';

export function TournamentsPage() {
  type TournamentRow = {
    id: string;
    name: string;
    organizerId: string;
    configJson?: { entrants?: string[] };
  };

  type TournamentMatchRow = {
    id: string;
    round: number;
    matchIndex: number;
    playerAId: string | null;
    playerBId: string | null;
    aScore: number | null;
    bScore: number | null;
    status: string;
  };

  type TournamentDetails = {
    tournament: TournamentRow;
    matches: TournamentMatchRow[];
  };

  const { id } = useParams();
  const [data, setData] = useState<TournamentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------
  // Load tournament + live updates
  // -----------------------------
  useEffect(() => {
    if (!id) return;

    api
      .getTournament(id)
      .then((res: any) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error(err);
        setError('Failed to load tournament');
        setLoading(false);
      });

    // Production-ready Socket.IO connection
    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
      : 'http://localhost:3000';

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.emit('joinTournamentRoom', id);

    socket.on('tournamentUpdated', (updated) => {
      setData(updated);
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (loading) return <div>Loading tournament...</div>;
  if (error) return <div>{error}</div>;
  if (!data) return <div>No tournament found.</div>;

  const tournament = data.tournament;
  const matches = data.matches;

  return (
    <div style={{ padding: '20px' }}>
      <h1>{tournament.name}</h1>

      {/* Registration Button */}
      <button
        onClick={() => {
          api
            .post(`/tournaments/${id}/register`, { user_id: tournament.organizerId })
            .then(() => alert('Registered!'))
            .catch(() => alert('Registration failed'));
        }}
        style={{
          padding: '10px 16px',
          marginBottom: '20px',
          background: '#1e1e1e',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Register for Tournament
      </button>

      {/* Entrants List */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Entrants</h2>
        {tournament.configJson?.entrants?.map((e) => (
          <div key={e}>{e}</div>
        ))}
      </div>

      {/* Bracket Viewer */}
      <Bracket matches={matches} />

      {/* Advance Round Button */}
      <button
        onClick={() => {
          api
            .post(`/tournaments/${id}/advance`, { round: 1 })
            .then(() => window.location.reload())
            .catch(() => alert('Failed to advance round'));
        }}
        style={{
          padding: '10px 16px',
          marginTop: '20px',
          background: '#1e1e1e',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Advance Round
      </button>

      {/* Match Reporting UI */}
      <div style={{ marginTop: '40px' }}>
        <h2>Report Matches</h2>

        {matches.map((match) => (
          <div key={match.id} style={{ marginTop: '20px' }}>
            <h3>
              Round {match.round}, Match {match.matchIndex}
            </h3>

            <div>
              <strong>A:</strong> {match.playerAId ?? 'TBD'}
              <br />
              <strong>B:</strong> {match.playerBId ?? 'TBD'}
            </div>

            {match.status !== 'COMPLETED' &&
              match.playerAId &&
              match.playerBId && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const aScore = Number(
                      (form.elements.namedItem('aScore') as HTMLInputElement).value,
                    );
                    const bScore = Number(
                      (form.elements.namedItem('bScore') as HTMLInputElement).value,
                    );

                    api
                      .post(`/tournaments/${id}/report-match`, {
                        match_id: match.id,
                        a_score: aScore,
                        b_score: bScore,
                      })
                      .then(() => window.location.reload())
                      .catch(() => alert('Failed to report match'));
                  }}
                  style={{ marginTop: '10px' }}
                >
                  <input
                    name="aScore"
                    type="number"
                    placeholder="A score"
                    style={{ marginRight: '10px' }}
                  />
                  <input
                    name="bScore"
                    type="number"
                    placeholder="B score"
                    style={{ marginRight: '10px' }}
                  />
                  <button type="submit">Submit Score</button>
                </form>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}