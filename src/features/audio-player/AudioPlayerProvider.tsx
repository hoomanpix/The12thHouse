import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AudioQueueItem, PlayerState } from './types';

interface AudioPlayerContextValue {
  state: PlayerState;
  playTrack: (item: AudioQueueItem) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
  setQueue: (items: AudioQueueItem[]) => void;
  clearQueue: () => void;
}

const initialState: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  queue: [],
  activeTrackId: null,
  status: 'idle',
  error: null,
  isReady: false,
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playNextRef = useRef<() => void>(() => undefined);
  const [state, setState] = useState<PlayerState>(initialState);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.volume = state.volume;
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        setState((current) => ({ ...current, currentTime: audio.currentTime }));
      });

      audio.addEventListener('loadedmetadata', () => {
        setState((current) => ({
          ...current,
          duration: Number.isFinite(audio.duration) ? audio.duration : current.duration,
          status: 'ready',
          isReady: true,
        }));
      });

      audio.addEventListener('play', () => {
        setState((current) => ({ ...current, isPlaying: true, status: 'playing' }));
      });

      audio.addEventListener('pause', () => {
        setState((current) => ({ ...current, isPlaying: false, status: 'paused' }));
      });

      audio.addEventListener('ended', () => {
        setState((current) => ({
          ...current,
          isPlaying: false,
          currentTime: 0,
          status: 'ready',
        }));
        playNextRef.current();
      });

      audio.addEventListener('error', () => {
        setState((current) => ({
          ...current,
          isPlaying: false,
          status: 'error',
          error: 'This track could not be loaded.',
        }));
      });
    }

    return audioRef.current;
  }, [state.volume]);

  const setQueue = useCallback((queue: AudioQueueItem[]) => {
    setState((current) => ({ ...current, queue, activeTrackId: queue[0]?.trackId ?? null }));
  }, []);

  const clearQueue = useCallback(() => {
    const audio = ensureAudio();
    audio.pause();
    audio.src = '';
    setState({ ...initialState, volume: state.volume });
  }, [ensureAudio, state.volume]);

  const playTrack = useCallback(
    (item: AudioQueueItem) => {
      const audio = ensureAudio();

      if (!item.audioUrl) {
        setState((current) => ({
          ...current,
          status: 'error',
          error: 'No audio file is available for this track yet.',
          activeTrackId: item.trackId,
        }));
        return;
      }

      if (audio.src !== item.audioUrl) {
        audio.src = item.audioUrl;
        audio.load();
      }

      setState((current) => ({
        ...current,
        activeTrackId: item.trackId,
        status: 'loading',
        error: null,
      }));

      audio.play().catch(() => {
        setState((current) => ({
          ...current,
          status: 'error',
          error: 'Playback was blocked. Please try again.',
          isPlaying: false,
        }));
      });
    },
    [ensureAudio],
  );

  const togglePlay = useCallback(() => {
    const audio = ensureAudio();
    if (!audio.src && state.queue.length === 0) {
      return;
    }

    if (state.isPlaying) {
      audio.pause();
      return;
    }

    if (state.activeTrackId) {
      const currentTrack = state.queue.find((item) => item.trackId === state.activeTrackId);
      if (currentTrack) {
        playTrack(currentTrack);
        return;
      }
    }

    if (state.queue[0]) {
      playTrack(state.queue[0]);
    }
  }, [ensureAudio, playTrack, state.activeTrackId, state.isPlaying, state.queue]);

  const seek = useCallback(
    (value: number) => {
      const audio = ensureAudio();
      if (!Number.isFinite(audio.duration) || audio.duration === 0) {
        return;
      }
      audio.currentTime = (value / 100) * audio.duration;
      setState((current) => ({ ...current, currentTime: audio.currentTime }));
    },
    [ensureAudio],
  );

  const setVolume = useCallback(
    (value: number) => {
      const audio = ensureAudio();
      const nextVolume = Math.min(1, Math.max(0, value));
      audio.volume = nextVolume;
      setState((current) => ({ ...current, volume: nextVolume }));
    },
    [ensureAudio],
  );

  const playNext = useCallback(() => {
    if (state.queue.length === 0) return;

    const currentIndex = state.queue.findIndex((item) => item.trackId === state.activeTrackId);
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
    const nextTrack = state.queue[nextIndex] ?? state.queue[0];

    if (nextTrack) playTrack(nextTrack);
  }, [playTrack, state.activeTrackId, state.queue]);

  const playPrevious = useCallback(() => {
    if (state.queue.length === 0) return;

    const currentIndex = state.queue.findIndex((item) => item.trackId === state.activeTrackId);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : state.queue.length - 1;
    const previousTrack = state.queue[previousIndex];

    if (previousTrack) playTrack(previousTrack);
  }, [playTrack, state.activeTrackId, state.queue]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    const audio = ensureAudio();
    audio.volume = state.volume;
  }, [ensureAudio, state.volume]);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      state,
      playTrack,
      togglePlay,
      playNext,
      playPrevious,
      seek,
      setVolume,
      setQueue,
      clearQueue,
    }),
    [clearQueue, playNext, playPrevious, playTrack, seek, setQueue, setVolume, state, togglePlay],
  );

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);

  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }

  return context;
}
