import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import type { ReleaseType } from '../types';

export function ReleasesPage() {
  const [filter, setFilter] = useState<'all' | ReleaseType>('all');
  const { releases } = useCatalog();
  const visibleReleases = releases.filter((release) => release.published);
  const filteredReleases = useMemo(
    () => filter === 'all' ? visibleReleases : visibleReleases.filter((release) => release.type === filter),
    [filter, visibleReleases],
  );

  return (
    <div className="page-section archive-page">
      <header className="archive-header">
        <div><p className="eyebrow">The12thHouse / archive</p><h1>Selected work</h1></div>
        <p className="archive-header__note">Releases, studies, and songs from the house.</p>
      </header>
      <div className="archive-toolbar">
        <span className="eyebrow">Filter</span>
        <div className="filter-bar" aria-label="Release filters">
          {(['all', 'single', 'album'] as const).map((option) => <button key={option} type="button" className={filter === option ? 'filter-pill active' : 'filter-pill'} onClick={() => setFilter(option)}>{option}</button>)}
        </div>
        <span className="archive-count">{String(filteredReleases.length).padStart(2, '0')} works</span>
      </div>
      <div className="archive-list">
        {filteredReleases.map((release, index) => (
          <Link className="archive-item" to={`/releases/${release.slug}`} key={release.id}>
            <span className="archive-item__number">{String(index + 1).padStart(2, '0')}</span>
            <span className="archive-item__image music-cover"><img src={release.artwork_url ?? ''} alt="" /></span>
            <span className="archive-item__title">{release.title}</span>
            <span className="archive-item__type">{release.type}</span>
            <span className="archive-item__date">{release.release_date.slice(0, 4)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
