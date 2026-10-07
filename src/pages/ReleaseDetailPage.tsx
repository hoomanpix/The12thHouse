import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { isPlayableTrack } from '../features/audio-player/queue';
import { publicRoutes } from '../config/routes';
import { formatReleaseDate, isUpcoming, shouldShowReleaseDate } from '../lib/releaseStatus';
import { releaseTypeLabel } from '../lib/releaseSemantics';
import { formatMediaDuration } from '../features/audio-player/duration';

const MAX_CONCURRENT_DURATION_PROBES = 3;
const DURATION_PROBE_TIMEOUT_MS = 15_000;

export function ReleaseDetailPage() {
  const { id } = useParams();
  const { releases, recordPlay, isReady, catalogError } = useCatalog();
  const { setQueue, playTrack } = useAudioPlayer();
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [trackDurations, setTrackDurations] = useState<Record<string, number>>({});
  const release = releases.find((item) => item.slug === id);
  useEffect(() => {
    if (!isCoverOpen) return undefined;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsCoverOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', close); };
  }, [isCoverOpen]);
  useEffect(() => {
    if (!release || release.contentType !== 'music') { setTrackDurations({}); return undefined; }
    let cancelled = false;
    const playableTracks = (release.tracks ?? []).filter((track) => isPlayableTrack(track, release) && typeof track.audio_url === 'string' && Boolean(track.audio_url));
    let nextTrackIndex = 0;
    type DurationProbe = { audio: HTMLAudioElement; onMetadata: () => void; onError: () => void; timeoutId: number | null };
    const activeProbes = new Set<DurationProbe>();
    setTrackDurations({});
    const startNextProbes = () => {
      while (!cancelled && activeProbes.size < MAX_CONCURRENT_DURATION_PROBES && nextTrackIndex < playableTracks.length) {
        const track = playableTracks[nextTrackIndex++];
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        let probe: DurationProbe;
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          if (probe.timeoutId !== null) window.clearTimeout(probe.timeoutId);
          audio.removeEventListener('loadedmetadata', onMetadata);
          audio.removeEventListener('error', onError);
          audio.removeAttribute('src');
          audio.load();
          activeProbes.delete(probe);
          if (!cancelled) startNextProbes();
        };
        const onMetadata = () => {
          if (!cancelled && Number.isFinite(audio.duration) && audio.duration >= 0) {
            setTrackDurations((current) => ({ ...current, [track.id]: audio.duration }));
          }
          finish();
        };
        const onError = () => finish();
        probe = { audio, onMetadata, onError, timeoutId: null };
        activeProbes.add(probe);
        audio.addEventListener('loadedmetadata', onMetadata);
        audio.addEventListener('error', onError);
        probe.timeoutId = window.setTimeout(finish, DURATION_PROBE_TIMEOUT_MS);
        audio.src = track.audio_url as string;
        audio.load();
      }
    };
    startNextProbes();
    return () => {
      cancelled = true;
      for (const { audio, onMetadata, onError, timeoutId } of activeProbes) {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        audio.removeEventListener('loadedmetadata', onMetadata);
        audio.removeEventListener('error', onError);
        audio.removeAttribute('src');
        audio.load();
      }
      activeProbes.clear();
    };
  }, [release?.contentType, release?.id, release?.tracks]);
  if (!isReady) return <div className="page-section"><p className="release-empty" role="status">Loading release…</p></div>;
  if (catalogError) return <div className="page-section"><p className="release-empty" role="alert">Release catalog unavailable. Please try again later.</p></div>;
  if (!release) return <div className="page-section"><p className="release-empty" role="status">Release not found.</p><Link to={publicRoutes.releases} className="button secondary">Back to releases</Link></div>;
  const isMusic = release.contentType === 'music';
  const playableTracks = isMusic ? (release.tracks ?? []).filter((track) => isPlayableTrack(track, release)) : [];
  const handlePlayTrack = (trackIndex: number) => {
    if (!isMusic) return;
    const nextTrack = (release.tracks ?? [])[trackIndex];
    if (!nextTrack || !isPlayableTrack(nextTrack, release)) return;
    const filteredQueue = (release.tracks ?? []).filter((track) => isPlayableTrack(track, release)).map((track) => ({
      id: `${release.id}-${track.id}`, releaseId: release.id, trackId: track.id, title: track.title, audioUrl: track.audio_url,
      audioReference: track.audio_reference ?? null, artworkUrl: release.artwork_url, releaseTitle: release.title,
    }));
    const activeTrack = filteredQueue.find((item) => item.trackId === nextTrack.id);
    if (!activeTrack) return;
    setQueue(filteredQueue); recordPlay(release.id, activeTrack.trackId); playTrack(activeTrack);
  };
  return <div className="page-section release-detail">
    <div className="detail-header">
      <div className="detail-cover">
        {release.contentType === 'visual' && release.visual_url ? <video className="detail-media" src={release.visual_url} poster={release.artwork_url ?? undefined} controls playsInline aria-label={`${release.title} animation`} /> : release.artwork_url ? <button type="button" className="detail-cover-button" onClick={() => setIsCoverOpen(true)} aria-label={`View ${release.title} artwork full size`}><img src={release.artwork_url} alt={release.title} /></button> : <div className="release-cover--placeholder" aria-label={`${release.title} has no artwork yet`}><span>{release.contentType}</span><strong>{release.title}</strong></div>}
      </div>
      <div className="detail-copy"><p className="eyebrow">{releaseTypeLabel(release)}</p><h1>{release.title}</h1><p className="detail-date">{isUpcoming(release) ? `Coming soon · ${formatReleaseDate(shouldShowReleaseDate(release) ? release.release_date : null)}` : formatReleaseDate(shouldShowReleaseDate(release) ? release.release_date : null)}</p><p>{release.description}</p>
        <div className="detail-actions">{isMusic && <button type="button" className="button primary" onClick={() => { const firstPlayable = playableTracks[0]; if (firstPlayable) handlePlayTrack((release.tracks ?? []).findIndex((track) => track.id === firstPlayable.id)); }} disabled={playableTracks.length === 0}>Play {release.type === 'album' ? 'album' : 'single'}</button>}<Link to={publicRoutes.releases} className="button secondary">Back to releases</Link></div>
        {isMusic && (release.platform_links ?? []).length > 0 && <ul className="platform-list">{(release.platform_links ?? []).map((platform) => <li key={platform.id}><a href={platform.url} target="_blank" rel="noreferrer">{platform.label}</a></li>)}</ul>}
      </div>
    </div>
    {isMusic && <section className="tracklist-block"><div className="section-heading"><p className="eyebrow">Tracklist</p><h2>{release.title}</h2></div><ol className="tracklist">{(release.tracks ?? []).map((track, index) => { const playable = isPlayableTrack(track, release); return <li key={track.id} className={`track-row ${playable ? '' : 'track-row--disabled'}`}><button type="button" className="track-play" onClick={() => handlePlayTrack(index)} aria-label={`Play ${track.title}`} disabled={!playable}>{playable ? '▶' : '•'}</button><div className="track-info"><span className="track-index">{String(index + 1).padStart(2, '0')}</span><span>{track.title}</span></div><span>{formatMediaDuration(trackDurations[track.id]) ?? '—:—'}</span></li>; })}</ol></section>}
    {isCoverOpen && release.artwork_url && <div className="cover-lightbox" role="dialog" aria-modal="true" aria-labelledby="cover-lightbox-title"><button type="button" className="cover-lightbox__backdrop" aria-label="Close artwork viewer" onClick={() => setIsCoverOpen(false)} /><div className="cover-lightbox__content"><div id="cover-lightbox-title" className="visually-hidden">Full-size artwork for {release.title}</div><img src={release.artwork_url} alt={release.title} /><button type="button" className="button secondary cover-lightbox__close" onClick={() => setIsCoverOpen(false)}>Close</button></div></div>}
  </div>;
}
