import { describe, expect, it } from 'vitest';
import { visualMediaKind, visualMediaMime } from './media';

describe('visual media format handling', () => {
  it('keeps image formats on the image rendering path', () => {
    expect(visualMediaKind('https://cdn.test/artwork.GIF?token=1')).toBe('image');
    expect(visualMediaKind('https://cdn.test/artwork.webp')).toBe('image');
  });

  it('selects MIME types from original video extensions', () => {
    expect(visualMediaMime('visual.webm')).toBe('video/webm');
    expect(visualMediaMime('visual.mov')).toBe('video/quicktime');
    expect(visualMediaMime('visual.ogv')).toBe('video/ogg');
    expect(visualMediaMime('visual.mp4')).toBe('video/mp4');
  });
});
