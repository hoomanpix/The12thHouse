import { describe, expect, it } from 'vitest';
import {
  advancePlaybackProgress,
  createPlaybackProgress,
  QUALIFIED_VIEW_SECONDS,
} from './qualifiedViewTracking';

describe('qualified track view progress', () => {
  it('counts a view only after 30 seconds of advancing media time', () => {
    let progress = createPlaybackProgress(0);
    const beforeThreshold = advancePlaybackProgress(progress, 29, true);
    progress = beforeThreshold.progress;
    expect(beforeThreshold.qualified).toBe(false);
    expect(progress.listenedSeconds).toBe(29);

    const atThreshold = advancePlaybackProgress(progress, QUALIFIED_VIEW_SECONDS, true);
    expect(atThreshold.qualified).toBe(true);
    expect(atThreshold.progress.counted).toBe(true);
  });

  it('does not count paused time or forward/backward seek jumps as listening', () => {
    let progress = createPlaybackProgress(0);
    progress = advancePlaybackProgress(progress, 12, true).progress;
    progress = advancePlaybackProgress(progress, 12, false).progress;
    progress = advancePlaybackProgress(progress, 80, true).progress;
    expect(progress.listenedSeconds).toBe(12);
    expect(progress.counted).toBe(false);

    progress = advancePlaybackProgress(progress, 87, true).progress;
    expect(progress.listenedSeconds).toBe(19);
    progress = advancePlaybackProgress(progress, 20, true).progress;
    expect(progress.listenedSeconds).toBe(19);
  });

  it('emits the threshold only once within a playback session', () => {
    const counted = { listenedSeconds: 29, lastMediaTime: 29, counted: false };
    const first = advancePlaybackProgress(counted, 30, true);
    const later = advancePlaybackProgress(first.progress, 45, true);
    expect(first.qualified).toBe(true);
    expect(later.qualified).toBe(false);
    expect(later.progress.counted).toBe(true);
  });
});
