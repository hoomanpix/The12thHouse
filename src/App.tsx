import { useState } from 'react';
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

export default function App() {
  const [introComplete, setIntroComplete] = useState(false);

  return (
    <>
      {!introComplete && (
        <InteractiveIntro artistName="NEW WAVE" onComplete={() => setIntroComplete(true)} />
      )}

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
    </>
  );
}
