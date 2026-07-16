import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuth } from '../lib/auth-context';

export function Layout() {
  const { demo } = useAuth();

  return (
    <div className="app-shell">
      {demo && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            padding: '8px 14px',
            textAlign: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#1a1406',
            background: 'linear-gradient(90deg, #e0b45a, #f0d080, #e0b45a)',
          }}
        >
          Demo mode · live data when API is up
        </div>
      )}
      <Outlet />
      <BottomNav />
    </div>
  );
}