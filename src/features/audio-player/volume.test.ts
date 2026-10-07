import { describe, expect, it } from 'vitest';
import { applyMediaVolume, clampVolume, DEFAULT_VOLUME, supportsMediaElementVolume } from './volume';

describe('audio volume synchronization', () => {
  it('clamps invalid volume values to the media element range', () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(DEFAULT_VOLUME);
  });

  it('detects writable HTMLMediaElement volume without relying on user-agent strings', () => {
    const writable = { volume: 1, muted: false };
    const readOnly = { get volume() { return 1; }, set volume(_value: number) {}, muted: false };
    expect(supportsMediaElementVolume(writable)).toBe(true);
    expect(writable.volume).toBe(1);
    expect(supportsMediaElementVolume(readOnly)).toBe(false);
  });

  it('applies supported web-player volume and independent mute state', () => {
    const media = { volume: 1, muted: false };
    expect(applyMediaVolume(media, 0.5, false)).toBe(0.5);
    expect(media).toEqual({ volume: 0.5, muted: false });
    applyMediaVolume(media, 0.75, true);
    expect(media).toEqual({ volume: 0.75, muted: true });
  });

  it('returns the actual media volume when a previously detected volume write fails', () => {
    const media = { get volume() { return 0.65; }, set volume(_value: number) { throw new Error('volume write blocked'); }, muted: false };
    expect(applyMediaVolume(media, 0.25, false, true)).toBe(0.65);
  });

  it('does not pretend to set volume on unsupported browsers but still mutes the media element', () => {
    const media = { volume: 1, muted: false };
    expect(applyMediaVolume(media, 0.25, true, false)).toBe(1);
    expect(media).toEqual({ volume: 1, muted: true });
  });
});
