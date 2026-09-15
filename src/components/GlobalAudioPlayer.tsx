import { useEffect, useMemo, useState } from 'react';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';

export function GlobalAudioPlayer() {
  const { state, togglePlay, playPrevious, playNext, seek, setVolume } = useAudioPlayer();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeTrack = useMemo(
    () => state.queue.find((item) => item.trackId === state.activeTrackId) ?? state.queue[0] ?? null,
    [state.activeTrackId, state.queue],
  );

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const trackTitle = activeTrack?.title ?? 'No track selected';
  const artistName = activeTrack?.releaseTitle ?? 'Artist';
  const remainingTime = Math.max(state.duration - state.currentTime, 0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  return (
    <div className={`global-player ${isExpanded ? 'is-expanded' : ''}`} aria-live="polite">
      <div className="player-shell">
        <div
          className="player-strip"
          aria-label={isExpanded ? 'Collapse audio player' : 'Expand audio player'}
          onClick={() => setIsExpanded((current) => (current ? current : true))}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsExpanded((current) => !current);
            }
          }}
        >
          <button
            type="button"
            className="player-button player-button--primary"
            onClick={(event) => {
              event.stopPropagation();
              togglePlay();
            }}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            <PlayerIcon name={state.isPlaying ? 'pause' : 'play'} />
          </button>

          <div className="player-strip__meta">
            <span className="player-strip__title">{trackTitle}</span>
            <span className="player-strip__artist">{artistName}</span>
          </div>

          <div className="player-strip__progress" aria-hidden="true">
            <span className="player-strip__progress-bar" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>

          <button
            type="button"
            className="player-button player-button--compact"
            aria-label={isExpanded ? 'Collapse player' : 'Expand player'}
            aria-expanded={isExpanded}
            onClick={(event) => {
              event.stopPropagation();
              setIsExpanded((current) => !current);
            }}
          >
            <PlayerIcon name={isExpanded ? 'minus' : 'plus'} />
          </button>
        </div>

        <div className="player-detail" aria-hidden={!isExpanded}>
          <div className="player-detail__topbar">
            <span className="eyebrow">Now playing</span>
          </div>

          <div className="player-detail__content">
            <div className="player-detail__artwork music-cover">
              {activeTrack?.artworkUrl ? (
                <img src={activeTrack.artworkUrl} alt={activeTrack.releaseTitle} />
              ) : (
                <div className="artwork-placeholder" aria-hidden="true" />
              )}
            </div>

            <div className="player-detail__meta">
              <div className="player-detail__heading">
                <p className="eyebrow">Track</p>
                <h3>{trackTitle}</h3>
                <span>{artistName}</span>
              </div>

              <div className="player-progress-block">
                <span>{formatTime(state.currentTime)}</span>
                <input
                  aria-label="Seek audio"
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255, 255, 255, 0.22) ${progress}%)` }}
                  onChange={(event) => seek(Number(event.target.value))}
                />
                <span>-{formatTime(remainingTime)}</span>
              </div>

              <div className="player-detail__controls">
                <button type="button" className="player-button player-button--wide" onClick={playPrevious} aria-label="Previous track">
                  <PlayerIcon name="previous" />
                </button>
                <button
                  type="button"
                  className="player-button player-button--primary player-button--wide"
                  onClick={togglePlay}
                  aria-label={state.isPlaying ? 'Pause' : 'Play'}
                >
                  <PlayerIcon name={state.isPlaying ? 'pause' : 'play'} />
                </button>
                <button type="button" className="player-button player-button--wide" onClick={playNext} aria-label="Next track">
                  <PlayerIcon name="next" />
                </button>
              </div>

              <div className="player-volume">
                <label htmlFor="volume-control">Volume</label>
                <input
                  id="volume-control"
                  aria-label="Volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={state.volume}
                  style={{ background: `linear-gradient(to right, #fff ${state.volume * 100}%, rgba(255, 255, 255, 0.22) ${state.volume * 100}%)` }}
                  onChange={(event) => setVolume(Number(event.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type PlayerIconName = 'play' | 'pause' | 'previous' | 'next' | 'plus' | 'minus';

function PlayerIcon({ name }: { name: PlayerIconName }) {
  const paths = {
    play: <path d="M8 5.2v13.6L19 12 8 5.2Z" />,
    pause: (
      <>
        <path d="M7 5.5h3.5v13H7z" />
        <path d="M13.5 5.5H17v13h-3.5z" />
      </>
    ),
    previous: (
      <>
        <path d="M6.5 5.5v13" />
        <path d="m18 6-8 6 8 6V6Z" />
      </>
    ),
    next: (
      <>
        <path d="M17.5 5.5v13" />
        <path d="m6 6 8 6-8 6V6Z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    minus: <path d="M5 12h14" />,
  };

  return (
    <svg
      className={`player-icon player-icon--${name}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}
