import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualVideoPreview } from './VisualVideoPreview';

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  private target: Element | null = null;

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe = vi.fn((target: Element) => { this.target = target; });
  disconnect = vi.fn();

  setVisible(isIntersecting: boolean) {
    if (!this.target) return;
    const entry = { target: this.target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

describe('VisualVideoPreview', () => {
  let container: HTMLDivElement;
  let root: Root;
  let play: ReturnType<typeof vi.spyOn>;
  let pause: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    FakeIntersectionObserver.instances = [];
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
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

  it('plays muted, inline and looped only when near the viewport, then pauses offscreen', () => {
    act(() => root.render(<VisualVideoPreview src="https://cdn.example/landscape.mp4" poster="https://cdn.example/poster.jpg" />));
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.getAttribute('src')).toBe('https://cdn.example/landscape.mp4');
    expect(video.getAttribute('poster')).toBe('https://cdn.example/poster.jpg');
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.preload).toBe('metadata');
    expect(video.getAttribute('aria-hidden')).toBe('true');
    expect(play).not.toHaveBeenCalled();

    act(() => FakeIntersectionObserver.instances[0].setVisible(true));
    expect(play).toHaveBeenCalledOnce();
    act(() => FakeIntersectionObserver.instances[0].setVisible(false));
    expect(pause).toHaveBeenCalled();
  });

  it('does not autoplay when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    act(() => root.render(<VisualVideoPreview src="https://cdn.example/reel.mp4" />));
    act(() => FakeIntersectionObserver.instances[0].setVisible(true));
    expect(play).not.toHaveBeenCalled();
    expect(pause).toHaveBeenCalled();
  });

  it('applies only the valid intrinsic aspect ratio for landscape and portrait sources', () => {
    act(() => root.render(<VisualVideoPreview src="https://cdn.example/landscape.mp4" />));
    let video = container.querySelector('video') as HTMLVideoElement;
    expect(video.style.aspectRatio).toBe('');
    act(() => video.dispatchEvent(new Event('loadedmetadata')));
    expect(video.style.aspectRatio).toBe('');
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
    });
    act(() => video.dispatchEvent(new Event('loadedmetadata')));
    expect(video.style.aspectRatio).toBe('1920 / 1080');

    act(() => root.render(<VisualVideoPreview src="https://cdn.example/portrait.mp4" />));
    video = container.querySelector('video') as HTMLVideoElement;
    expect(video.style.aspectRatio).toBe('');
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 720 },
      videoHeight: { configurable: true, value: 1280 },
    });
    act(() => video.dispatchEvent(new Event('loadedmetadata')));
    expect(video.style.aspectRatio).toBe('720 / 1280');
  });

  it('does not request an empty poster and replaces an unsupported preview with an artwork fallback', () => {
    act(() => root.render(<VisualVideoPreview src="https://cdn.example/unavailable.mp4" poster="  " title="Unavailable Reel" />));
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.getAttribute('poster')).toBeNull();
    act(() => video.dispatchEvent(new Event('error')));
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('.release-video-fallback--placeholder')?.textContent).toContain('Unavailable Reel');
  });

  it('restarts observation when the source changes while the card remains mounted', () => {
    act(() => root.render(<VisualVideoPreview src="https://cdn.example/old.mp4" />));
    act(() => FakeIntersectionObserver.instances[0].setVisible(true));
    act(() => root.render(<VisualVideoPreview src="https://cdn.example/new.mp4" />));

    expect(container.querySelector('video')?.getAttribute('src')).toBe('https://cdn.example/new.mp4');
    expect(FakeIntersectionObserver.instances).toHaveLength(2);
    expect(pause).toHaveBeenCalled();
    act(() => FakeIntersectionObserver.instances[1].setVisible(true));
    expect(play).toHaveBeenCalledTimes(2);
  });
});
