import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { releases, recordPlay } = useCatalog();
  const visibleReleases = releases.filter((release) => release.published);
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? visibleReleases[0];
  const latestRelease = visibleReleases[0];
  const playableTracks = (featuredRelease?.tracks ?? []).filter(
    (track) => track.published !== false && Boolean(track.audio_url),
  );

  if (!featuredRelease || !latestRelease) {
    return <div className="page-section"><p className="admin-empty">No releases are published yet.</p></div>;
  }

  const handlePlay = (release: typeof featuredRelease) => {
    const queue = (release.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url)).map((track) => ({
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
          <p className="eyebrow">Independent electronic artist</p>
          <h1>Independent electronic artist</h1>
          <p className="lede">
            Sculpted atmospheres, slow-burn rhythm, and intimate songs for the edge of the night.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="button primary"
              onClick={() => handlePlay(featuredRelease)}
              disabled={playableTracks.length === 0}
            >
              {playableTracks.length === 0 ? 'Audio coming soon' : 'Play latest'}
            </button>
            <Link to={publicRoutes.releases} className="button secondary">Browse releases</Link>
          </div>
        </div>

        <div className="hero-visual music-cover">
          <img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} />
        </div>
      </section>

      <section className="release-overview">
        <div className="section-heading">
          <p className="eyebrow">Latest release</p>
          <h2>{latestRelease.title}</h2>
        </div>
        <article className="feature-card new-release-section">
          <div className="feature-artwork music-cover">
            <img src={latestRelease.artwork_url ?? ''} alt={latestRelease.title} />
          </div>
          <div className="feature-copy">
            <p>{latestRelease.type}</p>
            <h3>{latestRelease.title}</h3>
            <p>{latestRelease.description}</p>
            <Link to={`/releases/${latestRelease.slug}`} className="text-link">View release</Link>
          </div>
        </article>
      </section>

      {featuredRelease.id !== latestRelease.id && (
        <section className="release-overview">
          <div className="section-heading">
            <p className="eyebrow">Featured release</p>
            <h2>{featuredRelease.title}</h2>
          </div>
          <article className="feature-card muted">
            <div className="feature-copy">
              <p>{featuredRelease.type}</p>
              <h3>{featuredRelease.title}</h3>
              <p>{featuredRelease.description}</p>
              <button type="button" className="button secondary" onClick={() => handlePlay(featuredRelease)} disabled={playableTracks.length === 0}>
                {playableTracks.length === 0 ? 'Audio coming soon' : 'Play selection'}
              </button>
            </div>
            <div className="feature-artwork music-cover"><img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} /></div>
          </article>
        </section>
      )}
    </div>
  );
}
