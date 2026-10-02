import type { Release, ReleaseStatus } from '../types';

export type AdminReleaseStatus = 'DRAFT' | 'UPCOMING' | 'PUBLISHED';

export function normalizeReleaseStatus(value: unknown, published: boolean, releaseDate: string | null): ReleaseStatus {
  if (value === 'DRAFT' || value === 'draft') return 'draft';
  if (value === 'UPCOMING' || value === 'upcoming') return 'upcoming';
  if (value === 'PUBLISHED' || value === 'published') return 'published';
  if (published) return 'published';
  if (releaseDate && releaseDate > new Date().toISOString().slice(0, 10)) return 'upcoming';
  return 'draft';
}

export function statusOf(release: Release): AdminReleaseStatus {
  const status = release.status ?? normalizeReleaseStatus(undefined, release.published, release.release_date);
  return status.toUpperCase() as AdminReleaseStatus;
}

export function isUpcoming(release: Release) {
  return statusOf(release) === 'UPCOMING';
}

export function isPublished(release: Release) {
  return statusOf(release) === 'PUBLISHED';
}

export function shouldShowReleaseDate(release: Release) {
  return !isUpcoming(release) || release.show_release_date !== false;
}

export function formatReleaseDate(releaseDate: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!releaseDate) return 'RELEASE DATE TBA';
  return new Date(`${releaseDate}T00:00:00`).toLocaleDateString('en-US', options ?? { month: 'short', day: 'numeric', year: 'numeric' });
}
