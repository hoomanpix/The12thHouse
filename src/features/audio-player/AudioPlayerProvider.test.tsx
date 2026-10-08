import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalAudioPlayer } from '../../components/GlobalAudioPlayer';
import { AudioPlayerProvider, useAudioPlayer } from './AudioPlayerProvider';
import type { AudioQueueItem } from './types';
import { DEFAULT_VOLUME } from './volume';

const backend = vi.hoisted(() => ({ createSignedUrl: vi.fn(), from: vi.fn(), insertTrackView: vi.fn() }));
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from: backend.from, storage: { from: () => ({ createSignedUrl: backend.createSignedUrl }) } },
}));

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  static nativeVolumeWorks = true;
  src = '';
  crossOrigin: string | null = null;
  currentTime = 0;
  duration = 180;
  private storedVolume = 1;
  get volume() { return FakeAudio.nativeVolumeWorks ? this.storedVolume : 1; }
  set volume(value: number) { if (FakeAudio.nativeVolumeWorks) this.storedVolume = value; }
  muted = false;
  error: MediaError | null = null;
  preload = '';
  paused = true;
  playCalls = 0;

  constructor() { super(); FakeAudio.instances.push(this); }
  load() { this.error = null; this.dispatchEvent(new Event('loadstart')); }
  play() { this.playCalls += 1; this.paused = false; this.dispatchEvent(new Event('play')); return Promise.resolve(); }
  pause() { const wasPlaying = !this.paused; this.paused = true; if (wasPlaying) this.dispatchEvent(new Event('pause')); }
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
}

class FakeAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeAudioParam {
  value = 1;
  cancelScheduledValues = vi.fn();
  setTargetAtTime = vi.fn((value: number) => { this.value = value; });
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static failMediaElementSource = false;
  static rejectResume = false;
  state: AudioContextState = 'suspended';
  destination = new FakeAudioNode();
  sourceNodes: FakeAudioNode[] = [];
  gainNodes: FakeGainNode[] = [];
  resumeCalls = 0;

