import type { AudioQueueItem } from './types';
import type { Release, Track } from '../../types';
import { isPlayableReleaseTrack } from '../../lib/releaseSemantics';

export function isPlayableTrack(
  track: Pick<Track, 'published' | 'audio_url'>,
  release?: Pick<Release, 'status' | 'published' | 'release_date'>,
) {
  return release ? isPlayableReleaseTrack(release, track) : track.published === true && Boolean(track.audio_url);
}

export function eligibleAudioQueue(items: AudioQueueItem[]) {
  return items.filter((item) => Boolean(item.audioUrl));
}

export function nextQueueItem(queue: AudioQueueItem[], activeTrackId: string | null) {
  const currentIndex = queue.findIndex((item) => item.trackId === activeTrackId);
  if (currentIndex < 0) return queue[0] ?? null;
  return queue[currentIndex + 1] ?? null;
}

export function previousQueueItem(queue: AudioQueueItem[], activeTrackId: string | null) {
  const currentIndex = queue.findIndex((item) => item.trackId === activeTrackId);
  if (currentIndex <= 0) return queue[queue.length - 1] ?? null;
  return queue[currentIndex - 1] ?? null;
}
