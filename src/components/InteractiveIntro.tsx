import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

export interface InteractiveIntroProps { artistName: string; onComplete?: () => void; }
type IntroCharacter = { id: number; char: string; x: number; y: number; angle: number; delay: number };
const MIN_PLACEMENT_DISTANCE = 54;
const COMPLETION_PAUSE_DURATION = 2667;
const FADE_DURATION = 1067;

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [revealedCharacters, setRevealedCharacters] = useState<IntroCharacter[]>([]);
  const displayName = useMemo(() => artistName.trim().split(/\s+/).map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join(' '), [artistName]);
  const characters = useMemo(() => displayName.split(''), [displayName]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pathDistanceRef = useRef(0);
  const revealedCountRef = useRef(0);
  const dismissedRef = useRef(false);
  const completionStartedRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);

  const triggerComplete = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setIsDismissed(true);
    onComplete?.();
  }, [onComplete]);

  const completeIntro = useCallback(() => {
    if (completionStartedRef.current || dismissedRef.current) return;
    completionStartedRef.current = true;
    setIsComplete(true);
  }, []);

  useEffect(() => {
    prefersReducedMotionRef.current = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  }, []);

  useEffect(() => {
    if (!isComplete || isDismissed) return undefined;
    if (prefersReducedMotionRef.current) {
      const timer = window.setTimeout(triggerComplete, 160);
      return () => window.clearTimeout(timer);
    }
    const fadeTimer = window.setTimeout(() => setIsFading(true), COMPLETION_PAUSE_DURATION);
    const completionTimer = window.setTimeout(triggerComplete, COMPLETION_PAUSE_DURATION + FADE_DURATION);
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(completionTimer); };
  }, [isComplete, isDismissed, triggerComplete]);

  useEffect(() => {
    if (isDismissed || isComplete) return undefined;

    const handleMotion = (clientX: number, clientY: number, deltaX: number, deltaY: number) => {
      if (dismissedRef.current || revealedCountRef.current >= characters.length) return;
      const previous = pointerRef.current;
      if (!previous) {
        pointerRef.current = { x: clientX, y: clientY };
        return;
      }

      const segmentX = Number.isFinite(deltaX) && Math.abs(deltaX) > 0.1 ? deltaX : clientX - previous.x;
      const segmentY = Number.isFinite(deltaY) && Math.abs(deltaY) > 0.1 ? deltaY : clientY - previous.y;
      const segmentDistance = Math.hypot(segmentX, segmentY);
      const velocity = {
        x: velocityRef.current.x * 0.72 + segmentX * 0.28,
        y: velocityRef.current.y * 0.72 + segmentY * 0.28,
      };
      velocityRef.current = velocity;
      let angle = Math.atan2(velocity.y, velocity.x);
      if (angle > Math.PI / 2) angle -= Math.PI;
      if (angle < -Math.PI / 2) angle += Math.PI;
      pointerRef.current = { x: clientX, y: clientY };
      if (segmentDistance <= 0.1) return;

      const newCharacters: IntroCharacter[] = [];
      let consumed = 0;
      while (pathDistanceRef.current + segmentDistance - consumed >= MIN_PLACEMENT_DISTANCE && revealedCountRef.current < characters.length) {
        const distanceToPlacement = MIN_PLACEMENT_DISTANCE - pathDistanceRef.current;
        consumed += distanceToPlacement;
        const ratio = Math.min(1, consumed / segmentDistance);
        const x = previous.x + segmentX * ratio;
        const y = previous.y + segmentY * ratio;
        newCharacters.push({
          id: revealedCountRef.current,
          char: characters[revealedCountRef.current],
          x,
          y,
          angle,
          delay: newCharacters.length * 28,
        });
        revealedCountRef.current += 1;
        pathDistanceRef.current = 0;
      }
      pathDistanceRef.current += segmentDistance - consumed;
      if (newCharacters.length > 0) setRevealedCharacters((current) => [...current, ...newCharacters]);
      if (revealedCountRef.current >= characters.length) completeIntro();
    };

    const handlePointerMove = (event: PointerEvent) => handleMotion(event.clientX, event.clientY, event.movementX, event.movementY);
    const handleMouseMoveFallback = (event: MouseEvent) => handleMotion(event.clientX, event.clientY, event.movementX, event.movementY);
    const handleWheel = (event: WheelEvent) => handleMotion(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2, event.deltaX, event.deltaY);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) return;
      handleMotion(touch.clientX, touch.clientY, touch.clientX - (pointerRef.current?.x ?? touch.clientX), touch.clientY - (pointerRef.current?.y ?? touch.clientY));
    };

    window.addEventListener('pointermove', handlePointerMove);
    if (typeof window.PointerEvent === 'undefined') window.addEventListener('mousemove', handleMouseMoveFallback);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMoveFallback);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [characters, completeIntro, isComplete, isDismissed]);

  return <div className={['intro-screen', isFading ? 'intro-screen--fading' : '', isDismissed ? 'intro-screen--hidden' : ''].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-label={`${displayName} intro`} aria-hidden={isDismissed}>
    <div className="intro-assembly" aria-hidden="true">{revealedCharacters.map((character) => { const characterStyle: CSSProperties = { left: `${character.x}px`, top: `${character.y}px`, transform: `translate(-50%, -50%) rotate(${character.angle}rad)`, '--intro-delay': `${character.delay}ms` } as CSSProperties; return <span key={`${character.id}-${character.char}`} className={['intro-character', character.char === ' ' ? 'intro-character--space' : ''].filter(Boolean).join(' ')} style={characterStyle}>{character.char}</span>; })}</div>
  </div>;
}
