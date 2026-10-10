import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualAnimationPlayer } from './VisualAnimationPlayer';

describe('VisualAnimationPlayer', () => {
  let container: HTMLDivElement;
  let root: Root;
  let play: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function render(props: { src?: string; poster?: string | null } = {}) {
    act(() => root.render(<VisualAnimationPlayer src={props.src ?? 'https://cdn.example/reel.mp4'} poster={props.poster} title="Portrait Reel" />));
  }

  it('autoplays muted, inline and looped with no native controls and provides labeled custom controls', () => {
    render({ poster: 'https://cdn.example/reel-poster.jpg' });
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.controls).toBe(false);
    expect(video.getAttribute('poster')).toBe('https://cdn.example/reel-poster.jpg');
    expect(container.querySelector('[aria-label="Watching Full Screen"]')?.textContent).toBe('Watching Full Screen');
    expect(container.querySelector('[aria-label="Play animation"]')).toBeTruthy();
  });

  it('does not autoplay when reduced motion is preferred but still allows explicit playback', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render();
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.autoplay).toBe(false);
    expect(video.controls).toBe(false);
    act(() => (container.querySelector('[aria-label="Play animation"]') as HTMLButtonElement).click());
    expect(play).toHaveBeenCalledOnce();
  });

  it('shows a useful loading state when neither a poster nor a decoded video frame is available', () => {
    render();
    expect(container.querySelector('.visual-animation-player__loading')?.textContent).toContain('Loading animation');
    const video = container.querySelector('video') as HTMLVideoElement;
    act(() => video.dispatchEvent(new Event('loadeddata')));
    expect(container.querySelector('.visual-animation-player__loading')).toBeNull();
  });

  it('announces when muted autoplay is blocked and leaves the explicit play action available', async () => {
    play.mockRejectedValueOnce(new Error('autoplay blocked'));
    render();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Autoplay was blocked');
    expect(container.querySelector('[aria-label="Play animation"]')).toBeTruthy();
  });

  it('requests real fullscreen on the player container from the visible button', async () => {
    render();
    const player = container.querySelector('.visual-animation-player') as HTMLDivElement;
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(player, 'requestFullscreen', { configurable: true, value: requestFullscreen });
    await act(async () => {
      (container.querySelector('[aria-label="Watching Full Screen"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it('uses the WebKit video fullscreen fallback when the standard request fails', async () => {
    render();
    const player = container.querySelector('.visual-animation-player') as HTMLDivElement;
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('unsupported element'));
    Object.defineProperty(player, 'requestFullscreen', { configurable: true, value: requestFullscreen });
    const video = container.querySelector('video') as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    const webkitEnterFullscreen = vi.fn();
    Object.defineProperty(video, 'webkitEnterFullscreen', { configurable: true, value: webkitEnterFullscreen });
    await act(async () => {
      (container.querySelector('[aria-label="Watching Full Screen"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(webkitEnterFullscreen).toHaveBeenCalledOnce();
  });

  it('shows the poster and a clear message if the video cannot play, without requesting an empty poster URL', () => {
    render({ src: 'https://cdn.example/bad.mp4', poster: '  ' });
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.getAttribute('poster')).toBeNull();
    act(() => video.dispatchEvent(new Event('error')));
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('Portrait Reel');
    expect(container.textContent).toContain('could not be played');
    expect((container.querySelector('[aria-label="Watching Full Screen"]') as HTMLButtonElement).disabled).toBe(true);
  });
});
