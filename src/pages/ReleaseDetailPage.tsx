import { Link, useParams } from 'react-router-dom';
import { mockReleases } from '../data/mock';
import { useAudioPlayer } from '../features/audio-player/AudioPlayerProvider';
import { publicRoutes } from '../config/routes';

export function ReleaseDetailPage() {
  const { id } = useParams();
  const release = mockReleases.find((item) => item.slug === id) ?? mockReleases[0];
  const { setQueue, playTrack } = useAudioPlayer();

  const queue = (release.tracks ?? []).map((track) => ({
    id: `${release.id}-${track.id}`,
    releaseId: release.id,
    trackId: track.id,
    title: track.title,
    audioUrl: track.audio_url,
    artworkUrl: release.artwork_url,
    releaseTitle: release.title,
    duration: track.duration,
  }));

  const handlePlayTrack = (trackIndex: number) => {
    setQueue(queue);
    playTrack(queue[trackIndex]);
  };

  return (
    <div className="page-section release-detail">
      <div className="detail-header">
        <div className="detail-cover">
          <img src={release.artwork_url ?? ''} alt={release.title} />
        </div>

        <div className="detail-copy">
          <p className="eyebrow">{release.type}</p>
          <h1>{release.title}</h1>
          <p className="detail-date">
            {new Date(release.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p>{release.description}</p>

          <div className="detail-actions">
            <button type="button" className="button primary" onClick={() => handlePlayTrack(0)}>
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
          {(release.tracks ?? []).map((track, index) => (
            <li key={track.id} className="track-row">
              <button type="button" className="track-play" onClick={() => handlePlayTrack(index)} aria-label={`Play ${track.title}`}>
                ▶
              </button>
              <div className="track-info">
                <span className="track-index">{String(index + 1).padStart(2, '0')}</span>
                <span>{track.title}</span>
              </div>
              <span>{formatTime(track.duration)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}
