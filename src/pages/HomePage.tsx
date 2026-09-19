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

  const playableTracks = featuredRelease.status === 'upcoming'
    ? []
    : (featuredRelease.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url));
  const handlePlay = (release: typeof featuredRelease) => {
    const queue = (release.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url)).map((track) => ({
      id: `${release.id}-${track.id}`, releaseId: release.id, trackId: track.id, title: track.title,
      audioUrl: track.audio_url, artworkUrl: release.artwork_url, releaseTitle: release.title, duration: track.duration,
    }));
    setQueue(queue);
    if (queue[0]) { recordPlay(release.id, queue[0].trackId); playTrack(queue[0]); }
  };

  return (
    <div className="page-section home-page reference-home">
      <section className="reference-hero" aria-labelledby="hero-title">
        <div className="reference-hero__copy">
          <p className="eyebrow">Featured artist</p>
           <h1 id="hero-title">The12thHouse</h1>
          <p className="reference-hero__lede">A sonic space for dreamers, seekers, and those who find home in the in-between. Exploring ambient, electronic and experimental sounds from around the world.</p>
          <div className="reference-actions">
            <button type="button" className="button primary" onClick={() => handlePlay(featuredRelease)} disabled={playableTracks.length === 0}>{playableTracks.length === 0 ? 'Listen soon' : 'Listen now'}</button>
            <Link to={publicRoutes.about} className="button secondary">Explore artists</Link>
          </div>
        </div>
        <div className="reference-hero__image music-cover"><img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} width="900" height="700" fetchPriority="high" decoding="async" /></div>
      </section>

      <section className="reference-releases" aria-labelledby="latest-title">
        <div className="reference-section-heading"><h2 id="latest-title">Latest release</h2><Link to={publicRoutes.releases} className="text-link">View all <span aria-hidden="true">→</span></Link></div>
        <div className="reference-release-grid">
          {visibleReleases.slice(0, 2).map((release) => (
             <article className="reference-release-card" key={release.id}>
              <Link to={`/releases/${release.slug}`} className="reference-release-card__image music-cover"><img src={release.artwork_url ?? ''} alt={release.title} width="360" height="360" loading="lazy" decoding="async" /></Link>
               <div className="reference-release-card__copy"><Link to={`/releases/${release.slug}`}><h3>{release.title}</h3></Link><p>The12thHouse</p><span>{release.type} <b aria-hidden="true">·</b> {release.status === 'upcoming' ? 'coming soon' : release.release_date.slice(0, 4)}</span><button type="button" className="round-play" onClick={() => handlePlay(release)} aria-label={`Play ${release.title}`} disabled={(release.tracks ?? []).every((track) => !track.audio_url)}>▶</button></div>
            </article>
          ))}
        </div>
      </section>

      <section className="reference-featured" aria-labelledby="featured-release-title">
        <div className="reference-featured__image music-cover"><img src={featuredRelease.artwork_url ?? ''} alt="" width="900" height="700" loading="lazy" decoding="async" /></div>
         <div className="reference-featured__copy"><p className="eyebrow">Featured release</p><h2 id="featured-release-title">{featuredRelease.title}</h2><p>The12thHouse</p><p className="reference-featured__description">{featuredRelease.description}</p><div className="reference-actions"><button type="button" className="button primary" onClick={() => handlePlay(featuredRelease)} disabled={playableTracks.length === 0}>{playableTracks.length === 0 ? 'Listen soon' : 'Listen now'}</button><Link to={`/releases/${featuredRelease.slug}`} className="text-link">View details <span aria-hidden="true">→</span></Link></div></div>
      </section>

      <section className="reference-archive-link"><Link to={publicRoutes.releases}>Explore the full archive <span aria-hidden="true">→</span></Link></section>
    </div>
  );
}