  constructor() { FakeAudioContext.instances.push(this); }
  createMediaElementSource(_audio: HTMLMediaElement) {
    if (FakeAudioContext.failMediaElementSource) throw new Error('Web Audio media source is unavailable.');
    const source = new FakeAudioNode();
    this.sourceNodes.push(source);
    return source;
  }
  createGain() {
    const gain = new FakeGainNode();
    this.gainNodes.push(gain);
    return gain;
  }
  resume() {
    this.resumeCalls += 1;
    if (FakeAudioContext.rejectResume) return Promise.reject(new Error('AudioContext resume blocked.'));
    this.state = 'running';
    return Promise.resolve();
  }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

const queue: AudioQueueItem[] = [
  { id: 'one', releaseId: 'release', trackId: 'one', title: 'One', audioUrl: 'https://cdn.example/one.mp3', artworkUrl: 'https://cdn.example/cover.jpg', releaseTitle: 'Release' },
  { id: 'two', releaseId: 'release', trackId: 'two', title: 'Two', audioUrl: 'https://cdn.example/two.mp3', artworkUrl: 'https://cdn.example/cover.jpg', releaseTitle: 'Release' },
];

let player: ReturnType<typeof useAudioPlayer> | null = null;
function CapturePlayer() { player = useAudioPlayer(); return null; }

describe('AudioPlayerProvider interactions', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const render = (includePlayer = false) => act(() => root.render(<AudioPlayerProvider><CapturePlayer />{includePlayer && <GlobalAudioPlayer />}</AudioPlayerProvider>));
  const hasMuteButton = () => [...container.querySelectorAll('button')].some((button) =>
    /\b(?:un)?mute\b/i.test(`${button.getAttribute('aria-label') ?? ''} ${button.textContent ?? ''}`));

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    FakeAudio.instances = [];
    FakeAudio.nativeVolumeWorks = true;
    FakeAudioContext.instances = [];
    FakeAudioContext.failMediaElementSource = false;
    FakeAudioContext.rejectResume = false;
    player = null;
    backend.createSignedUrl.mockReset().mockResolvedValue({ data: { signedUrl: 'https://cdn.example/refreshed.mp3' }, error: null });
    backend.from.mockReset().mockReturnValue({ insert: backend.insertTrackView });
    backend.insertTrackView.mockReset().mockResolvedValue({ error: null });
    vi.stubGlobal('Audio', FakeAudio);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    expect(FakeAudioContext.instances.every((context) => context.state === 'closed')).toBe(true);
    container.remove();
    vi.unstubAllGlobals();
  });

  it('records one qualified track view at 30 seconds, not at selection or a shorter listen', async () => {
    render();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    const audio = FakeAudio.instances[0];

    audio.currentTime = 29;
    act(() => audio.dispatchEvent(new Event('timeupdate')));
    expect(backend.insertTrackView).not.toHaveBeenCalled();

    audio.currentTime = 30;
    await act(async () => { audio.dispatchEvent(new Event('timeupdate')); await Promise.resolve(); });
    expect(backend.from).toHaveBeenCalledWith('track_view_events');
    expect(backend.insertTrackView).toHaveBeenCalledTimes(1);
    expect(backend.insertTrackView).toHaveBeenCalledWith(expect.objectContaining({ track_id: 'one', session_id: expect.any(String) }));

    audio.currentTime = 45;
    act(() => audio.dispatchEvent(new Event('timeupdate')));
    expect(backend.insertTrackView).toHaveBeenCalledTimes(1);
  });

  it('keeps the volume slider operational through a Web Audio gain node when native volume is unavailable', async () => {
    FakeAudio.nativeVolumeWorks = false;
    vi.stubGlobal('AudioContext', FakeAudioContext);
    render(true);
    const thirdTrack = { ...queue[0], id: 'three', trackId: 'three', title: 'Three', audioUrl: 'https://cdn.example/three.mp3' };
    await act(async () => { player!.setQueue([...queue, thirdTrack]); player!.playTrack(queue[0]); await Promise.resolve(); });

    const context = FakeAudioContext.instances[0];
    expect(context).toBeTruthy();
    expect(context.state).toBe('running');
    expect(context.resumeCalls).toBeGreaterThan(0);
    expect(context.sourceNodes).toHaveLength(1);
    expect(context.gainNodes).toHaveLength(1);
    expect(context.gainNodes[0].gain.value).toBe(DEFAULT_VOLUME);
    expect(FakeAudio.instances[0].crossOrigin).toBe('anonymous');

    act(() => (container.querySelector('[aria-label="Expand player"]') as HTMLButtonElement).click());
    const slider = container.querySelector('#volume-control') as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('1');
    expect(slider.disabled).toBe(false);
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    nativeValueSetter?.call(slider, '0.42');
    act(() => {
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(player!.state.volume).toBe(0.42);
    expect(context.gainNodes[0].gain.value).toBe(0.42);
    expect(player!.state.isPlaying).toBe(true);

    act(() => player!.toggleMute());
    expect(context.gainNodes[0].gain.value).toBe(0);
    expect(player!.state.volume).toBe(0.42);
    act(() => player!.toggleMute());
    expect(context.gainNodes[0].gain.value).toBe(0.42);

    act(() => (container.querySelector('[aria-label="Collapse player"]') as HTMLButtonElement).click());
    act(() => player!.setVolume(0.35));
    expect(player!.state.isPlaying).toBe(true);
    expect(context.gainNodes[0].gain.value).toBe(0.35);
    act(() => (container.querySelector('[aria-label="Expand player"]') as HTMLButtonElement).click());

    await act(async () => { player!.playNext(); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('two');
    expect(player!.state.isPlaying).toBe(true);
    expect(player!.state.volume).toBe(0.35);
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(context.sourceNodes).toHaveLength(2);
    expect(context.gainNodes[1].gain.value).toBe(0.35);
    expect(context.sourceNodes[0].disconnect).toHaveBeenCalledTimes(1);

    await act(async () => {
      FakeAudio.instances[1].dispatchEvent(new Event('ended'));
      await Promise.resolve();
    });
    expect(player!.state.activeTrackId).toBe('three');
    expect(player!.state.isPlaying).toBe(true);
    expect(context.sourceNodes).toHaveLength(3);
    expect(context.gainNodes[2].gain.value).toBe(0.35);
    expect(context.sourceNodes[1].disconnect).toHaveBeenCalledTimes(1);

    act(() => player!.toggleMute());
    expect(player!.state.isMuted).toBe(true);
    expect(context.gainNodes[2].gain.value).toBe(0);
    await act(async () => { player!.playPrevious(); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('two');
    expect(player!.state.isPlaying).toBe(true);
    expect(player!.state.isMuted).toBe(true);
    expect(player!.state.volume).toBe(0.35);
    expect(context.gainNodes[3].gain.value).toBe(0);

    act(() => player!.toggleMute());
    expect(context.gainNodes[3].gain.value).toBe(0.35);
    act(() => player!.togglePlay());
    expect(player!.state.isPlaying).toBe(false);
    act(() => player!.setVolume(0.65));
    expect(player!.state.isPlaying).toBe(false);
    expect(player!.state.volume).toBe(0.65);
    expect(context.gainNodes[3].gain.value).toBe(0.65);
    act(() => player!.togglePlay());
    expect(player!.state.isPlaying).toBe(true);
    expect(context.gainNodes[3].gain.value).toBe(0.65);

    await act(async () => { player!.playPrevious(); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('one');
    expect(player!.state.isPlaying).toBe(true);
    expect(player!.state.volume).toBe(0.65);
    expect(context.gainNodes[4].gain.value).toBe(0.65);
    expect(context.sourceNodes[3].disconnect).toHaveBeenCalledTimes(1);
  });

  it('preserves native audio loading mode if Web Audio graph creation fails', async () => {
    FakeAudioContext.failMediaElementSource = true;
    vi.stubGlobal('AudioContext', FakeAudioContext);
    render();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });

    expect(FakeAudio.instances[0].crossOrigin).toBeNull();
    expect(player!.state.volumeSupported).toBe(true);
    expect(player!.state.isPlaying).toBe(true);
  });

  it('pauses playback and reports an error if the Web Audio context cannot resume', async () => {
    FakeAudio.nativeVolumeWorks = false;
    FakeAudioContext.rejectResume = true;
    vi.stubGlobal('AudioContext', FakeAudioContext);
    render();
    await act(async () => {
      player!.setQueue(queue);
      player!.playTrack(queue[0]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(FakeAudioContext.instances[0].state).toBe('suspended');
    expect(FakeAudio.instances[0].paused).toBe(true);
    expect(player!.state.isPlaying).toBe(false);
    expect(player!.state.status).toBe('error');
    expect(player!.state.error).toContain('Audio output is suspended');
  });

  it('propagates real media duration and elapsed time to the expanded player', async () => {
    render(true);
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    const audio = FakeAudio.instances[0];
    audio.duration = 233.496;
    act(() => audio.dispatchEvent(new Event('loadedmetadata')));
    expect(Number.isFinite(player!.state.duration)).toBe(true);
    expect(player!.state.duration).toBe(233.496);

    audio.currentTime = 17;
    act(() => audio.dispatchEvent(new Event('timeupdate')));
    expect(player!.state.currentTime).toBe(17);

    await act(async () => { player!.playNext(); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('two');
    expect(player!.state.duration).toBe(0);
    const nextAudio = FakeAudio.instances[1];
    nextAudio.duration = 128.25;
    act(() => nextAudio.dispatchEvent(new Event('loadedmetadata')));
    expect(player!.state.duration).toBe(128.25);
    nextAudio.currentTime = 32;
    act(() => nextAudio.dispatchEvent(new Event('timeupdate')));
    expect(player!.state.currentTime).toBe(32);

    act(() => (container.querySelector('[aria-label="Expand player"]') as HTMLButtonElement).click());
    const times = [...container.querySelectorAll('.player-progress-block > span')].map((node) => node.textContent);
    expect(times).toEqual(['0:32', '2:08']);
    const progress = container.querySelector('.player-strip__progress-bar') as HTMLElement;
    expect(parseFloat(progress.style.width)).toBeCloseTo((32 / 128.25) * 100, 3);
  });

  it('rebuilds the Web Audio graph and retains selected gain after signed URL refresh', async () => {
    FakeAudio.nativeVolumeWorks = false;
    vi.stubGlobal('AudioContext', FakeAudioContext);
    render();
    const item = { ...queue[0], audioReference: 'release/track-one.mp3' };
    await act(async () => { player!.setQueue([item]); player!.playTrack(item); await Promise.resolve(); });
    act(() => player!.setVolume(0.37));

    const expiredAudio = FakeAudio.instances[0];
    expiredAudio.error = { code: 4, message: 'Expired media URL.' } as MediaError;
    await act(async () => {
      expiredAudio.dispatchEvent(new Event('error'));
      await Promise.resolve();
      await Promise.resolve();
    });

    const context = FakeAudioContext.instances[0];
    expect(backend.createSignedUrl).toHaveBeenCalledTimes(1);
    expect(FakeAudio.instances).toHaveLength(2);
    expect(FakeAudio.instances[1].src).toBe('https://cdn.example/refreshed.mp3');
    expect(player!.state.isPlaying).toBe(true);
    expect(player!.state.volume).toBe(0.37);
    expect(context.sourceNodes).toHaveLength(2);
    expect(context.sourceNodes[0].disconnect).toHaveBeenCalledTimes(1);
    expect(context.gainNodes[1].gain.value).toBe(0.37);
    const refreshedAudio = FakeAudio.instances[1];
    refreshedAudio.duration = 209.4;
    act(() => refreshedAudio.dispatchEvent(new Event('loadedmetadata')));
    expect(player!.state.duration).toBe(209.4);
  });

  it('updates the player total when finite duration arrives after loadedmetadata', async () => {
    render(true);
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    const audio = FakeAudio.instances[0];
    audio.duration = Number.NaN;
    act(() => audio.dispatchEvent(new Event('loadedmetadata')));
    expect(player!.state.duration).toBe(0);

    audio.duration = 233.496;
    act(() => audio.dispatchEvent(new Event('durationchange')));
    expect(player!.state.duration).toBe(233.496);
    act(() => (container.querySelector('[aria-label="Expand player"]') as HTMLButtonElement).click());
    expect([...container.querySelectorAll('.player-progress-block > span')].map((node) => node.textContent)).toEqual(['0:00', '3:53']);
  });

  it('preserves paused status when finite duration changes', async () => {
    render();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    const audio = FakeAudio.instances[0];
    act(() => audio.dispatchEvent(new Event('loadedmetadata')));
    act(() => player!.togglePlay());
    expect(player!.state.status).toBe('paused');

    audio.duration = 233.496;
    act(() => audio.dispatchEvent(new Event('durationchange')));
    expect(player!.state.duration).toBe(233.496);
    expect(player!.state.status).toBe('paused');
  });

  it('updates duration on timeupdate when it becomes finite without durationchange', async () => {
    render(true);
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    const audio = FakeAudio.instances[0];
    audio.duration = Number.NaN;
    act(() => audio.dispatchEvent(new Event('loadedmetadata')));
    expect(player!.state.duration).toBe(0);

    audio.duration = 233.496;
    audio.currentTime = 17;
    act(() => audio.dispatchEvent(new Event('timeupdate')));
    expect(player!.state.duration).toBe(233.496);
    expect(player!.state.currentTime).toBe(17);
    act(() => (container.querySelector('[aria-label="Expand player"]') as HTMLButtonElement).click());
    expect([...container.querySelectorAll('.player-progress-block > span')].map((node) => node.textContent)).toEqual(['0:17', '3:53']);
  });

  it('preserves an audio error when duration changes after a failed signed URL refresh', async () => {
    backend.createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'Temporary refresh failure.' } });
    render();
    const item = { ...queue[0], audioReference: 'release/track-one.mp3' };
    await act(async () => { player!.setQueue([item]); player!.playTrack(item); await Promise.resolve(); });
    const audio = FakeAudio.instances[0];
    audio.error = { code: 4, message: 'Expired media URL.' } as MediaError;
    await act(async () => { audio.dispatchEvent(new Event('error')); await Promise.resolve(); await Promise.resolve(); });
    expect(player!.state.status).toBe('error');
    expect(player!.state.error).toBe('Temporary refresh failure.');

    audio.duration = 233.496;
    act(() => audio.dispatchEvent(new Event('durationchange')));
    expect(player!.state.duration).toBe(233.496);
    expect(player!.state.status).toBe('error');
    expect(player!.state.error).toBe('Temporary refresh failure.');
    expect(player!.state.isReady).toBe(false);
  });

  it('keeps playback active when navigating to the next track while already playing', async () => {
    render();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    expect(player!.state.isPlaying).toBe(true);
    await act(async () => { player!.playNext(); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('two');
    expect(player!.state.isPlaying).toBe(true);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].playCalls).toBe(1);
  });

  it('keeps a paused queue paused when navigating to the next track', async () => {
    render();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    act(() => player!.togglePlay());
    expect(player!.state.isPlaying).toBe(false);
    const priorPlayCalls = FakeAudio.instances[0].playCalls;
    await act(async () => { player!.playNext(); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('two');
    expect(player!.state.isPlaying).toBe(false);
    expect(FakeAudio.instances[0].playCalls).toBe(priorPlayCalls);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].playCalls).toBe(0);
  });

  it('resumes the active track from its paused playhead', async () => {
    render();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    const audio = FakeAudio.instances[0];
    audio.currentTime = 42;
    act(() => audio.dispatchEvent(new Event('loadedmetadata')));
    act(() => audio.dispatchEvent(new Event('timeupdate')));
    expect(player!.state.currentTime).toBe(42);

    const playCallsBeforePause = audio.playCalls;
    act(() => player!.togglePlay());
    expect(player!.state.isPlaying).toBe(false);
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(42);

    await act(async () => { player!.togglePlay(); await Promise.resolve(); });
    expect(player!.state.isPlaying).toBe(true);
    expect(audio.currentTime).toBe(42);
    expect(player!.state.currentTime).toBe(42);
    expect(audio.playCalls).toBe(playCallsBeforePause + 1);
  });

  it('starts at the beginning when the active track is explicitly selected', async () => {
    render();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    const audio = FakeAudio.instances[0];
    audio.currentTime = 42;
    act(() => audio.dispatchEvent(new Event('timeupdate')));
    expect(player!.state.currentTime).toBe(42);

    await act(async () => { player!.playTrack(queue[0]); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('one');
    expect(audio.currentTime).toBe(0);
    expect(player!.state.currentTime).toBe(0);
  });

  it('keeps web volume and mute state across track changes', async () => {
    render();
    act(() => player!.setVolume(0.42));
    act(() => player!.toggleMute());
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    await act(async () => { player!.playNext(); await Promise.resolve(); });
    expect(player!.state.volume).toBe(0.42);
    expect(player!.state.isMuted).toBe(true);
    expect(FakeAudio.instances[0].volume).toBe(0.42);
    expect(FakeAudio.instances[0].muted).toBe(true);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].volume).toBe(0.42);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].muted).toBe(true);
  });

  it('reflects the actual media volume and disables the slider if a later volume write fails', () => {
    render(true);
    act(() => player!.setVolume(0.4));
    const audio = FakeAudio.instances[0];
    Object.defineProperty(audio, 'volume', { configurable: true, get: () => 0.4, set: () => { throw new Error('volume write blocked'); } });
    act(() => player!.setVolume(0.7));
    expect(player!.state.volume).toBe(0.4);
    expect(player!.state.volumeSupported).toBe(false);
    act(() => (container.querySelector('[aria-label="Expand player"]') as HTMLButtonElement).click());
    expect((container.querySelector('#volume-control') as HTMLInputElement).disabled).toBe(true);
    expect(container.textContent).toContain('Per-player volume adjustment is unavailable in this browser. Use your device’s volume controls.');
    expect(hasMuteButton()).toBe(false);
  });

  it('keeps minimized artwork display-only and exposes explicit player controls', async () => {
    render(true);
    const coverFrame = container.querySelector('.player-strip__cover-frame');
    expect(coverFrame?.tagName).toBe('DIV');
    expect(container.querySelector('.player-strip__cover-button')).toBeNull();
    act(() => (container.querySelector('[aria-label="Expand player"]') as HTMLButtonElement).click());
    expect(container.querySelector('.player-icon--previous')).toBeTruthy();
    expect(container.querySelector('.player-icon--next')).toBeTruthy();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    const playCalls = FakeAudio.instances[0].playCalls;
    act(() => coverFrame?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(player!.state.isPlaying).toBe(true);
    expect(FakeAudio.instances[0].playCalls).toBe(playCalls);
  });

  it('keeps an accessible working volume slider without a mute button', () => {
    render(true);
    act(() => (container.querySelector('[aria-label="Expand player"]') as HTMLButtonElement).click());
    const volume = container.querySelector('#volume-control') as HTMLInputElement;
    expect(volume).toBeTruthy();
    expect(volume.min).toBe('0');
    expect(volume.max).toBe('1');
    expect(volume.disabled).toBe(false);
    expect(hasMuteButton()).toBe(false);
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    nativeValueSetter?.call(volume, '0.42');
    act(() => {
      volume.dispatchEvent(new Event('input', { bubbles: true }));
      volume.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(player!.state.volume).toBe(0.42);
    expect(FakeAudio.instances[0].volume).toBe(0.42);
    expect(volume.getAttribute('aria-label')).toBe('Volume');
    expect(container.querySelector('label[for="volume-control"]')?.textContent).toBe('Volume');
  });

  it('continues playback when Previous changes the selected track', async () => {
    render();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[1]); await Promise.resolve(); });
    await act(async () => { player!.playPrevious(); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('one');
    expect(player!.state.isPlaying).toBe(true);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].playCalls).toBe(1);
  });

  it('continues the queue automatically when a playable track ends', async () => {
    render();
    await act(async () => { player!.setQueue(queue); player!.playTrack(queue[0]); await Promise.resolve(); });
    await act(async () => { FakeAudio.instances[0].dispatchEvent(new Event('ended')); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('two');
    expect(player!.state.isPlaying).toBe(true);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].playCalls).toBe(1);
  });

  it('refreshes an expired signed URL and resumes the requested track', async () => {
    render();
    act(() => player!.setVolume(0.42));
    act(() => player!.toggleMute());
    const item = { ...queue[0], audioReference: 'release/track-one.mp3' };
    await act(async () => { player!.setQueue([item, queue[1]]); player!.playTrack(item); await Promise.resolve(); });
    FakeAudio.instances[0].error = { code: 4, message: 'Expired media URL.' } as MediaError;
    await act(async () => { FakeAudio.instances[0].dispatchEvent(new Event('error')); await Promise.resolve(); await Promise.resolve(); });
    expect(backend.createSignedUrl).toHaveBeenCalledWith('release/track-one.mp3', 3600);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].src).toBe('https://cdn.example/refreshed.mp3');
    expect(player!.state.activeTrackId).toBe('one');
    expect(player!.state.isPlaying).toBe(true);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].playCalls).toBe(1);
    expect(player!.state.volume).toBe(0.42);
    expect(player!.state.isMuted).toBe(true);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].volume).toBe(0.42);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].muted).toBe(true);
  });

  it('ignores an error event from the previous source after selecting the next track', async () => {
    render();
    const first = { ...queue[0], audioReference: 'release/track-one.mp3' };
    const second = { ...queue[1], audioReference: 'release/track-two.mp3' };
    await act(async () => { player!.setQueue([first, second]); player!.playTrack(first); await Promise.resolve(); });
    const previousAudio = FakeAudio.instances[0];
    await act(async () => { player!.playNext(); await Promise.resolve(); });
    expect(player!.state.activeTrackId).toBe('two');
    expect(player!.state.isPlaying).toBe(true);
    const currentAudio = FakeAudio.instances[FakeAudio.instances.length - 1];
    expect(currentAudio.src).toBe(second.audioUrl);

    previousAudio.error = { code: 4, message: 'Late error from track one.' } as MediaError;
    await act(async () => { previousAudio.dispatchEvent(new Event('error')); await Promise.resolve(); await Promise.resolve(); });
    expect(backend.createSignedUrl).not.toHaveBeenCalled();
    expect(player!.state.activeTrackId).toBe('two');
    expect(player!.state.isPlaying).toBe(true);
    expect(player!.state.error).toBeNull();
  });

  it('refreshes a second expired signed URL for the same storage reference', async () => {
    backend.createSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: 'https://cdn.example/refreshed-once.mp3' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://cdn.example/refreshed-twice.mp3' }, error: null });
    render();
    const item = { ...queue[0], audioReference: 'release/track-one.mp3' };
    await act(async () => { player!.setQueue([item]); player!.playTrack(item); await Promise.resolve(); });

    const firstAudio = FakeAudio.instances[0];
    firstAudio.error = { code: 4, message: 'First signed URL expired.' } as MediaError;
    await act(async () => { firstAudio.dispatchEvent(new Event('error')); await Promise.resolve(); await Promise.resolve(); });
    expect(backend.createSignedUrl).toHaveBeenCalledTimes(1);

    const refreshedAudio = FakeAudio.instances[FakeAudio.instances.length - 1];
    expect(refreshedAudio.src).toBe('https://cdn.example/refreshed-once.mp3');
    refreshedAudio.error = { code: 4, message: 'Refreshed signed URL expired.' } as MediaError;
    await act(async () => { refreshedAudio.dispatchEvent(new Event('error')); await Promise.resolve(); await Promise.resolve(); });

    expect(backend.createSignedUrl).toHaveBeenCalledTimes(2);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].src).toBe('https://cdn.example/refreshed-twice.mp3');
    expect(player!.state.activeTrackId).toBe('one');
    expect(player!.state.isPlaying).toBe(true);
  });

  it('ignores duplicate error events while a signed URL refresh is in flight', async () => {
    let resolveSignedUrl: ((value: { data: { signedUrl: string }; error: null }) => void) | undefined;
    backend.createSignedUrl.mockImplementationOnce(() => new Promise((resolve) => { resolveSignedUrl = resolve; }));
    render();
    const item = { ...queue[0], audioReference: 'release/track-one.mp3' };
    await act(async () => { player!.setQueue([item]); player!.playTrack(item); await Promise.resolve(); });

    const audio = FakeAudio.instances[0];
    audio.error = { code: 4, message: 'Expired media URL.' } as MediaError;
    await act(async () => {
      audio.dispatchEvent(new Event('error'));
      audio.dispatchEvent(new Event('error'));
      await Promise.resolve();
    });
    expect(backend.createSignedUrl).toHaveBeenCalledTimes(1);
    expect(player!.state.isPlaying).toBe(true);
    expect(player!.state.error).toBeNull();

    await act(async () => {
      resolveSignedUrl?.({ data: { signedUrl: 'https://cdn.example/refreshed.mp3' }, error: null });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(player!.state.isPlaying).toBe(true);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].src).toBe('https://cdn.example/refreshed.mp3');
  });

  it('allows a manual retry after a signed URL refresh request fails', async () => {
    backend.createSignedUrl
      .mockResolvedValueOnce({ data: null, error: { message: 'Temporary refresh failure.' } })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://cdn.example/manual-retry.mp3' }, error: null });
    render();
    const item = { ...queue[0], audioReference: 'release/track-one.mp3' };
    await act(async () => { player!.setQueue([item]); player!.playTrack(item); await Promise.resolve(); });

    const audio = FakeAudio.instances[0];
    audio.error = { code: 4, message: 'Expired media URL.' } as MediaError;
    await act(async () => { audio.dispatchEvent(new Event('error')); await Promise.resolve(); await Promise.resolve(); });
    expect(player!.state.status).toBe('error');
    expect(backend.createSignedUrl).toHaveBeenCalledTimes(1);

    const currentItem = player!.state.queue.find((entry) => entry.trackId === 'one')!;
    await act(async () => { player!.playTrack(currentItem); await Promise.resolve(); });
    const retriedAudio = FakeAudio.instances[FakeAudio.instances.length - 1];
    retriedAudio.error = { code: 4, message: 'Still expired; retry after user action.' } as MediaError;
    await act(async () => { retriedAudio.dispatchEvent(new Event('error')); await Promise.resolve(); await Promise.resolve(); });

    expect(backend.createSignedUrl).toHaveBeenCalledTimes(2);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].src).toBe('https://cdn.example/manual-retry.mp3');
    expect(player!.state.isPlaying).toBe(true);
  });

  it('recovers from a rejected signed URL request and permits a manual retry', async () => {
    backend.createSignedUrl
      .mockRejectedValueOnce(new Error('Temporary transport failure.'))
      .mockResolvedValueOnce({ data: { signedUrl: 'https://cdn.example/transport-retry.mp3' }, error: null });
    render();
    const item = { ...queue[0], audioReference: 'release/track-one.mp3' };
    await act(async () => { player!.setQueue([item]); player!.playTrack(item); await Promise.resolve(); });

    const audio = FakeAudio.instances[0];
    audio.error = { code: 4, message: 'Expired media URL.' } as MediaError;
    await act(async () => {
      audio.dispatchEvent(new Event('error'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(player!.state.error).toBe('Temporary transport failure.');
    expect(backend.createSignedUrl).toHaveBeenCalledTimes(1);

    const currentItem = player!.state.queue.find((entry) => entry.trackId === 'one')!;
    await act(async () => { player!.playTrack(currentItem); await Promise.resolve(); });
    const retriedAudio = FakeAudio.instances[FakeAudio.instances.length - 1];
    retriedAudio.error = { code: 4, message: 'Retry after transport failure.' } as MediaError;
    await act(async () => { retriedAudio.dispatchEvent(new Event('error')); await Promise.resolve(); await Promise.resolve(); });
    expect(backend.createSignedUrl).toHaveBeenCalledTimes(2);
    expect(FakeAudio.instances[FakeAudio.instances.length - 1].src).toBe('https://cdn.example/transport-retry.mp3');
    expect(player!.state.isPlaying).toBe(true);
  });
});
