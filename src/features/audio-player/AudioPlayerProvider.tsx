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
import { eligibleAudioQueue, nextQueueItem, previousQueueItem } from './queue';

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
  const cleanupAudioRef = useRef<(() => void) | null>(null);
  const stateRef = useRef<PlayerState>(initialState);
  const playTrackRef = useRef<(item: AudioQueueItem) => void>(() => undefined);
  const [state, setState] = useState<PlayerState>(initialState);

  useEffect(() => { stateRef.current = state; }, [state]);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.volume = stateRef.current.volume;
      const onTimeUpdate = () => setState((current) => ({ ...current, currentTime: audio.currentTime }));
      const onLoadStart = () => setState((current) => ({ ...current, status: 'loading', isReady: false, error: null }));
      const onLoadedMetadata = () => setState((current) => ({ ...current, duration: Number.isFinite(audio.duration) ? audio.duration : 0, status: 'ready', isReady: true, error: null }));
      const onPlay = () => setState((current) => ({ ...current, isPlaying: true, status: 'playing', error: null }));
      const onPause = () => setState((current) => current.status === 'error' ? current : { ...current, isPlaying: false, status: 'paused' });
      const onEnded = () => {
        const current = stateRef.current;
        const next = nextQueueItem(current.queue, current.activeTrackId);
        if (next) { playTrackRef.current(next); return; }
        setState((latest) => ({ ...latest, isPlaying: false, currentTime: 0, status: 'ready' }));
      };
      const onError = () => setState((current) => ({ ...current, isPlaying: false, status: 'error', isReady: false, error: 'This track could not be loaded. The file may be missing or unsupported by this browser.' }));
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('loadstart', onLoadStart);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      cleanupAudioRef.current = () => {
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('loadstart', onLoadStart);
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  useEffect(() => () => { cleanupAudioRef.current?.(); audioRef.current?.pause(); }, []);

  const setQueue = useCallback((items: AudioQueueItem[]) => {
    const queue = eligibleAudioQueue(items);
    const current = stateRef.current;
    const activeTrackId = queue.some((item) => item.trackId === current.activeTrackId) ? current.activeTrackId : queue[0]?.trackId ?? null;
    if (!activeTrackId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setState((latest) => ({ ...latest, queue, activeTrackId, ...(activeTrackId ? {} : { isPlaying: false, currentTime: 0, duration: 0, status: 'idle' as const }) }));
  }, []);

  const clearQueue = useCallback(() => {
    const audio = ensureAudio();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setState({ ...initialState, volume: stateRef.current.volume });
  }, [ensureAudio]);

  const playTrack = useCallback((item: AudioQueueItem) => {
    const audio = ensureAudio();
    if (!item.audioUrl) {
      setState((current) => ({ ...current, isPlaying: false, status: 'error', error: 'No audio file is available for this track yet.', activeTrackId: item.trackId }));
      return;
    }
    if (audio.src !== item.audioUrl) { audio.src = item.audioUrl; audio.load(); }
    setState((current) => ({ ...current, activeTrackId: item.trackId, status: 'loading', isReady: false, error: null, currentTime: 0 }));
    void audio.play().catch((error: unknown) => setState((current) => ({ ...current, status: 'error', error: error instanceof Error ? error.message : 'Playback was blocked. Please try again.', isPlaying: false })));
  }, [ensureAudio]);
  playTrackRef.current = playTrack;

  const togglePlay = useCallback(() => {
    const audio = ensureAudio();
    const current = stateRef.current;
    if (current.isPlaying) { audio.pause(); return; }
    const active = current.queue.find((item) => item.trackId === current.activeTrackId) ?? current.queue[0];
    if (active) playTrackRef.current(active);
  }, [ensureAudio]);

  const seek = useCallback((value: number) => {
    const audio = ensureAudio();
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (Math.min(100, Math.max(0, value)) / 100) * audio.duration;
    setState((current) => ({ ...current, currentTime: audio.currentTime }));
  }, [ensureAudio]);

  const setVolume = useCallback((value: number) => {
    const nextVolume = Math.min(1, Math.max(0, value));
    ensureAudio().volume = nextVolume;
    setState((current) => ({ ...current, volume: nextVolume }));
  }, [ensureAudio]);

  const playNext = useCallback(() => {
    const current = stateRef.current;
    const next = nextQueueItem(current.queue, current.activeTrackId);
    if (next) { playTrackRef.current(next); return; }
    ensureAudio().pause();
    setState((latest) => ({ ...latest, isPlaying: false, currentTime: 0, status: 'ready' }));
  }, [ensureAudio]);

  const playPrevious = useCallback(() => {
    const current = stateRef.current;
    const previous = previousQueueItem(current.queue, current.activeTrackId);
    if (previous) playTrackRef.current(previous);
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = state.volume; }, [state.volume]);

  const value = useMemo<AudioPlayerContextValue>(() => ({ state, playTrack, togglePlay, playNext, playPrevious, seek, setVolume, setQueue, clearQueue }), [clearQueue, playNext, playPrevious, playTrack, seek, setQueue, setVolume, state, togglePlay]);
  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return context;
}
