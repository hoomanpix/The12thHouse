export type PlayerStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: AudioQueueItem[];
  activeTrackId: string | null;
  status: PlayerStatus;
  error: string | null;
  isReady: boolean;
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
