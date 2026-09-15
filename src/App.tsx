import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
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
  const [introComplete, setIntroComplete] = useState(false);
  const [blackoutActive, setBlackoutActive] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    let activeCover: Element | null = null;

    const clearBlackout = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      setBlackoutActive(false);
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || window.matchMedia('(max-width: 768px)').matches) return;
      const cover = (event.target as Element | null)?.closest('.music-cover');
      if (!cover || cover === activeCover) return;
      clearBlackout();
      activeCover = cover;
      timer = window.setTimeout(() => setBlackoutActive(true), 3000);
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!activeCover) return;
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && activeCover.contains(nextTarget)) return;
      activeCover = null;
      clearBlackout();
    };

    const handleViewportChange = () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        activeCover = null;
        clearBlackout();
      }
    };

    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      clearBlackout();
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  return (
    <div className="app-stage">
      {blackoutActive && <div className="blackout-layer" aria-hidden="true" />}
      {!introComplete && (
        <InteractiveIntro artistName="THE12THHOUSE" onComplete={() => setIntroComplete(true)} />
      )}

      <CatalogProvider>
        <AudioPlayerProvider>
          <Layout>
            <Routes>
              <Route path={publicRoutes.home} element={<HomePage />} />
              <Route path={publicRoutes.releases} element={<ReleasesPage />} />
              <Route path={publicRoutes.releaseDetail} element={<ReleaseDetailPage />} />
              <Route path={publicRoutes.about} element={<AboutPage />} />
              <Route path={publicRoutes.admin} element={<AdminPage />} />
            </Routes>
          </Layout>
        </AudioPlayerProvider>
      </CatalogProvider>
    </div>
  );
}
