import { useMemo } from 'react';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';

export function GlobalAudioPlayer() {
  const { state, togglePlay, playPrevious, playNext, seek, setVolume } = useAudioPlayer();

  const activeTrack = useMemo(
    () => state.queue.find((item) => item.trackId === state.activeTrackId) ?? state.queue[0] ?? null,
    [state.activeTrackId, state.queue],
  );

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className="global-player" aria-live="polite">
      <div className="player-artwork">
        {activeTrack?.artworkUrl ? <img src={activeTrack.artworkUrl} alt={activeTrack.releaseTitle} /> : <div className="artwork-placeholder" />}
      </div>

      <div className="player-meta">
        <span className="eyebrow">Now playing</span>
        <strong>{activeTrack?.title ?? 'No track selected'}</strong>
        <span>{activeTrack?.releaseTitle ?? 'Select a release'}</span>
      </div>

      <div className="player-controls">
        <div className="transport-row">
          <button type="button" className="player-button" onClick={playPrevious} aria-label="Previous track">
            ⏮
          </button>
          <button type="button" className="player-button primary" onClick={togglePlay} aria-label={state.isPlaying ? 'Pause' : 'Play'}>
            {state.isPlaying ? '❚❚' : '▶'}
          </button>
          <button type="button" className="player-button" onClick={playNext} aria-label="Next track">
            ⏭
          </button>
        </div>

        <div className="progress-block">
          <span>{formatTime(state.currentTime)}</span>
          <input
            aria-label="Seek audio"
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <span>{formatTime(state.duration)}</span>
        </div>
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
