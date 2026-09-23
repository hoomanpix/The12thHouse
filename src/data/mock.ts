import rapShodeBaziCover from '../assets/rap-shode-bazi.jpeg';
import shodeMahKamelCover from '../assets/shode-mah-kamel.jpeg';

export const mockArtist = {
  id: 'artist-1',
  name: 'The12thHouse',
  slug: 'new-wave',
  biography:
    'The12thHouse is a creative platform for music, image, motion, and code — a shared space where distinct disciplines meet without losing their individual voices.',
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
    title: 'Rap Shode Bazi',
    slug: 'rap-shode-bazi',
    type: 'single',
    contentType: 'music',
    release_date: '2025-03-04',
    description: 'Rap Shode Bazi — a new single from The12thHouse.',
    artwork_url: rapShodeBaziCover,
    featured: false,
    published: true,
    tracks: [
      { id: 'track-4', title: 'Rap Shode Bazi', audio_url: null, duration: 197, order: 1, published: true },
    ],
    platform_links: [
      { id: 'link-4', platform: 'soundcloud', label: 'SoundCloud', url: 'https://soundcloud.com', order: 1 },
      { id: 'link-5', platform: 'youtube_music', label: 'YouTube Music', url: 'https://music.youtube.com', order: 2 },
    ],
  },
  {
    id: 'release-3',
    artist_id: 'artist-1',
    title: 'Shode Mah Kamel',
    slug: 'shode-mah-kamel',
    type: 'single',
    contentType: 'music',
    release_date: '2025-04-04',
    description: 'Shode Mah Kamel — a new single from The12thHouse.',
    artwork_url: shodeMahKamelCover,
    featured: false,
    published: true,
    tracks: [
      { id: 'track-5', title: 'Shode Mah Kamel', audio_url: null, duration: 197, order: 1, published: true },
    ],
    platform_links: [],
  },
];
