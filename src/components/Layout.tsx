import { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const canManage = role === 'artist' || role === 'admin';
  const closeMenu = () => setMenuOpen(false);
  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="brand-block"><NavLink to={publicRoutes.home} className="brand-link" aria-label="The12thHouse home" onClick={closeMenu}><span className="brand-line brand-line--top">THE12TH</span><span className="brand-line brand-line--bottom">HOUSE</span></NavLink></div>
        <button type="button" className="menu-trigger" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((open) => !open)}>Menu <span aria-hidden="true">{menuOpen ? '×' : '＋'}</span></button>
        <nav id="main-navigation" className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          {navItems.map((item) => <NavLink key={item.to} to={item.to} onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>{item.label}</NavLink>)}
          {canManage && <NavLink to={publicRoutes.admin} onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>Admin</NavLink>}
          {user && <button type="button" className="nav-item nav-logout" onClick={() => { closeMenu(); void signOut(); }}>Sign out</button>}
        </nav>
      </header>
      <main className="page-shell">{children}</main>
      <GlobalAudioPlayer />
    </div>
  );
}
