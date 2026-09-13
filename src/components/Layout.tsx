import { NavLink } from 'react-router-dom';
import { GlobalAudioPlayer } from './GlobalAudioPlayer';
import { publicRoutes } from '../config/routes';

const navItems = [
  { label: 'Home', to: publicRoutes.home },
  { label: 'Releases', to: publicRoutes.releases },
  { label: 'About', to: publicRoutes.about },
  { label: 'Admin', to: publicRoutes.admin },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="brand-block">
          <NavLink to={publicRoutes.home} className="brand-link" aria-label="Sable Arcade home">
            Sable Arcade
          </NavLink>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-shell">{children}</main>

      <GlobalAudioPlayer />
    </div>
  );
}
