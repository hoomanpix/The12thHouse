import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { isPlayableTrack } from '../features/audio-player/queue';
import { siteConfig } from '../config/site';
import type { Release } from '../types';
import { formatReleaseDate, isPublished, isUpcoming, shouldShowReleaseDate } from '../lib/releaseStatus';
import { releaseTypeLabel } from '../lib/releaseSemantics';

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { artist, releases, homeCardIds, homeHeroId, recordPlay, isReady, catalogError } = useCatalog();
  if (!isReady) return <div className="page-section"><p className="release-empty" role="status">Loading catalog…</p></div>;
  if (catalogError) return <div className="page-section"><p className="release-empty" role="alert">Catalog unavailable. Please try again later.</p></div>;
  const visibleReleases = releases.filter(isPublished);
  const latestRelease = visibleReleases.reduce<Release | null>((latest, release) => {
    if (!latest) return release;
    return (release.release_date ?? '') > (latest.release_date ?? '') ? release : latest;
  }, null);
  const homeVisibleReleases = releases.filter((release) => isPublished(release) || isUpcoming(release));
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? null;
  const heroRelease = visibleReleases.find((release) => release.id === homeHeroId && Boolean(release.artwork_url)) ?? null;
  const homeCards = homeCardIds.map((id) => homeVisibleReleases.find((release) => release.id === id)).filter((release): release is Release => Boolean(release));
  const playRelease = (release: Release) => {
    if (release.contentType !== 'music' || !isPublished(release)) return;
    const queue = (release.tracks ?? []).filter((track) => isPlayableTrack(track, release)).map((track) => ({
      id: `${release.id}-${track.id}`, releaseId: release.id, trackId: track.id, title: track.title, audioUrl: track.audio_url,
      audioReference: track.audio_reference ?? null, artworkUrl: release.artwork_url, releaseTitle: release.title,
    }));
    setQueue(queue);
    if (queue[0]) { recordPlay(release.id, queue[0].trackId); playTrack(queue[0]); }
  };
  if (!featuredRelease && !heroRelease && homeCards.length === 0) return <div className="page-section"><p className="release-empty">No public releases are available yet.</p></div>;
  return (
    <div className="page-section home-page">
      <section className={`hero-block${heroRelease ? ' hero-block--has-image' : ''}`}>
        <div className="hero-copy">
          <p className="eyebrow">{siteConfig.heroEyebrow}</p><h1>{artist.name}</h1>
          <p className="lede">Start Digging into House Productions ,here you can listen to songs ,watch the visuals and ,analyze the works for further tasks.</p>
          <div className="hero-actions">
            {featuredRelease?.contentType === 'music' && <button type="button" className="button primary" onClick={() => playRelease(featuredRelease)}>Play latest</button>}
            {featuredRelease?.contentType === 'visual' && <Link to={`/releases/${featuredRelease.slug}`} className="button primary">View featured visual</Link>}
            <Link to={publicRoutes.releases} className="button secondary">Browse releases</Link>
          </div>
        </div>
        <div className="hero-visual-group">
          <div className="hero-visual">{heroRelease?.artwork_url ? <img src={heroRelease.artwork_url} alt={heroRelease.title} /> : <div className="hero-visual-placeholder" aria-label="No Hero image selected" />}</div>
          {latestRelease && (
            <Link to={`/releases/${latestRelease.slug}`} className="home-latest-release-link">
              <span className="home-latest-release-link__text">Listen to the Latest Release</span>
              <span className="home-latest-release-link__arrow" aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </section>
      <section className="home-release-collection" aria-labelledby="home-releases-title">
        <div className="section-heading"><p className="eyebrow">Selected releases</p><h2 id="home-releases-title">A small collection of work.</h2></div>
        <div className="home-release-grid">
          {homeCards.map((release) => <article key={release.id} className="feature-card home-feature-card">
            <div className="feature-artwork"><Link to={`/releases/${release.slug}`} aria-label={`View ${release.title}`}>
              {release.artwork_url ? <img src={release.artwork_url} alt={release.title} /> : <div className="home-feature-placeholder-artwork" aria-label={`${release.title} has no artwork yet`} />}
            </Link></div>
            <div className="feature-copy"><p className="release-type">{isUpcoming(release) ? 'Coming soon' : releaseTypeLabel(release)}</p><h3>{release.title}</h3>
              <time className="release-date" dateTime={release.release_date ?? undefined}>{formatReleaseDate(shouldShowReleaseDate(release) ? release.release_date : null)}</time><p>{release.description}</p>
              <div className="home-feature-actions"><Link to={`/releases/${release.slug}`} className="text-link">View the Track(s)</Link>{release.contentType === 'music' && isPublished(release) && <button type="button" className="text-link home-release-play" onClick={() => playRelease(release)}>Play Now</button>}</div>
            </div>
          </article>)}
        </div>
      </section>
    </div>
  );
}
