import { NavLink } from 'react-router-dom';
import { GlobalAudioPlayer } from './GlobalAudioPlayer';
import { publicRoutes } from '../config/routes';
import { useAuth } from '../features/auth/AuthProvider';

const navItems = [
  { label: 'Home', to: publicRoutes.home },
  { label: 'Releases', to: publicRoutes.releases },
  { label: 'About', to: publicRoutes.about },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const canManage = role === 'artist' || role === 'admin';
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="topbar">
        <div className="brand-block">
          <NavLink to={publicRoutes.home} className="brand-link" aria-label="The12thHouse home">
            <span className="brand-line brand-line--top">THE12TH</span>
            <span className="brand-line brand-line--bottom">HOUSE</span>
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
          {canManage && <NavLink to={publicRoutes.admin} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>Admin</NavLink>}
          {user && <button type="button" className="nav-item nav-logout" onClick={() => void signOut()}>Sign out</button>}
        </nav>
      </header>

      <main className="page-shell" id="main-content" tabIndex={-1}>{children}</main>

      <GlobalAudioPlayer />
    </div>
  );
}
