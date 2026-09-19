import { useState } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GlobalAudioPlayer } from './components/GlobalAudioPlayer';
import { InteractiveIntro } from './components/InteractiveIntro';
import { HomePage } from './pages/HomePage';
import { ReleasesPage } from './pages/ReleasesPage';
import { ReleaseDetailPage } from './pages/ReleaseDetailPage';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { AudioPlayerProvider } from './features/audio-player/AudioPlayerProvider';
import { publicRoutes } from './config/routes';
import { CatalogProvider } from './features/catalog/CatalogProvider';

export default function App() {
  const [introComplete, setIntroComplete] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 640px), (prefers-reduced-motion: reduce)').matches;
  });
  const location = useLocation();
  const isAdminRoute = location.pathname === publicRoutes.admin;

  return (
    <>
      {!introComplete && !isAdminRoute && (
        <InteractiveIntro artistName="The12thHouse" onComplete={() => setIntroComplete(true)} />
      )}

      <CatalogProvider>
        <AudioPlayerProvider>
          {isAdminRoute ? (
            <div className="admin-shell">
              <header className="admin-topbar">
                <Link to={publicRoutes.home} className="brand-link" aria-label="Return to The12thHouse website">
                  <span className="brand-line brand-line--top">THE12TH</span>
                  <span className="brand-line brand-line--bottom">HOUSE</span>
                </Link>
                <Link to={publicRoutes.home} className="admin-back-link">Back to site</Link>
              </header>
              <main className="admin-page-shell"><AdminPage /></main>
              <GlobalAudioPlayer />
            </div>
          ) : (
            <Layout>
              <Routes>
                <Route path={publicRoutes.home} element={<HomePage />} />
                <Route path={publicRoutes.releases} element={<ReleasesPage />} />
                <Route path={publicRoutes.releaseDetail} element={<ReleaseDetailPage />} />
                <Route path={publicRoutes.about} element={<AboutPage />} />
              </Routes>
            </Layout>
          )}
        </AudioPlayerProvider>
      </CatalogProvider>
    </>
  );
}
