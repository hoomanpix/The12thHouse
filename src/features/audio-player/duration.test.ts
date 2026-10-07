import { describe, expect, it } from 'vitest';
import { formatMediaDuration } from './duration';

describe('formatMediaDuration', () => {
  it('formats valid metadata in mm:ss and hh:mm:ss without losing hours', () => {
    expect(formatMediaDuration(0)).toBe('0:00');
    expect(formatMediaDuration(222)).toBe('3:42');
    expect(formatMediaDuration(3917)).toBe('1:05:17');
  });

  it('does not display unknown or invalid media durations', () => {
    expect(formatMediaDuration(Number.NaN)).toBeNull();
    expect(formatMediaDuration(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatMediaDuration(-1)).toBeNull();
  });
});
