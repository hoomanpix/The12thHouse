import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import type { ReleaseContentType, ReleaseType } from '../types';

export function ReleasesPage() {
  const [contentFilter, setContentFilter] = useState<'all' | ReleaseContentType>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ReleaseType>('all');
  const { releases: allReleases } = useCatalog();
  const releases = allReleases.filter((release) => release.published);

  const filteredReleases = useMemo(
    () => releases.filter((release) =>
      (contentFilter === 'all' || release.contentType === contentFilter)
      && (typeFilter === 'all' || release.type === typeFilter),
    ),
    [contentFilter, releases, typeFilter],
  );

  return (
    <div className="page-section releases-page">
      <div className="section-heading split">
        <div>
          <p className="eyebrow">Releases</p>
          <h1>Selected work</h1>
        </div>

        <div className="release-filter-groups" aria-label="Release filters">
          <div className="filter-group" aria-label="Content type filter">
            <span className="filter-group__label">Content</span>
            <div className="filter-bar">
              {(['all', 'music', 'visual'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={contentFilter === option ? 'filter-pill active' : 'filter-pill'}
                  onClick={() => setContentFilter(option)}
                  aria-pressed={contentFilter === option}
                >
                  {option === 'all' ? 'All' : option}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group" aria-label="Release format filter">
            <span className="filter-group__label">Format</span>
            <div className="filter-bar">
              {(['all', 'single', 'album'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={typeFilter === option ? 'filter-pill active' : 'filter-pill'}
                  onClick={() => setTypeFilter(option)}
                  aria-pressed={typeFilter === option}
                >
                  {option === 'all' ? 'All' : option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filteredReleases.length > 0 ? (
        <div className="release-grid">
          {filteredReleases.map((release) => (
            <article key={release.id} className="release-card">
              <Link to={`/releases/${release.slug}`} className="release-cover">
                <img src={release.artwork_url ?? ''} alt={release.title} />
              </Link>
              <div className="release-card-meta">
                <div>
                  <p className="eyebrow subtle release-type">{release.type}</p>
                  <h3>{release.title}</h3>
                </div>
                <time dateTime={release.release_date}>
                  {new Date(release.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="release-empty" role="status">{contentFilter === 'visual' ? 'No visual projects yet.' : 'No releases match these filters.'}</p>
      )}
    </div>
  );
}
