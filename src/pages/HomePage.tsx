import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { artist, releases, recordPlay } = useCatalog();
  const visibleReleases = releases.filter((release) => release.published);
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? visibleReleases[0];
  const latestRelease = visibleReleases[0];
  const playableTracks = (featuredRelease?.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url));

  if (!featuredRelease || !latestRelease) {
    return <div className="page-section"><p className="admin-empty">No releases are published yet.</p></div>;
  }

  const handlePlay = (release: typeof featuredRelease) => {
    const queue = (release.tracks ?? [])
      .filter((track) => track.published !== false && Boolean(track.audio_url))
      .map((track) => ({
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
    <div className="page-section home-page codex-home">
      <section className="hero-block codex-hero">
        <div className="hero-copy">
          <p className="eyebrow">Featured artist</p>
          <h1>{artist.name}</h1>
          <p className="lede">{artist.biography || 'A sonic space for dreamers, seekers, and those who find home in the in-between.'}</p>
          <div className="hero-actions">
            <button type="button" className="button primary" onClick={() => handlePlay(featuredRelease)} disabled={playableTracks.length === 0}>
              {playableTracks.length === 0 ? 'Listen soon' : 'Play latest'}
            </button>
            <Link to={publicRoutes.about} className="button secondary">Explore artists</Link>
          </div>
        </div>
        <div className="hero-visual music-cover">
          <img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} />
        </div>
      </section>

      <section className="release-overview codex-latest">
        <div className="section-heading split">
          <div><p className="eyebrow">Latest release</p><h2>{latestRelease.title}</h2></div>
          <Link to={publicRoutes.releases} className="text-link">View all →</Link>
        </div>
        <div className="codex-release-grid">
          {visibleReleases.slice(0, 2).map((release) => {
            const hasAudio = (release.tracks ?? []).some((track) => track.published !== false && Boolean(track.audio_url));
            return <article className="codex-release-card" key={release.id}>
              <Link className="release-cover music-cover" to={`/releases/${release.slug}`}><img src={release.artwork_url ?? ''} alt={release.title} /></Link>
              <div className="release-card-meta"><div><Link to={`/releases/${release.slug}`}><h3>{release.title}</h3></Link><span>{artist.name}</span><span>{release.type} · {release.release_date.slice(0, 4)}</span></div><button type="button" className="track-play" aria-label={`Play ${release.title}`} onClick={() => handlePlay(release)} disabled={!hasAudio}>▶</button></div>
            </article>;
          })}
        </div>
      </section>

      <section className="release-overview codex-featured">
        <article className="feature-card">
          <div className="feature-copy"><p className="eyebrow">Featured release</p><h2>{featuredRelease.title}</h2><p>{featuredRelease.description}</p><div className="detail-actions"><button type="button" className="button primary" onClick={() => handlePlay(featuredRelease)} disabled={playableTracks.length === 0}>{playableTracks.length === 0 ? 'Listen soon' : 'Play selection'}</button><Link to={`/releases/${featuredRelease.slug}`} className="text-link">View details →</Link></div></div>
          <div className="feature-artwork music-cover"><img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} /></div>
        </article>
      </section>

      <section className="codex-archive-link"><Link to={publicRoutes.releases} className="text-link">Explore the full archive →</Link></section>
    </div>
  );
}
