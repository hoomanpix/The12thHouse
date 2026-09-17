import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { releases, recordPlay } = useCatalog();
  const visibleReleases = releases.filter((release) => release.published);
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? visibleReleases[0];

  if (!featuredRelease) return <div className="page-section"><p className="admin-empty">No releases are published yet.</p></div>;

  const playableTracks = (featuredRelease.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url));
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
      <section className="home-intro">
        <div className="home-intro__main">
          <p className="eyebrow">The12thHouse / independent collective</p>
          <div className="home-intro__title-row">
            <h1>Sound in<br />slow motion.</h1>
            <div className="home-intro__art music-cover">
              <img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} />
            </div>
          </div>
        </div>
        <p className="home-intro__note">Cinematic electronic music, intimate songs, and nocturnal spaces.</p>
      </section>
      <section className="home-feature" aria-labelledby="featured-title">
        <div className="home-feature__copy">
          <p className="eyebrow">New release / {featuredRelease.type}</p>
          <h2 id="featured-title">{featuredRelease.title}</h2>
          <p>{featuredRelease.description}</p>
          <div className="home-feature__actions">
            <button type="button" className="button primary" onClick={() => handlePlay(featuredRelease)} disabled={playableTracks.length === 0}>
              {playableTracks.length === 0 ? 'Audio coming soon' : 'Play release'}
            </button>
            <Link to={`/releases/${featuredRelease.slug}`} className="text-link">View release</Link>
          </div>
        </div>
      </section>
      <section className="home-catalog" aria-labelledby="catalog-title">
        <div className="home-catalog__heading">
          <p className="eyebrow">Selected releases</p>
          <h2 id="catalog-title">All work</h2>
          <Link to={publicRoutes.releases} className="text-link">Archive</Link>
        </div>
        <div className="home-release-list">
          {visibleReleases.map((release, index) => (
            <Link className="home-release-row" to={`/releases/${release.slug}`} key={release.id}>
              <span className="home-release-row__index">{String(index + 1).padStart(2, '0')}</span>
              <span className="home-release-row__title">{release.title}</span>
              <span className="home-release-row__type">{release.type}</span>
              <span className="home-release-row__year">{release.release_date.slice(0, 4)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
