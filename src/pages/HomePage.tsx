import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { artist: mockArtist, releases: mockReleases, recordPlay } = useCatalog();
  const visibleReleases = mockReleases.filter((release) => release.published);
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? visibleReleases[0];
  const latestRelease = visibleReleases[0];

  if (!featuredRelease || !latestRelease) {
    return <div className="page-section"><p className="admin-empty">No releases are published yet.</p></div>;
  }

  const handlePlayFeatured = () => {
    const firstTrack = featuredRelease?.tracks?.[0];
    if (!featuredRelease) return;
    const queue = (featuredRelease.tracks ?? []).map((track) => ({
      id: `${featuredRelease.id}-${track.id}`,
      releaseId: featuredRelease.id,
      trackId: track.id,
      title: track.title,
      audioUrl: track.audio_url,
      artworkUrl: featuredRelease.artwork_url,
      releaseTitle: featuredRelease.title,
      duration: track.duration,
    }));

    setQueue(queue);
    if (firstTrack) {
      recordPlay(featuredRelease.id, firstTrack.id);
      playTrack(queue[0]);
    }
  };

  return (
    <div className="page-section home-page">
      <section className="hero-block">
        <div className="hero-copy">
          <p className="eyebrow">Independent electronic artist</p>
          <h1>{mockArtist.name}</h1>
          <p className="lede">
            Sculpted atmospheres, slow-burn rhythm, and intimate songs for the edge of the night.
          </p>
          <div className="hero-actions">
            <button type="button" className="button primary" onClick={handlePlayFeatured}>
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

      <section className="release-overview">
        <div className="section-heading">
          <p className="eyebrow">Latest release</p>
          <h2>{latestRelease.title}</h2>
        </div>
        <article className="feature-card">
          <div className="feature-artwork">
            <img src={latestRelease.artwork_url ?? ''} alt={latestRelease.title} />
          </div>
          <div className="feature-copy">
            <p className="release-type">{latestRelease.type}</p>
            <h3>{latestRelease.title}</h3>
            <time className="release-date" dateTime={latestRelease.release_date}>
              {new Date(latestRelease.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </time>
            <p>{latestRelease.description}</p>
            <Link to={`/releases/${latestRelease.slug}`} className="text-link">
              View release
            </Link>
          </div>
        </article>
      </section>

      <section className="release-overview">
        <div className="section-heading">
          <p className="eyebrow">Featured release</p>
          <h2>{featuredRelease.title}</h2>
        </div>
        <article className="feature-card muted">
          <div className="feature-copy">
            <p className="release-type">{featuredRelease.type}</p>
            <h3>{featuredRelease.title}</h3>
            <time className="release-date" dateTime={featuredRelease.release_date}>
              {new Date(featuredRelease.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </time>
            <p>{featuredRelease.description}</p>
            <button type="button" className="button secondary" onClick={handlePlayFeatured}>
              Play selection
            </button>
          </div>
          <div className="feature-artwork">
            <img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} />
          </div>
        </article>
      </section>
    </div>
  );
}
