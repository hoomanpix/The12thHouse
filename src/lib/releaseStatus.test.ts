import { describe, expect, it } from 'vitest';
import { formatReleaseDate, isUpcoming, shouldShowReleaseDate } from './releaseStatus';
import type { Release } from '../types';

const upcoming = (releaseDate: string | null, show_release_date = true): Release => ({
  id: 'release-1',
  artist_id: 'artist-1',
  title: 'Upcoming',
  slug: 'upcoming',
  type: 'single',
  contentType: 'music',
  release_date: releaseDate,
  status: 'upcoming',
  show_release_date,
  description: '',
  artwork_url: null,
  featured: false,
  published: false,
});

describe('release status and dates', () => {
  it('supports upcoming releases without inventing a date', () => {
    const release = upcoming(null);
    expect(isUpcoming(release)).toBe(true);
    expect(formatReleaseDate(null)).toBe('RELEASE DATE TBA');
  });

  it('hides an upcoming date only when the saved visibility flag is off', () => {
    expect(shouldShowReleaseDate(upcoming('2026-10-20', true))).toBe(true);
    expect(shouldShowReleaseDate(upcoming('2026-10-20', false))).toBe(false);
  });
});
