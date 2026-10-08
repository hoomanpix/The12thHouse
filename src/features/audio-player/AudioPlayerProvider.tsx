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
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { eligibleAudioQueue, nextQueueItem, previousQueueItem } from './queue';
import {
  applyGainVolume,
  applyMediaVolume,
  clampVolume,
  createAudioVolumeGraph,
  DEFAULT_VOLUME,
  disconnectAudioVolumeGraph,
  getAudioContextConstructor,
  supportsMediaElementVolume,
  type AudioVolumeGraph,
} from './volume';

interface AudioPlayerContextValue {
  state: PlayerState;
  playTrack: (item: AudioQueueItem, autoplay?: boolean) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  setQueue: (items: AudioQueueItem[]) => void;
  clearQueue: () => void;
}

type ActiveAudioSource = {
  audio: HTMLAudioElement;
  generation: number;
  trackId: string;
  audioUrl: string;
  audioReference: string | null;
};

type PlayTrackOrigin = 'selection' | 'refresh';

const initialState: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: DEFAULT_VOLUME,
  isMuted: false,
  volumeSupported: false,
  volumeSupportKnown: false,
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
  const playTrackRef = useRef<(item: AudioQueueItem, autoplay?: boolean, origin?: PlayTrackOrigin) => void>(() => undefined);
  const refreshAudioRef = useRef<(source: ActiveAudioSource) => Promise<void>>(async () => undefined);
  const refreshAttemptRef = useRef<{ reference: string; audioUrl: string } | null>(null);
  const refreshInFlightRef = useRef<{ reference: string; audioUrl: string; generation: number } | null>(null);
  const refreshRequestRef = useRef(0);
  const playbackRequestRef = useRef(0);
  const sourceGenerationRef = useRef(0);
  const activeSourceRef = useRef<ActiveAudioSource | null>(null);
  const playbackIntentRef = useRef(false);
  const pendingAutoplayRef = useRef(false);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const mutedRef = useRef(false);
  const volumeSupportedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioVolumeGraphRef = useRef<AudioVolumeGraph | null>(null);
  const [state, setState] = useState<PlayerState>(initialState);

  const commit = useCallback((update: (current: PlayerState) => PlayerState) => {
    const next = update(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const supported = getAudioContextConstructor() !== null
      || supportsMediaElementVolume(document.createElement('audio'));
    volumeSupportedRef.current = supported;
    commit((current) => ({
      ...current,
      volumeSupported: supported,
      volumeSupportKnown: true,
    }));
  }, [commit]);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
      let volumeGraph: AudioVolumeGraph | null = null;
      const AudioContextConstructor = getAudioContextConstructor();
      if (AudioContextConstructor) {
        try {
          const context = audioContextRef.current ?? new AudioContextConstructor();
          audioContextRef.current = context;
          volumeGraph = createAudioVolumeGraph(audio, context);
          if (volumeGraph) audio.crossOrigin = 'anonymous';
        } catch { /* Fall back to native volume if Web Audio setup is unavailable. */ }
      }
      let supported = false;
      if (volumeGraph) {
        audioVolumeGraphRef.current = volumeGraph;
        audio.muted = mutedRef.current;
        applyGainVolume(volumeGraph, volumeRef.current, mutedRef.current);
        supported = true;
      } else {
        const detectedSupport = supportsMediaElementVolume(audio);
        const appliedVolume = applyMediaVolume(audio, volumeRef.current, mutedRef.current, detectedSupport);
        supported = detectedSupport && Math.abs(appliedVolume - volumeRef.current) < 0.001;
        if (supported) volumeRef.current = appliedVolume;
      }
      volumeSupportedRef.current = supported;
      audioRef.current = audio;
      commit((current) => ({
        ...current,
        volume: volumeRef.current,
        volumeSupported: supported,
        volumeSupportKnown: true,
      }));

      const onTimeUpdate = () => {
        const duration = audio.duration;
        commit((current) => ({
          ...current,
          currentTime: audio.currentTime,
          ...(Number.isFinite(duration) && duration > 0 ? { duration } : {}),
        }));
      };
      const onLoadStart = () => commit((current) => ({ ...current, status: 'loading', isReady: false, error: null }));
      const onLoadedMetadata = () => {
        const duration = Number.isFinite(audio.duration) && audio.duration >= 0 ? audio.duration : 0;
        commit((current) => ({ ...current, duration, status: 'ready', isReady: true, error: null }));
      };
      const onDurationChange = () => {
        const duration = audio.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        commit((current) => ({ ...current, duration }));
      };
      const onPlay = () => {
        if (!playbackIntentRef.current) {
          audio.pause();
          return;
        }
        pendingAutoplayRef.current = false;
        commit((current) => ({ ...current, isPlaying: true, status: 'playing', error: null }));
      };
      const onPause = () => {
        if (pendingAutoplayRef.current && playbackIntentRef.current) return;
        commit((current) => current.status === 'error'
          ? current
          : { ...current, isPlaying: false, status: current.isReady ? 'paused' : current.status });
      };
      const onEnded = () => {
        const current = stateRef.current;
        const next = nextQueueItem(current.queue, current.activeTrackId);
        if (next) {
          playTrackRef.current(next, true);
          return;
        }
        playbackIntentRef.current = false;
        pendingAutoplayRef.current = false;
        commit((latest) => ({ ...latest, isPlaying: false, currentTime: 0, status: 'ready' }));
      };
      const onError = () => {
        const source = activeSourceRef.current;
        if (!audio.error || audioRef.current !== audio || source?.audio !== audio || !(audio.src || audio.currentSrc)) return;
        void refreshAudioRef.current(source);
      };
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('loadstart', onLoadStart);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('durationchange', onDurationChange);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      cleanupAudioRef.current = () => {
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('loadstart', onLoadStart);
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('durationchange', onDurationChange);
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };
    }
    return audioRef.current;
  }, [commit]);

  useEffect(() => () => {
    playbackIntentRef.current = false;
    pendingAutoplayRef.current = false;
    activeSourceRef.current = null;
    cleanupAudioRef.current?.();
    audioRef.current?.pause();
    if (audioVolumeGraphRef.current) {
      disconnectAudioVolumeGraph(audioVolumeGraphRef.current);
      audioVolumeGraphRef.current = null;
    }
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }, []);

  const setQueue = useCallback((items: AudioQueueItem[]) => {
    const queue = eligibleAudioQueue(items);
    const current = stateRef.current;
    const activeTrackId = queue.some((item) => item.trackId === current.activeTrackId)
      ? current.activeTrackId
      : queue[0]?.trackId ?? null;
    if (!activeTrackId) {
      playbackIntentRef.current = false;
      pendingAutoplayRef.current = false;
      playbackRequestRef.current += 1;
      refreshRequestRef.current += 1;
      refreshAttemptRef.current = null;
      refreshInFlightRef.current = null;
      activeSourceRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    }
    commit((latest) => ({
      ...latest,
      queue,
      activeTrackId,
      ...(activeTrackId ? {} : { isPlaying: false, currentTime: 0, duration: 0, status: 'idle' as const, isReady: false }),
    }));
  }, [commit]);

  const clearQueue = useCallback(() => {
    playbackIntentRef.current = false;
    pendingAutoplayRef.current = false;
    playbackRequestRef.current += 1;
    refreshRequestRef.current += 1;
    refreshAttemptRef.current = null;
    refreshInFlightRef.current = null;
    activeSourceRef.current = null;
    const audio = ensureAudio();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    const current = stateRef.current;
    commit(() => ({
      ...initialState,
      volume: current.volume,
      isMuted: current.isMuted,
      volumeSupported: current.volumeSupported,
      volumeSupportKnown: current.volumeSupportKnown,
    }));
  }, [commit, ensureAudio]);

  const playTrack = useCallback((item: AudioQueueItem, autoplay = true, origin: PlayTrackOrigin = 'selection') => {
    let audio = ensureAudio();
    const previousSource = activeSourceRef.current;
    const requestId = ++playbackRequestRef.current;
    refreshRequestRef.current += 1;
    playbackIntentRef.current = autoplay;
    pendingAutoplayRef.current = autoplay;
    if (origin !== 'refresh') {
      refreshAttemptRef.current = null;
      refreshInFlightRef.current = null;
    }

    if (!item.audioUrl) {
      playbackIntentRef.current = false;
      pendingAutoplayRef.current = false;
      activeSourceRef.current = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      commit((current) => ({
        ...current,
        activeTrackId: item.trackId,
        isPlaying: false,
        isReady: false,
        status: 'error',
        error: 'No audio file is available for this track yet.',
      }));
      return;
    }

    commit((current) => ({
      ...current,
      activeTrackId: item.trackId,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      status: 'loading',
      isReady: false,
      error: null,
    }));

    const sourceChanged = origin === 'refresh'
      || Boolean(audio.error)
      || !previousSource
      || previousSource.trackId !== item.trackId
      || previousSource.audioUrl !== item.audioUrl;
    if (sourceChanged && (previousSource !== null || audio.src || audio.currentSrc)) {
      cleanupAudioRef.current?.();
      cleanupAudioRef.current = null;
      if (audioVolumeGraphRef.current?.audio === audio) {
        disconnectAudioVolumeGraph(audioVolumeGraphRef.current);
        audioVolumeGraphRef.current = null;
      }
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
      activeSourceRef.current = null;
      audio = ensureAudio();
    }

    audio.pause();
    const generation = ++sourceGenerationRef.current;
    activeSourceRef.current = {
      audio,
      generation,
      trackId: item.trackId,
      audioUrl: item.audioUrl,
      audioReference: item.audioReference ?? null,
    };
    if (audio.src !== item.audioUrl) {
      audio.src = item.audioUrl;
      audio.load();
    } else {
      try { audio.currentTime = 0; } catch { /* Metadata may not be ready yet. */ }
    }

    if (autoplay) {
      const context = audioContextRef.current;
      if (context && context.state !== 'running') {
        void context.resume().catch(() => {
          if (requestId !== playbackRequestRef.current || !playbackIntentRef.current) return;
          playbackIntentRef.current = false;
          pendingAutoplayRef.current = false;
          audio.pause();
          commit((current) => ({ ...current, status: 'error', error: 'Audio output is suspended by the browser. Tap Play to resume.' }));
        });
      }
      void audio.play().catch((error: unknown) => {
        if (requestId !== playbackRequestRef.current || !playbackIntentRef.current) return;
        playbackIntentRef.current = false;
        pendingAutoplayRef.current = false;
        commit((current) => ({
          ...current,
          status: 'error',
          error: error instanceof Error ? error.message : 'Playback was blocked. Please try again.',
          isPlaying: false,
        }));
      });
    }
  }, [commit, ensureAudio]);
  playTrackRef.current = playTrack;

  const refreshAudioUrl = useCallback(async (failedSource: ActiveAudioSource) => {
    const current = stateRef.current;
    const source = activeSourceRef.current;
    if (!source
      || source.generation !== failedSource.generation
      || source.audio !== failedSource.audio
      || audioRef.current !== failedSource.audio
      || current.activeTrackId !== failedSource.trackId) return;

    const active = current.queue.find((item) => item.trackId === failedSource.trackId);
    if (!active
      || active.audioUrl !== failedSource.audioUrl
      || (active.audioReference ?? null) !== failedSource.audioReference) return;
    const reference = active.audioReference;
    const previousAttempt = refreshAttemptRef.current;
    const alreadyAttempted = Boolean(reference
      && previousAttempt?.reference === reference
      && previousAttempt?.audioUrl === failedSource.audioUrl);
    const pendingRefresh = refreshInFlightRef.current;
    const sameRefreshIsInFlight = Boolean(reference
      && pendingRefresh?.reference === reference
      && pendingRefresh?.audioUrl === failedSource.audioUrl
      && pendingRefresh?.generation === failedSource.generation);
    if (sameRefreshIsInFlight) return;
    if (!isSupabaseConfigured || !reference || alreadyAttempted) {
      playbackIntentRef.current = false;
      pendingAutoplayRef.current = false;
      commit((latest) => ({
        ...latest,
        isPlaying: false,
        status: 'error',
        isReady: false,
        error: active.audioReference
          ? 'This audio file could not be decoded by this browser.'
          : 'The audio URL expired and no original Storage reference is available.',
      }));
      return;
    }

    const requestId = ++refreshRequestRef.current;
    const trackId = active.trackId;
    refreshAttemptRef.current = { reference, audioUrl: failedSource.audioUrl };
    refreshInFlightRef.current = { reference, audioUrl: failedSource.audioUrl, generation: failedSource.generation };
    let data: { signedUrl: string } | null = null;
    let error: { message: string } | null = null;
    try {
      const result = await supabase.storage.from('audio').createSignedUrl(reference, 3600);
      data = result.data;
      error = result.error;
    } catch (requestError) {
      error = {
        message: requestError instanceof Error ? requestError.message : 'Unable to refresh the audio URL.',
      };
    }
    const latest = stateRef.current;
    const latestSource = activeSourceRef.current;
    const latestActive = latest.queue.find((item) => item.trackId === trackId);
    if (requestId !== refreshRequestRef.current
      || latest.activeTrackId !== trackId
      || !latestSource
      || latestSource.generation !== failedSource.generation
      || latestSource.audio !== failedSource.audio
      || audioRef.current !== failedSource.audio
      || !latestActive
      || latestActive.audioUrl !== failedSource.audioUrl
      || (latestActive.audioReference ?? null) !== reference) {
      const pending = refreshInFlightRef.current;
      if (pending?.reference === reference
        && pending.audioUrl === failedSource.audioUrl
        && pending.generation === failedSource.generation) refreshInFlightRef.current = null;
      return;
    }
    refreshInFlightRef.current = null;
    if (error || !data?.signedUrl) {
      playbackIntentRef.current = false;
      pendingAutoplayRef.current = false;
      commit((currentState) => ({
        ...currentState,
        isPlaying: false,
        status: 'error',
        isReady: false,
        error: error?.message ?? 'Unable to refresh the audio URL.',
      }));
      return;
    }

    const refreshed = { ...latestActive, audioUrl: data.signedUrl };
    commit((currentState) => ({
      ...currentState,
      queue: currentState.queue.map((item) => item.trackId === refreshed.trackId ? refreshed : item),
      status: 'loading',
      isPlaying: false,
      error: null,
    }));
    playTrackRef.current(refreshed, playbackIntentRef.current, 'refresh');
  }, [commit]);
  refreshAudioRef.current = refreshAudioUrl;

  const togglePlay = useCallback(() => {
    const audio = ensureAudio();
    const current = stateRef.current;
    if (playbackIntentRef.current || current.isPlaying) {
      playbackIntentRef.current = false;
      pendingAutoplayRef.current = false;
      playbackRequestRef.current += 1;
      audio.pause();
      commit((latest) => ({
        ...latest,
        isPlaying: false,
        status: latest.status === 'error' ? 'error' : latest.isReady ? 'paused' : latest.status,
      }));
      return;
    }
    const active = current.queue.find((item) => item.trackId === current.activeTrackId) ?? current.queue[0];
    if (active) playTrackRef.current(active, true);
  }, [commit, ensureAudio]);

  const seek = useCallback((value: number) => {
    const audio = ensureAudio();
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (Math.min(100, Math.max(0, value)) / 100) * audio.duration;
    commit((current) => ({ ...current, currentTime: audio.currentTime }));
  }, [commit, ensureAudio]);

  const setVolume = useCallback((value: number) => {
    const nextVolume = clampVolume(value);
    const audio = ensureAudio();
    if (!volumeSupportedRef.current) return;
    const graph = audioVolumeGraphRef.current;
    if (graph?.audio === audio) {
      const appliedVolume = applyGainVolume(graph, nextVolume, mutedRef.current);
      volumeRef.current = appliedVolume;
      volumeSupportedRef.current = true;
      commit((current) => ({ ...current, volume: appliedVolume, volumeSupported: true, volumeSupportKnown: true }));
      return;
    }
    const appliedVolume = applyMediaVolume(audio, nextVolume, mutedRef.current, true);
    const supported = Math.abs(appliedVolume - nextVolume) < 0.001;
    volumeSupportedRef.current = supported;
    if (supported) volumeRef.current = appliedVolume;
    commit((current) => ({ ...current, volume: volumeRef.current, volumeSupported: supported, volumeSupportKnown: true }));
  }, [commit, ensureAudio]);

  const toggleMute = useCallback(() => {
    const audio = ensureAudio();
    mutedRef.current = !mutedRef.current;
    audio.muted = mutedRef.current;
    const graph = audioVolumeGraphRef.current;
    if (graph?.audio === audio) applyGainVolume(graph, volumeRef.current, mutedRef.current);
    commit((current) => ({ ...current, isMuted: mutedRef.current }));
  }, [commit, ensureAudio]);

  const playNext = useCallback(() => {
    const current = stateRef.current;
    const next = nextQueueItem(current.queue, current.activeTrackId);
    if (next) {
      playTrackRef.current(next, playbackIntentRef.current || current.isPlaying);
      return;
    }
    playbackIntentRef.current = false;
    pendingAutoplayRef.current = false;
    playbackRequestRef.current += 1;
    ensureAudio().pause();
    commit((latest) => ({ ...latest, isPlaying: false, currentTime: 0, status: latest.isReady ? 'ready' : 'idle' }));
  }, [commit, ensureAudio]);

  const playPrevious = useCallback(() => {
    const current = stateRef.current;
    const previous = previousQueueItem(current.queue, current.activeTrackId);
    if (previous) playTrackRef.current(previous, playbackIntentRef.current || current.isPlaying);
  }, []);

  const value = useMemo<AudioPlayerContextValue>(() => ({
    state, playTrack, togglePlay, playNext, playPrevious, seek, setVolume, toggleMute, setQueue, clearQueue,
  }), [clearQueue, playNext, playPrevious, playTrack, seek, setQueue, setVolume, state, toggleMute, togglePlay]);

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return context;
}
