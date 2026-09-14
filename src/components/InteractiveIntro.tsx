import { useEffect, useMemo, useState } from 'react';

export interface InteractiveIntroProps {
  artistName: string;
  onComplete?: () => void;
}

function buildIntroCharacters(artistName: string) {
  return artistName.toUpperCase().split('').map((character, index) => ({
    character,
    isSpace: character === ' ',
    delay: index * 120,
  }));
}

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const characters = useMemo(() => buildIntroCharacters(artistName), [artistName]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setReducedMotion(false);
      return undefined;
    }

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
      setIsReady(true);
      return;
    }

    const timer = window.setTimeout(() => setIsReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  const handleComplete = () => {
    if (!isReady || isDismissed) {
      return;
    }

    setIsDismissed(true);
    onComplete?.();
  };

  useEffect(() => {
    const handleCommit = () => {
      handleComplete();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleComplete();
      }
    };

    window.addEventListener('click', handleCommit, { passive: true });
    window.addEventListener('touchend', handleCommit, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleCommit);
      window.removeEventListener('touchend', handleCommit);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReady, isDismissed, onComplete]);

  return (
    <div className={isDismissed ? 'intro-screen intro-screen--hidden' : 'intro-screen'} aria-hidden={isDismissed}>
      <div className="intro-assembly" aria-label={artistName}>
        {characters.map((character, index) => {
          const isVisible = isReady && !character.isSpace;

          return (
            <span
              key={`${character.character}-${index}`}
              className={`intro-character ${character.isSpace ? 'intro-character--space' : ''} ${isVisible ? 'is-visible' : ''}`}
              style={{
                transitionDelay: reducedMotion ? '0ms' : `${character.delay}ms`,
              }}
              aria-hidden={character.isSpace}
            >
              {character.isSpace ? ' ' : character.character}
            </span>
          );
        })}
      </div>
    </div>
  );
}
