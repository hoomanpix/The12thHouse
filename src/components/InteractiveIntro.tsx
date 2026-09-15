import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface InteractiveIntroProps {
  artistName: string;
  onComplete?: () => void;
}

type IntroCharacter = {
  id: number;
  char: string;
  x: number;
  y: number;
};

type CameraViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const CHARACTER_SPACING = 42;
const BASE_REVEAL_DISTANCE = 42;
const INTRO_PAUSE_DURATION = 800;
const INTRO_CAMERA_DURATION = 2600;

const safeScrollToTop = () => {
  try {
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch {
    // ignore unsupported browser scroll implementations during tests or restricted environments
  }
};

const easeCinematic = (progress: number) => {
  if (progress < 0.32) {
    return 0.5 * (progress / 0.32) ** 2;
  }

  const remainingProgress = (progress - 0.32) / 0.68;
  return 0.5 + 0.5 * (1 - (1 - remainingProgress) ** 3);
};

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [revealedCharacters, setRevealedCharacters] = useState<IntroCharacter[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [camera, setCamera] = useState<CameraViewport | null>(null);
  const [transitionProgress, setTransitionProgress] = useState(0);

  const characters = useMemo(() => artistName.toUpperCase().split(''), [artistName]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const accumulatorRef = useRef(0);
  const revealedCountRef = useRef(0);
  const dismissedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef(false);

  const selectRandomCharacter = useCallback((nextCharacters: IntroCharacter[]) => {
    const drawableCharacters = nextCharacters.filter(({ char }) => char.trim().length > 0);

    if (!drawableCharacters.length) {
      setSelectedCharacterId(null);
      return null;
    }

    const randomCharacter = drawableCharacters[Math.floor(Math.random() * drawableCharacters.length)] ?? drawableCharacters[0];
    setSelectedCharacterId(randomCharacter.id);
    return randomCharacter;
  }, []);

  const completeIntro = useCallback(
    (nextCharacters: IntroCharacter[] = revealedCharacters) => {
      if (dismissedRef.current || isComplete) {
        return;
      }

      selectRandomCharacter(nextCharacters);
      setIsComplete(true);
    },
    [isComplete, revealedCharacters, selectRandomCharacter],
  );

  const triggerComplete = useCallback(() => {
    if (dismissedRef.current || isDismissed) {
      return;
    }

    dismissedRef.current = true;
    setIsDismissed(true);
    onComplete?.();
  }, [isDismissed, onComplete]);

  useEffect(() => {
    if (!isComplete || isDismissed) {
      return undefined;
    }

    if (prefersReducedMotionRef.current) {
      const reducedMotionTimer = window.setTimeout(triggerComplete, 160);
      return () => window.clearTimeout(reducedMotionTimer);
    }

    const completionTimer = window.setTimeout(() => {
      setTransitionProgress(0);
    }, INTRO_PAUSE_DURATION);

    return () => window.clearTimeout(completionTimer);
  }, [isComplete, isDismissed, triggerComplete]);

  useEffect(() => {
    prefersReducedMotionRef.current =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      safeScrollToTop();
    };
  }, []);

  useEffect(() => {
    if (isDismissed || isComplete) {
      return undefined;
    }

    const handleMotion = (clientX: number, clientY: number, deltaX: number, deltaY: number) => {
      if (dismissedRef.current) {
        return;
      }

      const safeDeltaX = Number.isFinite(deltaX) ? deltaX : 0;
      const safeDeltaY = Number.isFinite(deltaY) ? deltaY : 0;
      const lastPoint = pointerRef.current ?? { x: clientX, y: clientY };
      const distance = Math.hypot(clientX - lastPoint.x, clientY - lastPoint.y) + Math.hypot(safeDeltaX, safeDeltaY);

      pointerRef.current = { x: clientX, y: clientY };

      if (distance <= 0.1) {
        return;
      }

      const revealEnergy = Math.min(distance, 180);
      const revealDistance = Math.max(18, BASE_REVEAL_DISTANCE - revealEnergy * 0.12);
      accumulatorRef.current += distance;

      if (accumulatorRef.current < revealDistance) {
        return;
      }

      const nextIndex = revealedCountRef.current;

      if (nextIndex >= characters.length) {
        completeIntro(revealedCharacters);
        return;
      }

      const directionX = safeDeltaX || (clientX - lastPoint.x) || 1;
      const directionY = safeDeltaY || (clientY - lastPoint.y) || 0;
      const angle = Math.atan2(directionY, directionX);
      const offset = nextIndex * CHARACTER_SPACING;
      const x = clientX + Math.cos(angle) * offset;
      const y = clientY + Math.sin(angle) * offset;

      const nextCharacter = { id: nextIndex, char: characters[nextIndex], x, y };
      const nextCharacters = [...revealedCharacters, nextCharacter];

      setRevealedCharacters(nextCharacters);
      revealedCountRef.current += 1;
      accumulatorRef.current = 0;

      if (revealedCountRef.current >= characters.length) {
        completeIntro(nextCharacters);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      handleMotion(event.clientX, event.clientY, event.movementX, event.movementY);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      handleMotion(event.clientX, event.clientY, event.deltaX, event.deltaY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];

      if (!touch) {
        return;
      }

      event.preventDefault();
      const deltaX = touch.clientX - (pointerRef.current?.x ?? touch.clientX);
      const deltaY = touch.clientY - (pointerRef.current?.y ?? touch.clientY);
      handleMotion(touch.clientX, touch.clientY, deltaX, deltaY);
    };

    const handleScroll = () => {
      if (dismissedRef.current) {
        return;
      }

      safeScrollToTop();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('scroll', handleScroll, { passive: false });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [characters, completeIntro, isDismissed]);

  useEffect(() => {
    if (!isComplete || isDismissed) {
      return undefined;
    }

    if (prefersReducedMotionRef.current) {
      return undefined;
    }

    const selectedCharacter = revealedCharacters.find(({ id }) => id === selectedCharacterId) ?? null;

    if (!selectedCharacter) {
      triggerComplete();
      return undefined;
    }

    const viewportWidth = window.innerWidth || 1;
    const viewportHeight = window.innerHeight || 1;
    const aspectRatio = viewportHeight / viewportWidth;
    const letterSize = Math.min(Math.max(viewportWidth * 0.07, 52), 144);
    // Animating SVG's viewBox keeps the typography vector-sharp throughout the dive.
    const targetWidth = Math.max(letterSize * 0.035, 3);
    const initialCamera: CameraViewport = { x: 0, y: 0, width: viewportWidth, height: viewportHeight };
    const targetCamera: CameraViewport = {
      x: selectedCharacter.x - targetWidth / 2,
      y: selectedCharacter.y - (targetWidth * aspectRatio) / 2,
      width: targetWidth,
      height: targetWidth * aspectRatio,
    };

    const startTime = performance.now() + INTRO_PAUSE_DURATION;

    const frame = (now: number) => {
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.min(elapsed / INTRO_CAMERA_DURATION, 1);
      const eased = easeCinematic(progress);
      setTransitionProgress(progress);
      setCamera({
        x: initialCamera.x + (targetCamera.x - initialCamera.x) * eased,
        y: initialCamera.y + (targetCamera.y - initialCamera.y) * eased,
        width: initialCamera.width + (targetCamera.width - initialCamera.width) * eased,
        height: initialCamera.height + (targetCamera.height - initialCamera.height) * eased,
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      if (!dismissedRef.current) {
        triggerComplete();
      }
    };

    animationFrameRef.current = requestAnimationFrame(frame);

    const completionTimer = window.setTimeout(() => {
      if (!dismissedRef.current) {
        triggerComplete();
      }
    }, INTRO_PAUSE_DURATION + INTRO_CAMERA_DURATION + 40);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.clearTimeout(completionTimer);
    };
  }, [isComplete, isDismissed, revealedCharacters, selectedCharacterId, triggerComplete]);

  const selectedCharacter = revealedCharacters.find(({ id }) => id === selectedCharacterId) ?? null;
  const viewportWidth = typeof window === 'undefined' ? 1 : window.innerWidth || 1;
  const viewportHeight = typeof window === 'undefined' ? 1 : window.innerHeight || 1;
  const letterSize = Math.min(Math.max(viewportWidth * 0.07, 52), 144);
  const viewBox = camera
    ? `${camera.x} ${camera.y} ${camera.width} ${camera.height}`
    : `0 0 ${viewportWidth} ${viewportHeight}`;
  const blackContinuationOpacity = Math.max(0, Math.min(1, (transitionProgress - 0.78) / 0.22));

  return (
    <div
      className={['intro-screen', isComplete ? 'intro-screen--revealing' : '', isDismissed ? 'intro-screen--hidden' : '']
        .filter(Boolean)
        .join(' ')}
      aria-hidden={isDismissed}
    >
      <svg className="intro-assembly" viewBox={viewBox} aria-label={artistName} role="img">
        {revealedCharacters.map((character) => (
          <text
            key={`${character.id}-${character.char}`}
            className={[
              'intro-character',
              character.char === ' ' ? 'intro-character--space' : '',
              character.id === selectedCharacterId ? 'intro-character--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            x={character.x}
            y={character.y}
            fontSize={letterSize}
            aria-hidden={character.char === ' '}
          >
            {character.char}
          </text>
        ))}
      </svg>
      {selectedCharacter && (
        <svg className="intro-dive-silhouette" viewBox={viewBox} aria-hidden="true">
          <text
            className="intro-dive-character"
            x={selectedCharacter.x}
            y={selectedCharacter.y}
            fontSize={letterSize}
          >
            {selectedCharacter.char}
          </text>
        </svg>
      )}
      <div className="intro-black-continuation" style={{ opacity: blackContinuationOpacity }} aria-hidden="true" />
    </div>
  );
}
