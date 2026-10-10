import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { publicRoutes } from '../config/routes';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { isPlayableTrack } from '../features/audio-player/queue';
import { siteConfig } from '../config/site';
import { ReleaseArtwork } from '../components/ReleaseArtwork';
import type { Release } from '../types';
import { formatReleaseDate, isPublished, isUpcoming, shouldShowReleaseDate } from '../lib/releaseStatus';
import { releaseTypeLabel } from '../lib/releaseSemantics';

export function HomePage() {
  const { setQueue, playTrack } = useAudioPlayer();
  const { artist, releases, homeCardIds, homeHeroId, isReady, catalogError } = useCatalog();
  if (!isReady) return <div className="page-section"><p className="release-empty" role="status">Loading catalog…</p></div>;
  if (catalogError) return <div className="page-section"><p className="release-empty" role="alert">Catalog unavailable. Please try again later.</p></div>;
  const visibleReleases = releases.filter(isPublished);
  const latestRelease = visibleReleases.reduce<Release | null>((latest, release) => {
    if (!latest) return release;
    return (release.release_date ?? '') > (latest.release_date ?? '') ? release : latest;
  }, null);
  const homeVisibleReleases = releases.filter((release) => isPublished(release) || isUpcoming(release));
  const featuredRelease = visibleReleases.find((release) => release.featured) ?? null;
  const heroRelease = visibleReleases.find((release) => release.id === homeHeroId && Boolean(release.artwork_url?.trim())) ?? null;
  const homeCards = homeCardIds.map((id) => homeVisibleReleases.find((release) => release.id === id)).filter((release): release is Release => Boolean(release));
  const playRelease = (release: Release) => {
    if (release.contentType !== 'music' || !isPublished(release)) return;
    const queue = (release.tracks ?? []).filter((track) => isPlayableTrack(track, release)).map((track) => ({
      id: `${release.id}-${track.id}`, releaseId: release.id, trackId: track.id, title: track.title, audioUrl: track.audio_url,
      audioReference: track.audio_reference ?? null, artworkUrl: release.artwork_url, releaseTitle: release.title,
    }));
    setQueue(queue);
    if (queue[0]) playTrack(queue[0]);
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
        <div className={`hero-visual-group home-hero-card${heroRelease?.contentType === 'music' ? ' home-hero-card--music' : heroRelease?.visualType === 'animation' ? ' home-hero-card--animation' : heroRelease ? ' home-hero-card--visual-cover' : ' home-hero-card--placeholder'}`}>
          <div className="hero-visual">
            {heroRelease?.artwork_url?.trim()
              ? <ReleaseArtwork src={heroRelease.artwork_url} title={heroRelease.title} kindLabel={heroRelease.contentType === 'music' ? 'Music' : `Visual ${heroRelease.visualType ?? 'cover'}`} alt={heroRelease.title} imageClassName="home-hero-card__artwork" placeholderClassName="hero-visual-placeholder" loading="eager" />
              : <div className="hero-visual-placeholder" aria-label="No Hero image selected" />}
          </div>
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
          {homeCards.map((release) => <article key={release.id} className={`feature-card home-feature-card ${release.contentType === 'music' ? 'home-feature-card--music' : release.visualType === 'animation' ? 'home-feature-card--animation' : 'home-feature-card--visual-cover'}`}>
            <div className="feature-artwork"><Link to={`/releases/${release.slug}`} aria-label={`View ${release.title}`}>
              <ReleaseArtwork src={release.artwork_url} title={release.title} kindLabel={release.contentType === 'music' ? 'Music' : `Visual ${release.visualType ?? 'cover'}`} alt="" imageClassName="home-feature-card__artwork" placeholderClassName="home-feature-placeholder-artwork" />
            </Link></div>
            <div className="feature-copy"><p className="release-type">{isUpcoming(release) ? 'Coming soon' : releaseTypeLabel(release)}</p><h3>{release.title}</h3>
              <time className="release-date" dateTime={release.release_date ?? undefined}>{formatReleaseDate(shouldShowReleaseDate(release) ? release.release_date : null)}</time><p>{release.description}</p>
              <div className="home-feature-actions"><Link to={`/releases/${release.slug}`} className="text-link">{release.type === 'album' ? 'View the Tracks' : 'View the Track'}</Link>{release.contentType === 'music' && <button type="button" className="text-link home-release-play" onClick={() => playRelease(release)} disabled={!isPublished(release)} aria-label={isPublished(release) ? `Play ${release.title} now` : `${release.title} is not available to play yet`}>Play Now</button>}</div>
            </div>
          </article>)}
        </div>
      </section>
    </div>
  );
}
