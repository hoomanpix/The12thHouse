import { describe, expect, it } from 'vitest';
import { normalizeRelease } from './normalizeRelease';

describe('normalizeRelease', () => {
  it('normalizes Visual content without exposing music-only album type, tracks, or platform links', () => {
    const visual = normalizeRelease({
      id: 'visual-1', title: 'Existing visual', artist_id: 'artist-1', slug: 'existing-visual',
      content_type: 'visual', release_type: 'album', visual_type: 'cover', status: 'published', published: true,
      cover_url: 'https://cdn.example/visual.jpg', visual_url: 'https://cdn.example/old-animation.mp4',
      tracks: [{ id: 'stale-track', album_id: 'visual-1', title: 'Not a visual track', audio_url: '/track.mp3', track_order: 1 }],
      platform_links: [{ id: 'stale-link', platform: 'spotify', url: 'https://example.com', link_order: 1 }],
    });

    expect(visual.contentType).toBe('visual');
    expect(visual.visualType).toBe('cover');
    expect(visual.artwork_url).toBe('https://cdn.example/visual.jpg');
    expect(visual).not.toHaveProperty('type');
    expect(visual).not.toHaveProperty('tracks');
    expect(visual).not.toHaveProperty('platform_links');
    expect(visual).not.toHaveProperty('visual_url');
  });

  it('keeps music fields for music records and does not invent a zero duration when metadata is absent', () => {
    const music = normalizeRelease({
      id: 'music-1', title: 'Existing music', artist_id: 'artist-1', slug: 'existing-music',
      content_type: 'music', release_type: 'album', status: 'published', published: true,
      tracks: [{ id: 'track-1', album_id: 'music-1', title: 'Track', audio_url: '/track.mp3', track_order: 1, duration: 0 }],
      platform_links: [],
    });
    expect(music.contentType).toBe('music');
    expect(music.type).toBe('album');
    expect(music.tracks?.[0].duration).toBeUndefined();
  });
});
