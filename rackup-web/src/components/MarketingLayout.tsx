import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { SiteFooter } from './SiteFooter';

export function MarketingLayout() {
  const { user } = useAuth();

  return (
    <div className="marketing-shell">
      <header className="marketing-top">
        <Link to={user ? '/' : '/about'} className="marketing-brand" aria-label="RackUp">
          <img className="brand-mark" src="/icon-192.png" width={40} height={40} alt="" />
          <div>
            <div className="logo-mark logo-mark-sm">RACKUP</div>
            <p className="marketing-tag">Rack of Champions</p>
          </div>
        </Link>
        {user ? (
          <Link to="/" className="btn btn-secondary btn-sm">
            App
          </Link>
        ) : (
          <Link to="/auth" className="btn btn-primary btn-sm">
            Join
          </Link>
        )}
      </header>
      <Outlet />
      <SiteFooter />
    </div>
  );
}
