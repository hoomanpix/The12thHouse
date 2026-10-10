import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ReleaseArtwork } from '../components/ReleaseArtwork';
import { VisualAnimationPlayer } from '../components/VisualAnimationPlayer';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { recordPlatformLinkClick } from '../features/analytics/analytics';
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
  const navigate = useNavigate();
  const { releases, isReady, catalogError } = useCatalog();
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
          const duration = audio.duration;
          if (!cancelled && Number.isFinite(duration) && duration > 0) {
            setTrackDurations((current) => ({ ...current, [track.id]: duration }));
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
  const artworkUrl = release.artwork_url?.trim() || null;
  const visualUrl = release.visual_url?.trim() || null;
  const hasAnimationVideo = !isMusic && release.visualType === 'animation' && Boolean(visualUrl);
  const artworkKindLabel = isMusic ? 'Music' : release.visualType === 'animation' ? 'Visual animation' : 'Visual cover';
  const detailHeaderClassName = hasAnimationVideo ? 'detail-header detail-header--video' : isMusic ? 'detail-header' : 'detail-header detail-header--visual-cover';
  const detailCoverClassName = hasAnimationVideo
    ? 'detail-cover detail-cover--video'
    : isMusic
      ? 'detail-cover detail-cover--music'
      : release.visualType === 'animation'
        ? 'detail-cover detail-cover--animation-poster'
        : 'detail-cover detail-cover--visual-cover';
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
    setQueue(filteredQueue); playTrack(activeTrack);
  };
  return <div className="page-section release-detail">
    <div className={detailHeaderClassName}>
      <div className={detailCoverClassName}>
        {hasAnimationVideo && visualUrl
          ? <VisualAnimationPlayer src={visualUrl} poster={artworkUrl} title={release.title} />
          : artworkUrl
            ? <button type="button" className="detail-cover-button" onClick={() => setIsCoverOpen(true)} aria-label={`View ${release.title} artwork full size`}><ReleaseArtwork src={artworkUrl} title={release.title} kindLabel={artworkKindLabel} alt="" imageClassName="detail-cover-artwork" placeholderClassName="detail-cover-artwork-fallback" /></button>
            : <ReleaseArtwork src={null} title={release.title} kindLabel={artworkKindLabel} alt="" imageClassName="detail-cover-artwork" placeholderClassName="detail-cover-artwork-fallback" />}
      </div>
      <div className="detail-copy"><p className="eyebrow">{releaseTypeLabel(release)}</p><h1>{release.title}</h1><p className="detail-date">{isUpcoming(release) ? `Coming soon · ${formatReleaseDate(shouldShowReleaseDate(release) ? release.release_date : null)}` : formatReleaseDate(shouldShowReleaseDate(release) ? release.release_date : null)}</p><p>{release.description}</p>
        <div className="detail-actions">{isMusic && <button type="button" className="button primary" onClick={() => { const firstPlayable = playableTracks[0]; if (firstPlayable) handlePlayTrack((release.tracks ?? []).findIndex((track) => track.id === firstPlayable.id)); }} disabled={playableTracks.length === 0}>Play {release.type === 'album' ? 'album' : 'single'}</button>}<button type="button" className="button secondary" onClick={() => navigate(-1)}>Back</button></div>
        {isMusic && (release.platform_links ?? []).length > 0 && <ul className="platform-list">{(release.platform_links ?? []).map((platform) => <li key={platform.id}><a href={platform.url} target="_blank" rel="noreferrer" onClick={() => { void recordPlatformLinkClick(platform.id); }}>{platform.label}</a></li>)}</ul>}
      </div>
    </div>
    {isMusic && <section className="tracklist-block"><div className="section-heading"><p className="eyebrow">Tracklist</p><h2>{release.title}</h2></div><ol className="tracklist">{(release.tracks ?? []).map((track, index) => { const playable = isPlayableTrack(track, release); return <li key={track.id} className={`track-row ${playable ? '' : 'track-row--disabled'}`}><button type="button" className="track-play" onClick={() => handlePlayTrack(index)} aria-label={`Play ${track.title}`} disabled={!playable}>{playable ? '▶' : '•'}</button><div className="track-info"><span className="track-index">{String(index + 1).padStart(2, '0')}</span><span>{track.title}</span></div><span>{formatMediaDuration(trackDurations[track.id]) ?? '—:—'}</span></li>; })}</ol></section>}
    {isCoverOpen && artworkUrl && <div className="cover-lightbox" role="dialog" aria-modal="true" aria-labelledby="cover-lightbox-title"><button type="button" className="cover-lightbox__backdrop" aria-label="Close artwork viewer" onClick={() => setIsCoverOpen(false)} /><div className="cover-lightbox__content"><div id="cover-lightbox-title" className="visually-hidden">Full-size artwork for {release.title}</div><ReleaseArtwork src={artworkUrl} title={release.title} kindLabel={artworkKindLabel} alt={release.title} imageClassName="cover-lightbox__artwork" placeholderClassName="cover-lightbox__artwork-fallback" loading="eager" /><button type="button" className="button secondary cover-lightbox__close" onClick={() => setIsCoverOpen(false)}>Close</button></div></div>}
  </div>;
}
