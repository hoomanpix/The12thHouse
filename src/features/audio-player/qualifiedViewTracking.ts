export const QUALIFIED_VIEW_SECONDS = 30;

export interface PlaybackProgress {
  listenedSeconds: number;
  lastMediaTime: number | null;
  counted: boolean;
}

export function createPlaybackProgress(mediaTime: number): PlaybackProgress {
  return {
    listenedSeconds: 0,
    lastMediaTime: Number.isFinite(mediaTime) && mediaTime >= 0 ? mediaTime : null,
    counted: false,
  };
}

/**
 * Add only forward media-time progress while audio is actively playing.
 * `lastMediaTime` is reset on pause and seek, so neither paused wall time nor
 * a seek jump is mistaken for listening time. The caller owns one progress
 * object per playback session and marks the resulting view as counted once.
 */
export function advancePlaybackProgress(
  progress: PlaybackProgress,
  mediaTime: number,
  isPlaying: boolean,
  thresholdSeconds = QUALIFIED_VIEW_SECONDS,
): { progress: PlaybackProgress; qualified: boolean } {
  if (!Number.isFinite(mediaTime) || mediaTime < 0) {
    return { progress: { ...progress, lastMediaTime: null }, qualified: false };
  }

  if (!isPlaying || progress.lastMediaTime === null) {
    return {
      progress: { ...progress, lastMediaTime: isPlaying ? mediaTime : null },
      qualified: false,
    };
  }

  const elapsed = Math.max(0, mediaTime - progress.lastMediaTime);
  const listenedSeconds = progress.listenedSeconds + elapsed;
  const qualified = !progress.counted && listenedSeconds >= thresholdSeconds;

  return {
    progress: {
      ...progress,
      listenedSeconds,
      lastMediaTime: mediaTime,
      counted: progress.counted || qualified,
    },
    qualified,
  };
}
