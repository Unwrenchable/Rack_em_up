import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

export default function TournamentsListPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/tournaments')
      .then((res) => {
        setTournaments(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load tournaments');
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading tournaments...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Tournaments</h1>

      <div style={{ marginTop: '20px' }}>
        {tournaments.map((t) => (
          <Link
            key={t.id}
            to={`/tournaments/${t.id}`}
            style={{
              display: 'block',
              padding: '12px',
              marginBottom: '10px',
              border: '1px solid #444',
              borderRadius: '6px',
              background: '#1e1e1e',
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <strong>{t.name}</strong>
            <div>{t.game}</div>
            <div>Starts: {new Date(t.startsAt).toLocaleString()}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
