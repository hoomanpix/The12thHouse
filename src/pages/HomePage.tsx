import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { siteConfig } from '../config/site';
import type { Release } from '../types';

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { artist: mockArtist, releases: mockReleases, recordPlay } = useCatalog();
  const visibleReleases = mockReleases.filter((release) => release.published);
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? visibleReleases[0];
  const homeReleaseCards = [
    ...visibleReleases.filter((release) => release.type === 'single').slice(0, 2),
    ...visibleReleases.filter((release) => release.type === 'album').slice(0, 1),
  ];

  if (!featuredRelease || homeReleaseCards.length === 0) {
    return <div className="page-section"><p className="admin-empty">No releases are published yet.</p></div>;
  }

  const playRelease = (release: Release) => {
    const queue = (release.tracks ?? []).map((track) => ({
      id: `${release.id}-${track.id}`,
      releaseId: release.id,
      trackId: track.id,
      title: track.title,
      audioUrl: track.audio_url,
      artworkUrl: release.artwork_url,
      releaseTitle: release.title,
      duration: track.duration,
    }));
    setQueue(queue);
    if (queue[0]) {
      recordPlay(release.id, queue[0].trackId);
      playTrack(queue[0]);
    }
  };

  return (
    <div className="page-section home-page">
      <section className="hero-block">
        <div className="hero-copy">
          <p className="eyebrow">{siteConfig.heroEyebrow}</p>
          <h1>{mockArtist.name}</h1>
          <p className="lede">
            Sculpted atmospheres, slow-burn rhythm, and intimate songs for the edge of the night.
          </p>
          <div className="hero-actions">
            <button type="button" className="button primary" onClick={() => playRelease(featuredRelease)}>
              Play latest
            </button>
            <Link to={publicRoutes.releases} className="button secondary">
              Browse releases
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} />
        </div>
      </section>

      <section className="home-release-collection" aria-labelledby="home-releases-title">
        <div className="section-heading">
          <p className="eyebrow">Selected releases</p>
          <h2 id="home-releases-title">A small collection of work.</h2>
        </div>
        <div className="release-grid home-release-grid">
          {homeReleaseCards.map((release) => (
            <article key={release.id} className="release-card">
              <Link to={`/releases/${release.slug}`} className="release-cover">
                <img src={release.artwork_url ?? ''} alt={release.title} />
              </Link>
              <div className="release-card-meta">
                <div>
                  <p className="eyebrow subtle release-type">{release.type}</p>
                  <h3>{release.title}</h3>
                </div>
                <time dateTime={release.release_date}>
                  {new Date(release.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </time>
              </div>
              <button type="button" className="text-link home-release-play" onClick={() => playRelease(release)}>
                Play selection
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
