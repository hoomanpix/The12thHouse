import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InteractiveIntro } from './components/InteractiveIntro';
import { HomePage } from './pages/HomePage';
import { ReleasesPage } from './pages/ReleasesPage';
import { ReleaseDetailPage } from './pages/ReleaseDetailPage';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute';
import { AudioPlayerProvider } from './features/audio-player/AudioPlayerProvider';
import { publicRoutes } from './config/routes';
import { CatalogProvider } from './features/catalog/CatalogProvider';
import { AuthProvider } from './features/auth/AuthProvider';

export default function App() {
  const [introComplete, setIntroComplete] = useState(false);
  const [blackoutActive, setBlackoutActive] = useState(false);

  useEffect(() => {
    if (!introComplete) return;
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflowY = 'auto';
    document.documentElement.style.overflowY = 'auto';
  }, [introComplete]);

  useEffect(() => {
    let timer: number | undefined;
    let activeCover: Element | null = null;
    let spotlightClone: HTMLElement | null = null;
    let spotlightInfo: HTMLElement | null = null;

    const updateSpotlightPosition = () => {
      if (activeCover && !spotlightClone) {
        activeCover = null;
        clearBlackout();
        return;
      }
      if (!activeCover || !spotlightClone) return;
      const bounds = activeCover.getBoundingClientRect();
      spotlightClone.style.left = `${bounds.left}px`;
      spotlightClone.style.top = `${bounds.top}px`;
      if (spotlightInfo) {
        spotlightInfo.style.left = `${Math.max(24, Math.min(bounds.left, window.innerWidth - 280))}px`;
        spotlightInfo.style.top = `${Math.min(bounds.bottom + 16, window.innerHeight - 96)}px`;
      }
    };

    const clearBlackout = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      activeCover?.classList.remove('cover-spotlight');
      spotlightClone?.remove();
      spotlightClone = null;
      spotlightInfo?.remove();
      spotlightInfo = null;
      document.body.style.overflowY = 'auto';
      document.documentElement.style.overflowY = 'auto';
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      setBlackoutActive(false);
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || window.matchMedia('(max-width: 768px)').matches) return;
      const cover = (event.target as Element | null)?.closest('.music-cover');
      if (!cover || cover === activeCover) return;
      clearBlackout();
      activeCover = cover;
      timer = window.setTimeout(() => {
        if (!activeCover) return;
        const bounds = activeCover.getBoundingClientRect();
        spotlightClone = activeCover.cloneNode(true) as HTMLElement;
        spotlightClone.classList.add('cover-spotlight-clone');
        spotlightClone.setAttribute('aria-hidden', 'true');
        spotlightClone.style.left = `${bounds.left}px`;
        spotlightClone.style.top = `${bounds.top}px`;
        spotlightClone.style.width = `${bounds.width}px`;
        spotlightClone.style.height = `${bounds.height}px`;
        document.body.appendChild(spotlightClone);

        const releaseCard = activeCover.closest('.release-card, .release-detail, .feature-card');
        const title =
          releaseCard?.querySelector('h1, h2, h3')?.textContent?.trim() ||
          activeCover.querySelector('img')?.getAttribute('alt') ||
          'Now playing';
        const type = releaseCard?.querySelector('.eyebrow, .feature-copy > p')?.textContent?.trim() || 'Release';
        spotlightInfo = document.createElement('div');
        spotlightInfo.className = 'spotlight-info';
        spotlightInfo.style.left = `${Math.max(24, Math.min(bounds.left, window.innerWidth - 280))}px`;
        spotlightInfo.style.top = `${Math.min(bounds.bottom + 16, window.innerHeight - 96)}px`;
        const typeElement = document.createElement('span');
        typeElement.className = 'spotlight-info__type';
        typeElement.textContent = type;
        const titleElement = document.createElement('strong');
        titleElement.className = 'spotlight-info__title';
        titleElement.textContent = title;
        spotlightInfo.append(typeElement, titleElement);
        document.body.appendChild(spotlightInfo);
        document.body.style.overflowY = 'auto';
        document.documentElement.style.overflowY = 'auto';
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        setBlackoutActive(true);
      }, 2000);
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

    const handleWheel = () => {
      if (activeCover && !spotlightClone) {
        activeCover = null;
        clearBlackout();
      }
    };

    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('scroll', updateSpotlightPosition, { passive: true });
    window.addEventListener('resize', handleViewportChange);
    return () => {
      clearBlackout();
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', updateSpotlightPosition);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  return (
    <div className={`app-stage${blackoutActive ? ' blackout-active' : ''}`}>
      {!introComplete && (
        <InteractiveIntro artistName="The12thHouse" onComplete={() => setIntroComplete(true)} />
      )}

      <AuthProvider>
        <CatalogProvider>
          <AudioPlayerProvider>
            <Layout>
              <Routes>
              <Route path={publicRoutes.home} element={<HomePage />} />
              <Route path={publicRoutes.releases} element={<ReleasesPage />} />
              <Route path={publicRoutes.releaseDetail} element={<ReleaseDetailPage />} />
              <Route path={publicRoutes.about} element={<AboutPage />} />
                <Route path={publicRoutes.login} element={<LoginPage />} />
                <Route path={publicRoutes.admin} element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
              </Routes>
            </Layout>
          </AudioPlayerProvider>
        </CatalogProvider>
      </AuthProvider>

      {blackoutActive && <div className="blackout-layer" aria-hidden="true" />}
    </div>
  );
}
