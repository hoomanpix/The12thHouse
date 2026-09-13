import { useCallback, useEffect, useRef, useState } from 'react';

export interface InteractiveIntroProps {
  artistName: string;
  onComplete?: () => void;
}

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [pointer, setPointer] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const lastPointRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const finishIntro = useCallback(() => {
    setIsComplete((current) => {
      if (current) {
        return current;
      }

      onComplete?.();
      return true;
    });
  }, [onComplete]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      finishIntro();
      return;
    }
  }, [reducedMotion, finishIntro]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX - lastPointRef.current.x;
      const dy = event.clientY - lastPointRef.current.y;

      lastPointRef.current = { x: event.clientX, y: event.clientY };
      setPointer({ x: event.clientX, y: event.clientY });
      setDirection({ x: dx || 1, y: dy || 0 });
      setHasInteracted(true);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const dx = touch.clientX - lastPointRef.current.x;
      const dy = touch.clientY - lastPointRef.current.y;

      lastPointRef.current = { x: touch.clientX, y: touch.clientY };
      setPointer({ x: touch.clientX, y: touch.clientY });
      setDirection({ x: dx || 1, y: dy || 0 });
      setHasInteracted(true);
    };

    const handleCommit = () => {
      if (hasInteracted) {
        finishIntro();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (hasInteracted) {
          finishIntro();
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('click', handleCommit, { passive: true });
    window.addEventListener('touchend', handleCommit, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('click', handleCommit);
      window.removeEventListener('touchend', handleCommit);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [finishIntro, hasInteracted]);

  const letters = hasInteracted ? artistName.split('') : [];
  const length = letters.length;
  const magnitude = Math.hypot(direction.x, direction.y) || 1;
  const dirX = direction.x / magnitude;
  const dirY = direction.y / magnitude;

  return (
    <div className={isComplete ? 'intro-screen intro-screen--hidden' : 'intro-screen'} aria-hidden={isComplete}>
      {hasInteracted ? (
        <div className="intro-spray" aria-label={artistName}>
          {letters.map((letter, index) => {
            const offset = index - (length - 1) / 2;
            const x = pointer.x + dirX * offset * 26 + (-dirY * 18 * Math.sin(index * 0.7));
            const y = pointer.y + dirY * offset * 26 + (dirX * 18 * Math.sin(index * 0.7));

            return (
              <span
                key={`${letter}-${index}`}
                className="intro-letter"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  opacity: 1,
                  transform: `translate(-50%, -50%) rotate(${dirX * 10 + index * 1.2}deg)`,
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
