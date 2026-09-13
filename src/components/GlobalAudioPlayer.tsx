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
  const artistName = activeTrack?.releaseTitle ?? 'Sable Arcade';
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
            {state.isPlaying ? '❚❚' : '▶'}
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
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        <div className="player-detail" aria-hidden={!isExpanded}>
          <div className="player-detail__topbar">
            <span className="eyebrow">Now playing</span>
            <button
              type="button"
              className="player-button player-button--ghost"
              aria-label="Collapse player"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded(false)}
            >
              Close
            </button>
          </div>

          <div className="player-detail__content">
            <div className="player-detail__artwork">
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
                  onChange={(event) => seek(Number(event.target.value))}
                />
                <span>-{formatTime(remainingTime)}</span>
              </div>

              <div className="player-detail__controls">
                <button type="button" className="player-button player-button--wide" onClick={playPrevious} aria-label="Previous track">
                  ⏮
                </button>
                <button
                  type="button"
                  className="player-button player-button--primary player-button--wide"
                  onClick={togglePlay}
                  aria-label={state.isPlaying ? 'Pause' : 'Play'}
                >
                  {state.isPlaying ? '❚❚' : '▶'}
                </button>
                <button type="button" className="player-button player-button--wide" onClick={playNext} aria-label="Next track">
                  ⏭
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

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}
