import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractiveIntro } from './InteractiveIntro';

describe('InteractiveIntro', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reveals the word along the user motion path and completes after a four-second pause', () => {
    const onComplete = vi.fn();

    act(() => {
      root.render(<InteractiveIntro artistName="NEW WAVE" onComplete={onComplete} />);
    });

    expect(container.querySelectorAll('.intro-character').length).toBe(0);

    act(() => {
      window.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: 140,
          clientY: 180,
        }),
      );
    });

    expect(container.querySelectorAll('.intro-character').length).toBe(0);

    for (let i = 0; i < 8; i += 1) {
      act(() => {
        window.dispatchEvent(
          new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 220 + i * 90,
            clientY: 200 + (i % 4) * 26,
          }),
        );
      });

      expect(container.querySelectorAll('.intro-character').length).toBe(i + 1);
    }

    act(() => {
      vi.advanceTimersByTime(5600);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips the completion pause and fade in reduced-motion mode', () => {
    const onComplete = vi.fn();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    act(() => {
      root.render(<InteractiveIntro artistName="NEW WAVE" onComplete={onComplete} />);
    });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: 140,
          clientY: 180,
        }),
      );
    });

    for (let i = 0; i < 8; i += 1) {
      act(() => {
        window.dispatchEvent(
          new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 220 + i * 90,
            clientY: 200 + (i % 4) * 26,
          }),
        );
      });
    }

    act(() => {
      vi.runAllTimers();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
