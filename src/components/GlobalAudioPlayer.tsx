import { useEffect, useMemo, useState } from 'react';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { formatMediaDuration } from '../features/audio-player/duration';

export function GlobalAudioPlayer() {
  const { state, togglePlay, playPrevious, playNext, seek, setVolume, toggleMute } = useAudioPlayer();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeTrack = useMemo(
    () => state.queue.find((item) => item.trackId === state.activeTrackId) ?? state.queue[0] ?? null,
    [state.activeTrackId, state.queue],
  );

  const hasDuration = Number.isFinite(state.duration) && state.duration > 0;
  const progress = hasDuration ? Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100)) : 0;
  const trackTitle = activeTrack?.title ?? 'No track selected';
  const artistName = activeTrack?.releaseTitle ?? 'The12thHouse';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) setIsExpanded(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  return (
    <div className={`global-player ${isExpanded ? 'is-expanded' : ''}`}>
      <div className="player-shell">
        <div className="player-strip">
          <div className="player-strip__cover-frame" aria-hidden="true">
            {activeTrack?.artworkUrl
              ? <img className="player-strip__cover" src={activeTrack.artworkUrl} alt="" />
              : <span className="player-strip__cover player-strip__cover--empty" />}
          </div>
          <div className="player-strip__meta"><span className="player-strip__title">{trackTitle}</span><span className="player-strip__artist">{artistName}</span></div>
          <div className="player-strip__progress" aria-hidden="true"><span className="player-strip__progress-bar" style={{ width: `${progress}%` }} /></div>
          <button type="button" className="player-button player-button--compact" aria-label={isExpanded ? 'Collapse player' : 'Expand player'} aria-expanded={isExpanded} onClick={() => setIsExpanded((current) => !current)}><PlayerIcon name={isExpanded ? 'minus' : 'plus'} /></button>
        </div>
        {isExpanded && <div className="player-detail">
          <div className="player-detail__topbar"><span className="eyebrow">Now playing</span></div>
          <div className="player-detail__content">
            <div className="player-detail__artwork">
              {activeTrack?.artworkUrl ? <img src={activeTrack.artworkUrl} alt={activeTrack.releaseTitle} /> : <div className="artwork-placeholder" aria-hidden="true" />}
            </div>
            <div className="player-detail__meta">
              <div className="player-detail__heading"><p className="eyebrow">Track</p><h3>{trackTitle}</h3><span>{artistName}</span></div>
              <div className="player-progress-block">
                <span>{formatMediaDuration(state.currentTime) ?? '0:00'}</span>
                <input aria-label="Seek audio" type="range" min={0} max={100} value={progress} disabled={!hasDuration} onChange={(event) => seek(Number(event.target.value))} />
                <span>{hasDuration ? formatMediaDuration(state.duration) ?? '—:—' : '—:—'}</span>
              </div>
              <div className="player-detail__controls">
                <button type="button" className="player-button player-button--wide" onClick={playPrevious} aria-label="Previous track" title="Previous track"><span className="player-emoji" aria-hidden="true">⏮️</span><PlayerIcon name="previous" /></button>
                <button type="button" className="player-button player-button--primary player-button--wide" onClick={togglePlay} aria-label={state.isPlaying ? 'Pause' : 'Play'} title={state.isPlaying ? 'Pause' : 'Play'}><span className="player-emoji" aria-hidden="true">{state.isPlaying ? '⏸️' : '▶️'}</span><PlayerIcon name={state.isPlaying ? 'pause' : 'play'} /></button>
                <button type="button" className="player-button player-button--wide" onClick={playNext} aria-label="Next track" title="Next track"><span className="player-emoji" aria-hidden="true">⏭️</span><PlayerIcon name="next" /></button>
              </div>
              <div className="player-volume">
                <div className="player-volume__controls">
                  <label htmlFor="volume-control">Web player volume</label>
                  <input id="volume-control" aria-label="Web player volume" type="range" min={0} max={1} step={0.01} value={state.volume} disabled={state.volumeSupportKnown && !state.volumeSupported} onChange={(event) => setVolume(Number(event.target.value))} />
                  <button type="button" className="player-volume__mute" aria-label={state.isMuted ? 'Unmute audio' : 'Mute audio'} aria-pressed={state.isMuted} onClick={toggleMute}>{state.isMuted ? 'Unmute' : 'Mute'}</button>
                </div>
                {state.volumeSupportKnown && !state.volumeSupported && <p className="player-volume__note" role="status">Per-player volume adjustment is unavailable in this browser; device volume is controlled by the operating system. Mute here only mutes audio.</p>}
              </div>
            </div>
          </div>
          {state.error && <p className="player-error" role="status">{state.error}</p>}
        </div>}
      </div>
    </div>
  );
}

type PlayerIconName = 'play' | 'pause' | 'previous' | 'next' | 'plus' | 'minus';
function PlayerIcon({ name }: { name: PlayerIconName }) {
  const paths = {
    play: <path d="M8 5.2v13.6L19 12 8 5.2Z" />,
    pause: <><path d="M7 5.5h3.5v13H7z" /><path d="M13.5 5.5H17v13h-3.5z" /></>,
    previous: <><path d="M6.5 5.5v13" /><path d="m18 6-8 6 8 6V6Z" /></>,
    next: <><path d="M17.5 5.5v13" /><path d="m6 6 8 6-8 6V6Z" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
  };
  return <svg className={`player-icon player-icon--${name}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
