import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import type { ReleaseContentType, ReleaseType, VisualType } from '../types';

export function ReleasesPage() {
  const [category, setCategory] = useState<ReleaseContentType>('music');
  const [musicFilter, setMusicFilter] = useState<'all' | ReleaseType>('all');
  const [visualFilter, setVisualFilter] = useState<'all' | VisualType>('all');
  const { releases: allReleases } = useCatalog();
  const releases = allReleases.filter((release) => release.published);

  const filteredReleases = useMemo(() => {
    if (category === 'music') {
      return releases.filter((release) =>
        release.contentType === 'music' && (musicFilter === 'all' || release.type === musicFilter),
      );
    }

    return releases.filter((release) =>
      release.contentType === 'visual' && (visualFilter === 'all' || release.visualType === visualFilter),
    );
  }, [category, musicFilter, releases, visualFilter]);

  const categoryTabs: Array<{ value: ReleaseContentType; label: string }> = [
    { value: 'music', label: 'Music' },
    { value: 'visual', label: 'Visual' },
  ];

  return (
    <div className="page-section releases-page">
      <div className="section-heading split releases-heading">
        <div className="releases-heading__copy">
          <div className="releases-heading__topline">
            <p className="eyebrow">Releases</p>
            <div className="release-categories" role="tablist" aria-label="Release categories">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={category === tab.value}
                  className={category === tab.value ? 'release-category is-active' : 'release-category'}
                  onClick={() => setCategory(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <h1>Selected work</h1>
        </div>

        <div className="release-filter-groups" aria-label={`${category} release filters`}>
          {category === 'music' ? (
            <div className="filter-group">
              <div className="filter-bar">
                {(['all', 'single', 'album'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={musicFilter === option ? 'filter-pill active' : 'filter-pill'}
                    onClick={() => setMusicFilter(option)}
                    aria-pressed={musicFilter === option}
                  >
                    {option === 'all' ? 'All' : option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="filter-group">
              <div className="filter-bar">
                {(['all', 'cover', 'animation'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={visualFilter === option ? 'filter-pill active' : 'filter-pill'}
                    onClick={() => setVisualFilter(option)}
                    aria-pressed={visualFilter === option}
                  >
                    {option === 'all' ? 'All' : option}
                  </button>
                ))}
              </div>
            </div>
          )}
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
        <p className="release-empty" role="status">
          {category === 'visual' ? 'No visual projects yet.' : 'No releases match this filter.'}
        </p>
      )}
    </div>
  );
}
