import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { publicRoutes } from '../config/routes';
import { formatReleaseDate, isUpcoming, shouldShowReleaseDate } from '../lib/releaseStatus';
import { visualMediaKind } from '../lib/media';

export function ReleaseDetailPage() {
  const { id } = useParams();
  const { releases } = useCatalog();
  const release = releases.find((item) => item.slug === id);
  const { setQueue, playTrack } = useAudioPlayer();
  const { recordPlay } = useCatalog();
  const [isArtworkOpen, setIsArtworkOpen] = useState(false);
  const [mediaPlaybackError, setMediaPlaybackError] = useState(false);
  useEffect(() => {
    if (!isArtworkOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsArtworkOpen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isArtworkOpen]);
  if (!release) return <div className="page-section"><p className="release-empty">Release not found.</p></div>;

  const playableTracks = (release.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url));
  const queue = playableTracks.map((track) => ({
    id: `${release.id}-${track.id}`,
    releaseId: release.id,
    trackId: track.id,
    title: track.title,
    audioUrl: track.audio_url,
    playable: true,
    artworkUrl: release.artwork_url,
    releaseTitle: release.title,
    duration: track.duration,
  }));

  const handlePlayTrack = (trackIndex: number) => {
    const nextTrack = (release.tracks ?? [])[trackIndex];
    if (!nextTrack || nextTrack.published === false || !nextTrack.audio_url) {
      return;
    }

    const filteredQueue = (release.tracks ?? [])
      .filter((track) => track.published !== false && Boolean(track.audio_url))
      .map((track) => ({
        id: `${release.id}-${track.id}`,
        releaseId: release.id,
        trackId: track.id,
        title: track.title,
        audioUrl: track.audio_url,
        playable: true,
        artworkUrl: release.artwork_url,
        releaseTitle: release.title,
        duration: track.duration,
      }));

    const activeTrack = filteredQueue.find((item) => item.trackId === nextTrack.id) ?? filteredQueue[0];
    if (!activeTrack) {
      return;
    }

    setQueue(filteredQueue);
    recordPlay(release.id, activeTrack.trackId);
    playTrack(activeTrack);
  };

  return (
    <div className="page-section release-detail">
      <div className="detail-header">
        <div className={`detail-cover ${release.artwork_url ? 'detail-cover--interactive' : ''}`}>
          {release.artwork_url && <button type="button" className="detail-cover__zoom" onClick={() => setIsArtworkOpen(true)} aria-label={`Open ${release.title} artwork`}>
            <span aria-hidden="true">View artwork</span>
          </button>}
          {release.contentType === 'visual' && release.visual_url ? (
            visualMediaKind(release.visual_url) === 'image' ? (
              <img src={release.visual_url} alt={release.title} />
            ) : (
              <>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={release.artwork_url ?? undefined}
                  aria-label={release.title}
                  src={release.visual_url}
                  onLoadedData={() => setMediaPlaybackError(false)}
                  onError={() => setMediaPlaybackError(true)}
                />
                {mediaPlaybackError && <p className="media-playback-error" role="alert">
                  This original animation format could not be played by this browser. The original file is preserved; <a href={release.visual_url} target="_blank" rel="noreferrer">open the original file</a> in an app or browser with native codec support.
                </p>}
              </>
            )
          ) : (
            <img src={release.artwork_url ?? ''} alt={release.title} />
          )}
        </div>

        <div className="detail-copy">
          <p className="eyebrow">{release.type}</p>
          <h1>{release.title}</h1>
          <p className="detail-date">
            {isUpcoming(release) ? `Coming soon · ${formatReleaseDate(shouldShowReleaseDate(release) ? release.release_date : null)}` : formatReleaseDate(shouldShowReleaseDate(release) ? release.release_date : null)}
          </p>
          <p>{release.description}</p>

          <div className="detail-actions">
            <button
              type="button"
              className="button primary"
              onClick={() => {
                const firstPlayable = (release.tracks ?? []).find((track) => track.published !== false && Boolean(track.audio_url));
                if (!firstPlayable) return;
                handlePlayTrack((release.tracks ?? []).findIndex((track) => track.id === firstPlayable.id));
              }}
              disabled={(release.tracks ?? []).every((track) => track.published === false || !track.audio_url)}
            >
              Play album
            </button>
            <Link to={publicRoutes.releases} className="button secondary">
              Back to releases
            </Link>
          </div>

          <ul className="platform-list">
            {(release.platform_links ?? []).map((platform) => (
              <li key={platform.id}>
                <a href={platform.url} target="_blank" rel="noreferrer">
                  {platform.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="tracklist-block">
        <div className="section-heading">
          <p className="eyebrow">Tracklist</p>
          <h2>{release.title}</h2>
        </div>

        <ol className="tracklist">
          {(release.tracks ?? []).map((track, index) => {
            const isPlayable = track.published !== false && Boolean(track.audio_url);

            return (
              <li key={track.id} className={`track-row ${isPlayable ? '' : 'track-row--disabled'}`}>
                <button
                  type="button"
                  className="track-play"
                  onClick={() => handlePlayTrack(index)}
                  aria-label={`Play ${track.title}`}
                  disabled={!isPlayable}
                >
                  {isPlayable ? '▶' : '•'}
                </button>
                <div className="track-info">
                  <span className="track-index">{String(index + 1).padStart(2, '0')}</span>
                  <span>{track.title}</span>
                </div>
                <span>{formatTime(track.duration)}</span>
              </li>
            );
          })}
        </ol>
      </section>
      {isArtworkOpen && release.artwork_url && <div className="artwork-lightbox" role="dialog" aria-modal="true" aria-label={`${release.title} artwork`} onClick={() => setIsArtworkOpen(false)}>
        <button type="button" className="artwork-lightbox__close" onClick={() => setIsArtworkOpen(false)} aria-label="Close artwork">Close</button>
        <img src={release.artwork_url} alt={release.title} onClick={(event) => event.stopPropagation()} />
      </div>}
    </div>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}
