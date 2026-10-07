import { describe, expect, it } from 'vitest';
import { isPlayableReleaseTrack } from './releaseSemantics';

const publishedRelease = { status: 'published', published: true, release_date: null };

describe('release track playability', () => {
  it('requires a resolved HTTP(S) audio URL instead of a raw Storage key', () => {
    expect(isPlayableReleaseTrack(publishedRelease, {
      published: true,
      audio_url: 'https://cdn.example/track.mp3?token=signed',
    })).toBe(true);
    expect(isPlayableReleaseTrack(publishedRelease, {
      published: true,
      audio_url: 'release/track.mp3',
    })).toBe(false);
  });

  it('continues to hide unpublished or missing audio tracks', () => {
    expect(isPlayableReleaseTrack(publishedRelease, { published: false, audio_url: 'https://cdn.example/track.mp3' })).toBe(false);
    expect(isPlayableReleaseTrack(publishedRelease, { published: true, audio_url: null })).toBe(false);
  });
});
