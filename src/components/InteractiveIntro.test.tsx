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
  });

  it('reveals the word along the user motion path and completes when the full name is drawn', () => {
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
            clientX: 180 + i * 90,
            clientY: 200 + (i % 4) * 26,
          }),
        );
      });

      expect(container.querySelectorAll('.intro-character').length).toBe(i + 1);
    }

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
