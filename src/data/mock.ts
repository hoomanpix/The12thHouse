import type { Release } from '../types';

export const mockArtist = {
  id: 'artist-1',
  name: 'The12thHouse',
  slug: 'the12thhouse',
  biography: 'An independent collective working across sound, image, motion, and digital space.',
  image_url: null,
  location: null,
  email: null,
  website: null,
};

export const mockReleases: Release[] = [
  {
    id: 'release-1', artist_id: 'artist-1', title: 'Glass Horizon', slug: 'glass-horizon', type: 'album', status: 'released', release_date: '2025-01-18',
    description: 'A quiet, luminous record about the architecture of moving on—slow-burn synths, spacious drums, and melodies that arrive like memory.', artwork_url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80', featured: true, published: true,
    tracks: [
      { id: 'track-1', release_id: 'release-1', title: 'Night Signal', audio_url: null, duration: 210, order: 1, published: true },
      { id: 'track-2', release_id: 'release-1', title: 'Afterglow Static', audio_url: null, duration: 238, order: 2, published: false },
      { id: 'track-3', release_id: 'release-1', title: 'Slow Orbit', audio_url: null, duration: 255, order: 3, published: true },
    ],
    platform_links: [],
  },
  {
    id: 'release-2', artist_id: 'artist-1', title: 'Low Tide Memory', slug: 'low-tide-memory', type: 'single', status: 'released', release_date: '2025-03-04',
    description: 'The first chapter of a new season: low-slung percussion and a vocal take that never pushes too hard.', artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80', featured: false, published: true,
    tracks: [{ id: 'track-4', release_id: 'release-2', title: 'Low Tide Memory', audio_url: null, duration: 197, order: 1, published: true }], platform_links: [],
  },
];
