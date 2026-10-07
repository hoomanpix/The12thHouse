import type { Release, ReleaseStatus, Track } from '../types';
import { isPublished, statusOf } from './releaseStatus';

export function releaseTypeLabel(release: Pick<Release, 'contentType' | 'type' | 'visualType'>) {
  if (release.contentType === 'visual') {
    return release.visualType === 'animation' ? 'Animation' : 'Cover';
  }
  return release.type === 'album' ? 'Album' : 'Single';
}

export function isPublicRelease(release: Pick<Release, 'status' | 'published' | 'release_date'>) {
  const status = statusOf(release as Release);
  return status === 'PUBLISHED' || status === 'UPCOMING';
}

export function isPlayableAudioUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function isPlayableReleaseTrack(
  release: Pick<Release, 'status' | 'published' | 'release_date'>,
  track: Pick<Track, 'published' | 'audio_url'>,
) {
  return isPublished(release as Release) && track.published === true && isPlayableAudioUrl(track.audio_url);
}

export function publicReleaseStatus(release: Pick<Release, 'status' | 'published' | 'release_date'>): ReleaseStatus {
  return statusOf(release as Release).toLowerCase() as ReleaseStatus;
}
