import { NavLink } from 'react-router-dom';
import { IconHome, IconPlay, IconSearch, IconUser, IconUsers } from './Icons';

const items = [
  { to: '/', label: 'Home', icon: IconHome, end: true },
  { to: '/find', label: 'Find', icon: IconSearch },
  { to: '/play', label: 'Play', icon: IconPlay },
  { to: '/social', label: 'Social', icon: IconUsers },
  { to: '/profile', label: 'You', icon: IconUser },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav-inner">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="icon-wrap">
              <Icon />
            </span>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}