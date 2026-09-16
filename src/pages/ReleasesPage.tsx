import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import type { Release, ReleaseType } from '../types';

type ReleaseFilter = 'all' | ReleaseType | 'future';

export function filterReleases(releases: Release[], filter: ReleaseFilter) {
  return releases.filter((release) => {
    if (filter === 'all') return true;
    if (filter === 'future') return release.status === 'upcoming';
    return release.type === filter && release.status !== 'upcoming';
  });
}

export function ReleasesPage() {
  const [filter, setFilter] = useState<ReleaseFilter>('all');
  const { releases } = useCatalog();
  const visibleReleases = releases.filter((release) => release.published);
  const filteredReleases = useMemo(() => filterReleases(visibleReleases, filter), [filter, visibleReleases]);
  const options: Array<{ value: ReleaseFilter; label: string }> = [
    { value: 'all', label: 'ALL' }, { value: 'single', label: 'SINGLE' }, { value: 'album', label: 'ALBUM' }, { value: 'future', label: 'FUTURE' },
  ];

  return (
    <div className="page-section archive-page">
      <header className="archive-header"><div><p className="eyebrow">The12thHouse / archive</p><h1>Selected work</h1></div><p className="archive-header__note">Releases, studies, and songs from the house.</p></header>
      <div className="archive-toolbar"><span className="eyebrow">Filter</span><div className="filter-bar" aria-label="Release filters">{options.map((option) => <button key={option.value} type="button" className={filter === option.value ? 'filter-pill active' : 'filter-pill'} onClick={() => setFilter(option.value)}>{option.label}</button>)}</div><span className="archive-count">{String(filteredReleases.length).padStart(2, '0')} works</span></div>
      <div className="archive-list">{filteredReleases.map((release, index) => <Link className={`archive-item ${release.status === 'upcoming' ? 'archive-item--future' : ''}`} to={`/releases/${release.slug}`} key={release.id}><span className="archive-item__number">{String(index + 1).padStart(2, '0')}</span><span className="archive-item__image music-cover"><img src={release.artwork_url ?? ''} alt="" /></span><span className="archive-item__title">{release.title}</span><span className="archive-item__type">{release.status === 'upcoming' ? 'upcoming' : release.type}</span><span className="archive-item__date">{release.release_date.slice(0, 4)}</span></Link>)}</div>
    </div>
  );
}
