import { useEffect, useRef, useState } from 'react';
import { ReleaseArtwork } from './ReleaseArtwork';

interface VisualAnimationPlayerProps {
  src: string;
  poster?: string | null;
  title: string;
}

type WebKitVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
  webkitDisplayingFullscreen?: boolean;
};

function readReducedMotionPreference() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function VisualAnimationPlayer({ src, poster, title }: VisualAnimationPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPausedRef = useRef(false);
  const source = typeof src === 'string' ? src.trim() : '';
  const posterSource = typeof poster === 'string' ? poster.trim() : '';
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(readReducedMotionPreference);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasVideoFrame, setHasVideoFrame] = useState(false);
  const [metadataRatio, setMetadataRatio] = useState<{ source: string; ratio: string } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const hasPlaybackError = !source || failedSource === source;
  const aspectRatio = metadataRatio?.source === source ? metadataRatio.ratio : undefined;

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!preference) return undefined;
    const handlePreferenceChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
      const video = videoRef.current;
      if (event.matches) {
        video?.pause();
        setIsPlaying(false);
      } else if (video && !userPausedRef.current) {
        void video.play().catch(() => setStatusMessage('Playback could not start. Use Play animation to try again.'));
      }
    };
    setPrefersReducedMotion(preference.matches);
    preference.addEventListener?.('change', handlePreferenceChange);
    return () => preference.removeEventListener?.('change', handlePreferenceChange);
  }, []);

  useEffect(() => {
    setHasVideoFrame(false);
  }, [source]);

  useEffect(() => {
    const video = videoRef.current;
    if (!source || hasPlaybackError || prefersReducedMotion || !video || !video.paused) return;
    void video.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatusMessage('Autoplay was blocked. Use Play animation to start playback.');
    });
  }, [source, prefersReducedMotion, hasPlaybackError]);

  useEffect(() => {
    const video = videoRef.current as WebKitVideoElement | null;
    if (!video) return undefined;
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current || video.webkitDisplayingFullscreen === true);
    };
    const handleWebKitEnter = () => setIsFullscreen(true);
    const handleWebKitExit = () => setIsFullscreen(false);
    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);
    video.addEventListener('webkitbeginfullscreen', handleWebKitEnter);
    video.addEventListener('webkitendfullscreen', handleWebKitExit);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
      video.removeEventListener('webkitbeginfullscreen', handleWebKitEnter);
      video.removeEventListener('webkitendfullscreen', handleWebKitExit);
    };
  }, [source, hasPlaybackError]);

  const handleTogglePlayback = () => {
    const video = videoRef.current;
    if (!video || hasPlaybackError) return;
    if (video.paused) {
      userPausedRef.current = false;
      setStatusMessage('');
      void video.play().catch(() => setStatusMessage('Playback could not start. Check the video format or try again.'));
    } else {
      userPausedRef.current = true;
      video.pause();
      setIsPlaying(false);
      setStatusMessage('');
    }
  };

  const handleFullscreen = async () => {
    const player = playerRef.current;
    const video = videoRef.current as WebKitVideoElement | null;
    if (!player || !video) return;

    const exitWebKitFullscreen = () => {
      if (video.webkitDisplayingFullscreen && video.webkitExitFullscreen) {
        video.webkitExitFullscreen();
        setIsFullscreen(false);
        return true;
      }
      return false;
    };

    if (document.fullscreenElement === player && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch {
        setStatusMessage('The browser could not exit full-screen mode.');
      }
      return;
    }
    if (isFullscreen && exitWebKitFullscreen()) return;

    const enterWebKitFullscreen = () => {
      if (!video.webkitEnterFullscreen || video.webkitSupportsFullscreen === false) return false;
      try {
        video.webkitEnterFullscreen();
        setIsFullscreen(true);
        setStatusMessage('');
        return true;
      } catch {
        return false;
      }
    };

    if (player.requestFullscreen && document.fullscreenEnabled !== false) {
      try {
        await player.requestFullscreen();
        setIsFullscreen(true);
        setStatusMessage('');
        return;
      } catch {
        if (enterWebKitFullscreen()) return;
      }
    } else if (enterWebKitFullscreen()) {
      return;
    }

    setStatusMessage('Full-screen playback is not available in this browser.');
  };

  return (
    <div ref={playerRef} className="visual-animation-player">
      <div className="visual-animation-player__stage">
        {!hasPlaybackError && !posterSource && !hasVideoFrame && (
          <div className="visual-animation-player__loading" aria-hidden="true">
            {prefersReducedMotion ? 'Animation paused' : 'Loading animation…'}
          </div>
        )}
        {hasPlaybackError ? (
          <ReleaseArtwork
            src={posterSource || null}
            title={title}
            kindLabel="Visual animation"
            alt=""
            imageClassName="visual-animation-player__poster-fallback"
            placeholderClassName="visual-animation-player__poster-placeholder"
          />
        ) : (
          <video
            ref={videoRef}
            className="detail-media"
            src={source}
            poster={posterSource || undefined}
            style={aspectRatio ? { aspectRatio } : undefined}
            autoPlay={!prefersReducedMotion}
            muted
            loop
            preload="metadata"
            playsInline
            controls={false}
            aria-label={`${title} animation`}
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.currentTarget;
              if (videoWidth > 0 && videoHeight > 0) {
                setMetadataRatio({ source, ratio: `${videoWidth} / ${videoHeight}` });
              }
            }}
            onLoadedData={() => { setHasVideoFrame(true); setStatusMessage(''); }}
            onPlay={() => { setIsPlaying(true); setStatusMessage(''); }}
            onPause={() => setIsPlaying(false)}
            onError={() => { setFailedSource(source); setIsPlaying(false); setStatusMessage('This animation could not be played. Showing its artwork instead.'); }}
          />
        )}
      </div>
      <div className="visual-animation-player__controls" role="group" aria-label="Animation controls">
        {!hasPlaybackError && (
          <button
            type="button"
            className="visual-animation-player__button"
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            aria-pressed={isPlaying}
            onClick={handleTogglePlayback}
          >
            {isPlaying ? 'Pause animation' : 'Play animation'}
          </button>
        )}
        <button
          type="button"
          className="visual-animation-player__button visual-animation-player__fullscreen"
          aria-label="Watching Full Screen"
          aria-pressed={isFullscreen}
          onClick={() => void handleFullscreen()}
          disabled={hasPlaybackError}
        >
          Watching Full Screen
        </button>
      </div>
      {statusMessage && <p className="visual-animation-player__status" role="status" aria-live="polite">{statusMessage}</p>}
    </div>
  );
}
