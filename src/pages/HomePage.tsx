import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { siteConfig } from '../config/site';
import type { Release } from '../types';

type HomeCard =
  | { kind: 'release'; release: Release }
  | { kind: 'placeholder'; title: string; type: 'single' | 'album' };

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { artist: mockArtist, releases: mockReleases, recordPlay } = useCatalog();
  const visibleReleases = mockReleases.filter((release) => release.published);
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? visibleReleases[0];
  const singleReleases = visibleReleases.filter((release) => release.type === 'single').slice(0, 2);
  const albumRelease = visibleReleases.find((release) => release.type === 'album');
  const homeCards: HomeCard[] = [
    singleReleases[0]
      ? { kind: 'release', release: singleReleases[0] }
      : { kind: 'placeholder', title: 'Single 01', type: 'single' },
    singleReleases[1]
      ? { kind: 'release', release: singleReleases[1] }
      : { kind: 'placeholder', title: 'Single 02', type: 'single' },
    albumRelease
      ? { kind: 'release', release: albumRelease }
      : { kind: 'placeholder', title: 'Album', type: 'album' },
  ];

  if (!featuredRelease) {
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
        <div className="home-release-grid">
          {homeCards.map((card, index) => {
            if (card.kind === 'placeholder') {
              return (
                <article key={`placeholder-${card.type}-${index}`} className="feature-card home-feature-card home-feature-card--placeholder">
                  <div className="feature-artwork home-feature-placeholder-artwork" aria-label={`${card.title} placeholder`}>
                    <span>{card.type}</span>
                    <strong>{card.title}</strong>
                  </div>
                  <div className="feature-copy">
                    <p className="release-type">{card.type}</p>
                    <h3>{card.title}</h3>
                    <time className="release-date">Coming soon</time>
                    <p>New work from The12thHouse will appear here.</p>
                  </div>
                </article>
              );
            }

            const release = card.release;
            return (
              <article key={release.id} className="feature-card home-feature-card">
                <div className="feature-artwork">
                  <Link to={`/releases/${release.slug}`} aria-label={`View ${release.title}`}>
                    <img src={release.artwork_url ?? ''} alt={release.title} />
                  </Link>
                </div>
                <div className="feature-copy">
                  <p className="release-type">{release.type}</p>
                  <h3>{release.title}</h3>
                  <time className="release-date" dateTime={release.release_date}>
                    {new Date(release.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                  <p>{release.description}</p>
                  <div className="home-feature-actions">
                    <Link to={`/releases/${release.slug}`} className="text-link">View release</Link>
                    <button type="button" className="text-link home-release-play" onClick={() => playRelease(release)}>
                      Play selection
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
