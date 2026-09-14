import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

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

const CHARACTER_SPACING = 42;
const BASE_REVEAL_DISTANCE = 42;

const safeScrollToTop = () => {
  try {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  } catch {
    // ignore unsupported browser scroll implementations during tests or restricted environments
  }
};

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [revealedCharacters, setRevealedCharacters] = useState<IntroCharacter[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);

  const characters = useMemo(() => artistName.toUpperCase().split(''), [artistName]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const accumulatorRef = useRef(0);
  const revealedCountRef = useRef(0);
  const dismissedRef = useRef(false);

  const completeIntro = () => {
    if (dismissedRef.current || isComplete) {
      return;
    }

    const drawableCharacters = characters
      .map((char, index) => ({ char, index }))
      .filter(({ char }) => char.trim().length > 0);
    const randomCharacter =
      drawableCharacters[Math.floor(Math.random() * drawableCharacters.length)] ?? drawableCharacters[0];

    setSelectedCharacterId(randomCharacter?.index ?? null);
    setIsComplete(true);
  };

  useEffect(() => {
    if (!isComplete || isDismissed) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      dismissedRef.current = true;
      setIsDismissed(true);
      onComplete?.();
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [isComplete, isDismissed, onComplete]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      safeScrollToTop();
    };
  }, []);

  useEffect(() => {
    if (isDismissed) {
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
        completeIntro();
        return;
      }

      const directionX = safeDeltaX || (clientX - lastPoint.x) || 1;
      const directionY = safeDeltaY || (clientY - lastPoint.y) || 0;
      const angle = Math.atan2(directionY, directionX);
      const offset = nextIndex * CHARACTER_SPACING;
      const x = clientX + Math.cos(angle) * offset;
      const y = clientY + Math.sin(angle) * offset;

      setRevealedCharacters((previous) => [...previous, { id: nextIndex, char: characters[nextIndex], x, y }]);
      revealedCountRef.current += 1;
      accumulatorRef.current = 0;

      if (revealedCountRef.current >= characters.length) {
        completeIntro();
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
  }, [characters, isDismissed, completeIntro]);

  const selectedCharacter = revealedCharacters.find(({ id }) => id === selectedCharacterId);
  const screenStyle = {
    '--reveal-x': `${selectedCharacter?.x ?? window.innerWidth / 2}px`,
    '--reveal-y': `${selectedCharacter?.y ?? window.innerHeight / 2}px`,
  } as CSSProperties;

  return (
    <div
      className={[
        'intro-screen',
        isComplete ? 'intro-screen--revealing' : '',
        isDismissed ? 'intro-screen--hidden' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={screenStyle}
      aria-hidden={isDismissed}
    >
      <div className="intro-assembly" aria-label={artistName}>
        {revealedCharacters.map((character) => (
          <span
            key={`${character.id}-${character.char}`}
            className={[
              'intro-character',
              character.char === ' ' ? 'intro-character--space' : '',
              character.id === selectedCharacterId ? 'intro-character--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${character.x}px`,
              top: `${character.y}px`,
            }}
            aria-hidden={character.char === ' '}
          >
            {character.char}
          </span>
        ))}
      </div>
    </div>
  );
}
