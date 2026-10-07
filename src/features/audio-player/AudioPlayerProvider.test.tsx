import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalAudioPlayer } from '../../components/GlobalAudioPlayer';
import { AudioPlayerProvider, useAudioPlayer } from './AudioPlayerProvider';
import type { AudioQueueItem } from './types';

const backend = vi.hoisted(() => ({ createSignedUrl: vi.fn() }));
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { storage: { from: () => ({ createSignedUrl: backend.createSignedUrl }) } },
}));

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  src = '';
  currentTime = 0;
  duration = 180;
  volume = 1;
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

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    FakeAudio.instances = [];
    player = null;
    backend.createSignedUrl.mockReset().mockResolvedValue({ data: { signedUrl: 'https://cdn.example/refreshed.mp3' }, error: null });
    vi.stubGlobal('Audio', FakeAudio);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
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
    expect(container.textContent).toContain('This browser does not expose per-player volume control.');
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

  it('connects the expanded web-volume slider and explicit mute button to the audio element', () => {
    render(true);
    act(() => (container.querySelector('[aria-label="Expand player"]') as HTMLButtonElement).click());
    const volume = container.querySelector('#volume-control') as HTMLInputElement;
    expect(volume).toBeTruthy();
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    nativeValueSetter?.call(volume, '0.42');
    act(() => {
      volume.dispatchEvent(new Event('input', { bubbles: true }));
      volume.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(player!.state.volume).toBe(0.42);
    expect(FakeAudio.instances[0].volume).toBe(0.42);

    const mute = container.querySelector('[aria-label="Mute audio"]') as HTMLButtonElement;
    act(() => mute.click());
    expect(player!.state.isMuted).toBe(true);
    expect(FakeAudio.instances[0].muted).toBe(true);
    expect(mute.getAttribute('aria-pressed')).toBe('true');
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
