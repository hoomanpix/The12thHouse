import { Link, useParams } from 'react-router-dom';
import { useCatalog } from '../features/catalog/CatalogProvider';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { publicRoutes } from '../config/routes';

export function ReleaseDetailPage() {
  const { id } = useParams();
  const { releases, recordPlay } = useCatalog();
  const release = releases.find((item) => item.slug === id) ?? releases[0];
  const { setQueue, playTrack } = useAudioPlayer();
  if (!release) return <div className="page-section"><p className="admin-empty">Release not found.</p></div>;

  const handlePlayTrack = (trackIndex: number) => {
    const selected = (release.tracks ?? [])[trackIndex];
    if (!selected || selected.published === false || !selected.audio_url || release.status === 'upcoming') return;
    const queue = (release.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url)).map((track) => ({ id: `${release.id}-${track.id}`, releaseId: release.id, trackId: track.id, title: track.title, audioUrl: track.audio_url, artworkUrl: release.artwork_url, releaseTitle: release.title, duration: track.duration }));
    const active = queue.find((item) => item.trackId === selected.id) ?? queue[0];
    if (!active) return;
    setQueue(queue); recordPlay(release.id, active.trackId); playTrack(active);
  };
  const hasPlayableTrack = release.status !== 'upcoming' && (release.tracks ?? []).some((track) => track.published !== false && Boolean(track.audio_url));
  const availableLinks = (release.platform_links ?? []).filter((platform) => platform.url.trim());

  return (
    <div className="page-section release-detail editorial-detail">
      <header className="detail-header"><div className="detail-cover music-cover"><img src={release.artwork_url ?? ''} alt={release.title} /></div><div className="detail-copy"><p className="eyebrow">{release.status === 'upcoming' ? 'upcoming' : release.type} / {release.release_date.slice(0, 4)}</p><h1>{release.title}</h1><p>{release.description}</p><div className="detail-actions"><button type="button" className="button primary" onClick={() => handlePlayTrack((release.tracks ?? []).findIndex((track) => track.published !== false && Boolean(track.audio_url)))} disabled={!hasPlayableTrack}>Play release</button><Link to={publicRoutes.releases} className="text-link">Back to archive</Link></div>{availableLinks.length > 0 && <ul className="platform-list" aria-label="Listen on streaming platforms">{availableLinks.map((platform) => <li key={platform.id}><a href={platform.url} target="_blank" rel="noreferrer">{platform.label}</a></li>)}</ul>}</div></header>
      <section className="tracklist-block"><div className="section-heading"><p className="eyebrow">Tracklist / {String((release.tracks ?? []).length).padStart(2, '0')} tracks</p><h2>Listen carefully</h2></div><ol className="tracklist">{(release.tracks ?? []).map((track, index) => { const playable = release.status !== 'upcoming' && track.published !== false && Boolean(track.audio_url); return <li key={track.id} className={`track-row ${playable ? '' : 'track-row--disabled'}`}><button type="button" className="track-play" onClick={() => handlePlayTrack(index)} aria-label={`Play ${track.title}`} disabled={!playable}>{playable ? '▶' : '•'}</button><div className="track-info"><span className="track-index">{String(index + 1).padStart(2, '0')}</span><span>{track.title}</span></div><span>{formatTime(track.duration)}</span></li>; })}</ol></section>
    </div>
  );
}
function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }
