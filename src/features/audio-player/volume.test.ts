import { describe, expect, it } from 'vitest';
import { applyMediaVolume, clampVolume, DEFAULT_VOLUME } from './volume';

describe('audio volume synchronization', () => {
  it('clamps invalid volume values to the media element range', () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(DEFAULT_VOLUME);
  });

  it('applies both volume and mute state to the actual media element', () => {
    const media = { volume: 0, muted: false };
    expect(applyMediaVolume(media, 0.5, false)).toBe(0.5);
    expect(media).toEqual({ volume: 0.5, muted: false });
    applyMediaVolume(media, 0.75, true);
    expect(media).toEqual({ volume: 0.75, muted: true });
  });
});
