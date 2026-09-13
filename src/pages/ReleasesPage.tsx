import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockReleases } from '../data/mock';
import type { ReleaseType } from '../types';

export function ReleasesPage() {
  const [filter, setFilter] = useState<'all' | ReleaseType>('all');

  const filteredReleases = useMemo(() => {
    if (filter === 'all') return mockReleases;
    return mockReleases.filter((release) => release.type === filter);
  }, [filter]);

  return (
    <div className="page-section">
      <div className="section-heading split">
        <div>
          <p className="eyebrow">Releases</p>
          <h1>Selected work</h1>
        </div>

        <div className="filter-bar" aria-label="Release filters">
          {(['all', 'single', 'album'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={filter === option ? 'filter-pill active' : 'filter-pill'}
              onClick={() => setFilter(option)}
            >
              {option === 'all' ? 'All' : option}
            </button>
          ))}
        </div>
      </div>

      <div className="release-grid">
        {filteredReleases.map((release) => (
          <article key={release.id} className="release-card">
            <Link to={`/releases/${release.slug}`} className="release-cover">
              <img src={release.artwork_url ?? ''} alt={release.title} />
            </Link>
            <div className="release-card-meta">
              <div>
                <p className="eyebrow subtle">{release.type}</p>
                <h3>{release.title}</h3>
              </div>
              <span>{new Date(release.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
