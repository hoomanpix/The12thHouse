import { describe, expect, it } from 'vitest';
import { eligibleAudioQueue, isPlayableTrack, nextQueueItem } from './queue';
import type { AudioQueueItem } from './types';

const item = (trackId: string, audioUrl: string | null): AudioQueueItem => ({
  id: trackId,
  releaseId: 'release-1',
  trackId,
  title: trackId,
  audioUrl,
  artworkUrl: null,
  releaseTitle: 'Release',
  duration: 0,
});

describe('audio queue eligibility', () => {
  it('requires both explicit playability and an audio reference', () => {
    expect(isPlayableTrack({ published: true, audio_url: 'track.wav' })).toBe(true);
    expect(isPlayableTrack({ published: false, audio_url: 'track.wav' })).toBe(false);
    expect(isPlayableTrack({ published: true, audio_url: null })).toBe(false);
    expect(isPlayableTrack({ published: undefined, audio_url: 'track.wav' })).toBe(false);
  });

  it('does not put missing audio into the player queue', () => {
    expect(eligibleAudioQueue([item('one', 'one.wav'), item('two', null)])).toHaveLength(1);
  });

  it('stops at the end instead of wrapping auto-next to the first track', () => {
    const queue = [item('one', 'one.wav'), item('two', 'two.wav')];
    expect(nextQueueItem(queue, 'one')?.trackId).toBe('two');
    expect(nextQueueItem(queue, 'two')).toBeNull();
  });
});
