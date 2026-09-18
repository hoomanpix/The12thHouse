import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';

const disciplines = [
  { number: '01', label: 'Music', description: 'Sound, rhythm, atmosphere, and the spaces between them.' },
  { number: '02', label: 'Visuals', description: 'Image, motion, and visual worlds shaped around each work.' },
  { number: '03', label: 'Digital', description: 'Interactive architecture for encountering the collective’s work.' },
];

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { releases, recordPlay } = useCatalog();
  const visibleReleases = releases.filter((release) => release.published);
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? visibleReleases[0];
  const latestRelease = visibleReleases[0];
  const playableTracks = (featuredRelease?.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url));

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
    <div className="page-section home-page editorial-home">
      <section className="home-hero" aria-labelledby="home-heading">
        <div className="home-hero__copy">
          <p className="section-number">01 / The house</p>
          <p className="eyebrow">Multidisciplinary creative collective</p>
          <h1 id="home-heading">Sound.<br />Image.<br />Digital.</h1>
          <p className="lede">The12thHouse connects sound, visual work, and digital experiences in one evolving creative space.</p>
          <div className="hero-actions">
            <Link to={publicRoutes.releases} className="button primary">Explore releases <span aria-hidden="true">→</span></Link>
            <button type="button" className="text-link text-link--button" onClick={() => handlePlay(featuredRelease)} disabled={playableTracks.length === 0}>
              {playableTracks.length === 0 ? 'Audio coming soon' : 'Play latest'}
            </button>
          </div>
        </div>
        <div className="home-hero__artwork music-cover">
          <img src={featuredRelease.artwork_url ?? ''} alt={featuredRelease.title} />
          <span className="artwork-caption">{featuredRelease.title} / {featuredRelease.release_date.slice(0, 4)}</span>
        </div>
      </section>

      <section className="discipline-section" aria-labelledby="discipline-heading">
        <div className="section-intro"><p className="section-number">02 / Three rooms</p><h2 id="discipline-heading">One house,<br />three practices.</h2></div>
        <div className="discipline-list">
          {disciplines.map((discipline) => <article className="discipline-entry" key={discipline.number}><span className="discipline-entry__number">{discipline.number}</span><div><h3>{discipline.label}</h3><p>{discipline.description}</p></div><span className="discipline-entry__arrow" aria-hidden="true">↗</span></article>)}
        </div>
      </section>

      <section className="latest-section" aria-labelledby="latest-heading">
        <div className="section-heading split"><div><p className="section-number">03 / Archive</p><h2 id="latest-heading">Latest releases</h2></div><Link to={publicRoutes.releases} className="text-link">View archive →</Link></div>
        <div className="home-release-list">
          {visibleReleases.slice(0, 3).map((release, index) => <Link className="home-release-row" to={`/releases/${release.slug}`} key={release.id}><span className="home-release-row__index">{String(index + 1).padStart(2, '0')}</span><span className="home-release-row__image music-cover"><img src={release.artwork_url ?? ''} alt="" /></span><span className="home-release-row__title">{release.title}</span><span className="home-release-row__meta">{release.status === 'upcoming' ? 'Future' : release.type} / {release.release_date.slice(0, 4)}</span><span aria-hidden="true">→</span></Link>)}
        </div>
      </section>

      <section className="featured-release-section"><div className="featured-release__artwork music-cover"><img src={latestRelease.artwork_url ?? ''} alt={latestRelease.title} /></div><div className="featured-release__copy"><p className="section-number">04 / Featured release</p><p className="eyebrow">{latestRelease.type} / {latestRelease.release_date.slice(0, 4)}</p><h2>{latestRelease.title}</h2><p>{latestRelease.description}</p><Link to={`/releases/${latestRelease.slug}`} className="text-link">View release →</Link></div></section>
    </div>
  );
}
