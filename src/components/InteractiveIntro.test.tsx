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

  it('renders individual character spans and waits for the intro to be ready before completing', () => {
    const onComplete = vi.fn();

    act(() => {
      root.render(<InteractiveIntro artistName="NEW WAVE" onComplete={onComplete} />);
    });

    expect(container.querySelectorAll('.intro-character').length).toBeGreaterThan(0);

    act(() => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    act(() => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
