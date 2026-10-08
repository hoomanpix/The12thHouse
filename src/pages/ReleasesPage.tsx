import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import type { ReleaseContentType, ReleaseType, VisualType } from '../types';
import { formatReleaseDate, isPublished, isUpcoming, shouldShowReleaseDate } from '../lib/releaseStatus';
import { releaseTypeLabel } from '../lib/releaseSemantics';

export function ReleasesPage() {
  const [category, setCategory] = useState<ReleaseContentType>('music');
  const [musicFilter, setMusicFilter] = useState<'all' | ReleaseType>('all');
  const [visualFilter, setVisualFilter] = useState<'all' | VisualType>('all');
  const { releases: allReleases, isReady, catalogError } = useCatalog();
  const releases = allReleases.filter((release) => isPublished(release) || isUpcoming(release));
  const filteredReleases = useMemo(() => category === 'music'
    ? releases.filter((release) => release.contentType === 'music' && (musicFilter === 'all' || release.type === musicFilter))
    : releases.filter((release) => release.contentType === 'visual' && (visualFilter === 'all' || release.visualType === visualFilter)), [category, musicFilter, releases, visualFilter]);
  if (!isReady) return <div className="page-section"><p className="release-empty" role="status">Loading catalog…</p></div>;
  if (catalogError) return <div className="page-section"><p className="release-empty" role="alert">Catalog unavailable. Please try again later.</p></div>;
  const categoryTabs: Array<{ value: ReleaseContentType; label: string }> = [{ value: 'music', label: 'Music' }, { value: 'visual', label: 'Visual' }];
  return <div className="page-section releases-page">
    <div className="section-heading split releases-heading"><div className="releases-heading__copy"><div className="releases-heading__topline"><h1 className="eyebrow">Releases</h1><div className="release-categories" role="tablist" aria-label="Release categories">{categoryTabs.map((tab) => <button key={tab.value} type="button" role="tab" aria-selected={category === tab.value} className={category === tab.value ? 'release-category is-active' : 'release-category'} onClick={() => setCategory(tab.value)}>{tab.label}</button>)}</div></div></div>
      <div className="release-filter-groups" aria-label={`${category} release filters`}><div className="filter-group"><div className="filter-bar">{(category === 'music' ? ['all', 'single', 'album'] : ['all', 'cover', 'animation']).map((option) => <button key={option} type="button" className={(category === 'music' ? musicFilter : visualFilter) === option ? 'filter-pill active' : 'filter-pill'} onClick={() => category === 'music' ? setMusicFilter(option as 'all' | ReleaseType) : setVisualFilter(option as 'all' | VisualType)} aria-pressed={(category === 'music' ? musicFilter : visualFilter) === option}>{option === 'all' ? 'All' : option === 'cover' ? 'Art Work' : option}</button>)}</div></div></div>
    </div>
    {filteredReleases.length > 0 ? <div className="release-grid">{filteredReleases.map((release) => <article key={release.id} className="release-card"><Link to={`/releases/${release.slug}`} className={release.artwork_url ? 'release-cover' : 'release-cover release-cover--placeholder'} aria-label={`View ${release.title}`}>{release.artwork_url ? <img src={release.artwork_url} alt={release.title} /> : <><span>{release.contentType}</span><strong>{release.title}</strong></>}</Link><div className="release-card-meta"><div><p className="eyebrow subtle release-type">{isUpcoming(release) ? 'Coming soon' : releaseTypeLabel(release)}</p><h3>{release.title}</h3></div><time dateTime={release.release_date ?? undefined}>{formatReleaseDate(shouldShowReleaseDate(release) ? release.release_date : null)}</time></div>{isUpcoming(release) && <p className="release-upcoming-note">Available on release day.</p>}</article>)}</div> : <p className="release-empty" role="status">{category === 'visual' ? 'No visual projects yet.' : 'No releases match this filter.'}</p>}
  </div>;
}
