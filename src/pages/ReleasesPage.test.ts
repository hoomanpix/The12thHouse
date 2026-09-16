import { describe, expect, it } from 'vitest';
import { filterReleases } from './ReleasesPage';
import type { Release } from '../types';

const releases: Release[] = [
  { id: 'released', artist_id: 'a', title: 'Released', slug: 'released', type: 'single', status: 'released', release_date: '2025-01-01', description: '', artwork_url: null, featured: false, published: true, tracks: [], platform_links: [] },
  { id: 'future', artist_id: 'a', title: 'Future', slug: 'future', type: 'album', status: 'upcoming', release_date: '2027-01-01', description: '', artwork_url: null, featured: false, published: true, tracks: [], platform_links: [] },
];

describe('release filters', () => {
  it('keeps upcoming work in FUTURE and excludes it from type filters', () => {
    expect(filterReleases(releases, 'future').map((release) => release.id)).toEqual(['future']);
    expect(filterReleases(releases, 'album')).toEqual([]);
    expect(filterReleases(releases, 'all')).toHaveLength(2);
  });
});
