export const mockArtist = {
  id: 'artist-1',
  name: 'A 071 Studio',
  slug: 'a-071-studio',
  biography:
    'A 071 Studio is a creative practice for music, image, motion, and code — a shared space where distinct disciplines meet without losing their individual voices.',
  image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
  location: 'Brooklyn, NY',
  email: null,
  website: null,
};

export const mockReleases = [
  {
    id: 'release-1',
    artist_id: 'artist-1',
    title: 'Glass Horizon',
    slug: 'glass-horizon',
    type: 'album',
    contentType: 'music',
    release_date: '2025-01-18',
    description:
      'A quiet, luminous record about the architecture of moving on—slow-burn synths, spacious drums, and melodies that arrive like memory.',
    artwork_url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
    featured: true,
    published: true,
    tracks: [
      { id: 'track-1', title: 'Night Signal', audio_url: null, duration: 210, order: 1, published: true },
      { id: 'track-2', title: 'Afterglow Static', audio_url: null, duration: 238, order: 2, published: false },
      { id: 'track-3', title: 'Slow Orbit', audio_url: null, duration: 255, order: 3, published: true },
    ],
    platform_links: [
      { id: 'link-1', platform: 'spotify', label: 'Spotify', url: 'https://open.spotify.com', order: 1 },
      { id: 'link-2', platform: 'apple_music', label: 'Apple Music', url: 'https://music.apple.com', order: 2 },
      { id: 'link-3', platform: 'bandcamp', label: 'Bandcamp', url: 'https://bandcamp.com', order: 3 },
    ],
  },
  {
    id: 'release-2',
    artist_id: 'artist-1',
    title: 'Low Tide Memory',
    slug: 'low-tide-memory',
    type: 'single',
    contentType: 'music',
    release_date: '2025-03-04',
    description:
      'The first chapter of a new season: low-slung percussion and a vocal take that never pushes too hard.',
    artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
    featured: false,
    published: true,
    tracks: [
      { id: 'track-4', title: 'Low Tide Memory', audio_url: null, duration: 197, order: 1, published: true },
    ],
    platform_links: [
      { id: 'link-4', platform: 'soundcloud', label: 'SoundCloud', url: 'https://soundcloud.com', order: 1 },
      { id: 'link-5', platform: 'youtube_music', label: 'YouTube Music', url: 'https://music.youtube.com', order: 2 },
    ],
  },
];
