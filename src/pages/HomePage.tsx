import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { siteConfig } from '../config/site';
import type { Release } from '../types';
import { formatReleaseDate, isPublished, isUpcoming } from '../lib/releaseStatus';

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { artist: mockArtist, releases: mockReleases, homeCardIds, recordPlay } = useCatalog();
  const visibleReleases = mockReleases.filter(isPublished);
  const homeVisibleReleases = mockReleases.filter((release) => isPublished(release) || isUpcoming(release));
  // A featured flag can intentionally exist on a draft while the artist is preparing it.
  // Never let that unpublished flag blank the public Home: use the newest published release
  // until a published Featured release is available.
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? visibleReleases[0];
  const homeCards = homeCardIds
    .map((id) => homeVisibleReleases.find((release) => release.id === id))
    .filter((release): release is Release => Boolean(release));

  if (!featuredRelease && homeCards.length === 0) {
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
            {featuredRelease && <button type="button" className="button primary" onClick={() => playRelease(featuredRelease)}>
              Play latest
            </button>}
            <Link to={publicRoutes.releases} className="button secondary">
              Browse releases
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          {featuredRelease ? <img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} /> : <div className="hero-visual-placeholder" aria-label="Upcoming releases are being prepared" />}
        </div>
      </section>

      <section className="home-release-collection" aria-labelledby="home-releases-title">
        <div className="section-heading">
          <p className="eyebrow">Selected releases</p>
          <h2 id="home-releases-title">A small collection of work.</h2>
        </div>
        <div className="home-release-grid">
          {homeCards.map((release) => {
            return (
              <article key={release.id} className="feature-card home-feature-card">
                <div className="feature-artwork">
                  <Link to={`/releases/${release.slug}`} aria-label={`View ${release.title}`}>
                    <img src={release.artwork_url ?? ''} alt={release.title} />
                  </Link>
                </div>
                <div className="feature-copy">
                  <p className="release-type">{isUpcoming(release) ? 'Coming soon' : release.type}</p>
                  <h3>{release.title}</h3>
                  <time className="release-date" dateTime={release.release_date ?? undefined}>
                    {formatReleaseDate(release.release_date)}
                  </time>
                  <p>{release.description}</p>
                  <div className="home-feature-actions">
                    <Link to={`/releases/${release.slug}`} className="text-link">View release</Link>
                    {isPublished(release) && <button type="button" className="text-link home-release-play" onClick={() => playRelease(release)}>
                      Play selection
                    </button>}
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
