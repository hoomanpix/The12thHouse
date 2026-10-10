import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractiveIntro } from './InteractiveIntro';

describe('InteractiveIntro', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('has no Skip control and naturally completes after the existing path reveal pause', () => {
    const onComplete = vi.fn();
    act(() => root.render(<InteractiveIntro artistName="THE12THHOUSE" onComplete={onComplete} />));
    expect(container.querySelector('.intro-skip')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelectorAll('.intro-character').length).toBe(0);

    act(() => window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140, clientY: 180 })));
    for (let i = 0; i < 12; i += 1) {
      act(() => window.dispatchEvent(new MouseEvent('pointermove', { clientX: 220 + i * 90, clientY: 200 + (i % 4) * 26 })));
      expect(container.querySelectorAll('.intro-character').length).toBeGreaterThanOrEqual(i + 1);
    }
    act(() => vi.advanceTimersByTime(2499));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector('.intro-screen--hidden')).not.toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2499));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reaches the Home completion callback without input instead of remaining blank indefinitely', () => {
    const onComplete = vi.fn();
    act(() => root.render(<InteractiveIntro artistName="THE12THHOUSE" onComplete={onComplete} />));
    act(() => vi.advanceTimersByTime(7999));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector('.intro-screen--hidden')).not.toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2500));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('completes from one long pointer path without requiring many tiny moves', () => {
    act(() => root.render(<InteractiveIntro artistName="THE12THHOUSE" />));
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 20, clientY: 120 }));
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 900, clientY: 120 }));
    });
    expect(container.querySelectorAll('.intro-character').length).toBeGreaterThan(1);
  });

  it('respects reduced-motion timing after the path is complete', () => {
    const onComplete = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)', media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })));
    act(() => root.render(<InteractiveIntro artistName="THE12THHOUSE" onComplete={onComplete} />));
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140, clientY: 180 }));
      for (let i = 0; i < 12; i += 1) window.dispatchEvent(new MouseEvent('pointermove', { clientX: 220 + i * 90, clientY: 200 + (i % 4) * 26 }));
    });
    act(() => vi.advanceTimersByTime(160));
    expect(container.querySelector('.intro-screen--hidden')).not.toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not keep a reduced-motion visitor behind the no-input intro fallback', () => {
    const onComplete = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)', media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })));
    act(() => root.render(<InteractiveIntro artistName="THE12THHOUSE" onComplete={onComplete} />));
    act(() => vi.advanceTimersByTime(159));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector('.intro-screen--hidden')).not.toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reveals characters along a touch path', () => {
    act(() => root.render(<InteractiveIntro artistName="THE12THHOUSE" />));
    const firstTouchMove = new TouchEvent('touchmove', {
      bubbles: true,
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    const preventDefault = vi.spyOn(firstTouchMove, 'preventDefault');
    act(() => {
      window.dispatchEvent(firstTouchMove);
      window.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [{ clientX: 700, clientY: 100 } as Touch] }));
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('.intro-character').length).toBeGreaterThan(0);
  });
});
