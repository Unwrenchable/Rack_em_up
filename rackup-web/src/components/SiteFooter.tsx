import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Blog' },
  { to: '/faq', label: 'FAQ' },
] as const;

type Props = { compact?: boolean };

export function SiteFooter({ compact = false }: Props) {
  return (
    <footer className={`site-footer${compact ? ' site-footer-compact' : ''}`}>
      <nav className="site-footer-nav" aria-label="About RackUp">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `site-footer-link${isActive ? ' active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      {!compact && (
        <p className="site-footer-note">
          RackUp by Rack of Champions · rackofchampions.com
        </p>
      )}
    </footer>
  );
}
