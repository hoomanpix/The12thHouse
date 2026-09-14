export type ReleaseType = 'single' | 'album';

export type PlatformType =
  | 'spotify'
  | 'apple_music'
  | 'youtube_music'
  | 'soundcloud'
  | 'bandcamp'
  | 'custom';

export interface PlatformLink {
  id: string;
  platform: PlatformType;
  label: string;
  url: string;
  order: number;
}

export interface Track {
  id: string;
  release_id: string;
  title: string;
  duration: number;
  audio_url: string | null;
  published?: boolean;
  play_count?: number;
  order: number;
  created_at?: string;
}

export interface Release {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  type: ReleaseType;
  release_date: string;
  description: string;
  artwork_url: string | null;
  featured: boolean;
  published: boolean;
  created_at?: string;
  updated_at?: string;
  tracks?: Track[];
  platform_links?: PlatformLink[];
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  biography: string;
  image_url: string | null;
  location: string | null;
  email: string | null;
  website: string | null;
  created_at?: string;
  updated_at?: string;
  platform_links?: PlatformLink[];
}

export interface AudioQueueItem {
  id: string;
  releaseId: string;
  trackId: string;
  title: string;
  audioUrl: string | null;
  artworkUrl: string | null;
  releaseTitle: string;
  duration: number;
}
