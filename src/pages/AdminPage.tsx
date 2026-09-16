import { useMemo, useState } from 'react';
import { useCatalog } from '../features/catalog/CatalogProvider';
import type { PlatformType } from '../types';

const platformOptions: Array<{ value: PlatformType; label: string }> = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'apple_music', label: 'Apple Music' },
  { value: 'youtube_music', label: 'YouTube Music' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'tidal', label: 'Tidal' },
  { value: 'deezer', label: 'Deezer' },
  { value: 'bandcamp', label: 'Bandcamp' },
  { value: 'custom', label: 'Custom link' },
];

export function AdminPage() {
  const {
    releases,
    addTrack,
    removeTrack,
    updateTrack,
    addPlatformLink,
    updatePlatformLink,
    removePlatformLink,
    updateRelease,
    resetCatalog,
  } = useCatalog();
  const [selectedReleaseId, setSelectedReleaseId] = useState(releases[0]?.id ?? '');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newLinkPlatform, setNewLinkPlatform] = useState<PlatformType>('spotify');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const selectedRelease = releases.find((release) => release.id === selectedReleaseId) ?? releases[0];
  const tracks = selectedRelease?.tracks ?? [];
  const totalPlays = useMemo(
    () => releases.reduce((total, release) => total + (release.tracks ?? []).reduce((sum, track) => sum + (track.play_count ?? 0), 0), 0),
    [releases],
  );
  const playableTracks = releases.reduce(
    (total, release) => total + (release.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url)).length,
    0,
  );

  if (!selectedRelease) {
    return <p className="admin-empty">No releases are available yet.</p>;
  }

  const addNewTrack = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTrackTitle.trim();
    if (!title) return;
    addTrack(selectedRelease.id, {
      title,
      audio_url: newTrackUrl.trim() || null,
      duration: 0,
      published: Boolean(newTrackUrl.trim()),
      play_count: 0,
    });
    setNewTrackTitle('');
    setNewTrackUrl('');
  };

  const addNewLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = newLinkUrl.trim();
    if (!url) return;
    addPlatformLink(selectedRelease.id, {
      platform: newLinkPlatform,
      label: platformOptions.find((option) => option.value === newLinkPlatform)?.label ?? 'Platform',
      url,
    });
    setNewLinkUrl('');
  };

  return (
    <div className="page-section admin-page">
      <div className="section-heading split">
        <div>
          <p className="eyebrow">Artist studio</p>
          <h1>Control room</h1>
          <p className="admin-intro">A simple place to manage what listeners see and hear.</p>
        </div>
        <label className="admin-release-picker">
          <span className="eyebrow">Managing release</span>
          <select value={selectedRelease.id} onChange={(event) => setSelectedReleaseId(event.target.value)}>
            {releases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-stats" aria-label="Artist statistics">
        <div className="admin-stat"><span>Total plays</span><strong>{totalPlays.toLocaleString()}</strong></div>
        <div className="admin-stat"><span>Playable tracks</span><strong>{playableTracks}</strong></div>
        <div className="admin-stat"><span>Published releases</span><strong>{releases.filter((release) => release.published).length}</strong></div>
      </div>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Track manager</p>
            <h2>{selectedRelease.title}</h2>
          </div>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={selectedRelease.published}
              onChange={(event) => updateRelease(selectedRelease.id, { published: event.target.checked })}
            />
            <span>Visible on site</span>
          </label>
        </div>

        <div className="admin-track-list">
          {tracks.map((track) => {
            const isPlayable = track.published !== false && Boolean(track.audio_url);
            return (
              <div className="admin-track-row" key={track.id}>
                <div className="admin-track-copy">
                  <strong>{track.title}</strong>
                  <span>{track.play_count ?? 0} plays · {track.audio_url ? 'Audio uploaded' : 'No audio file'}</span>
                </div>
                <label className="admin-toggle admin-toggle--small">
                  <input
                    type="checkbox"
                    checked={isPlayable}
                    disabled={!track.audio_url}
                    onChange={(event) => updateTrack(selectedRelease.id, track.id, { published: event.target.checked })}
                  />
                  <span>{isPlayable ? 'Playable' : 'Hidden'}</span>
                </label>
                <button type="button" className="button text-button" onClick={() => removeTrack(selectedRelease.id, track.id)}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        <form className="admin-inline-form" onSubmit={addNewTrack}>
          <input value={newTrackTitle} onChange={(event) => setNewTrackTitle(event.target.value)} placeholder="Track title" aria-label="New track title" required />
          <input value={newTrackUrl} onChange={(event) => setNewTrackUrl(event.target.value)} placeholder="Audio URL (optional)" aria-label="Audio URL" type="url" />
          <button type="submit" className="button primary">Add track</button>
        </form>
        <p className="admin-help">A track becomes playable only when it has an audio URL and is switched on.</p>
      </section>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Where to listen</p>
            <h2>Platform links</h2>
          </div>
        </div>
        <div className="admin-link-list">
          {(selectedRelease.platform_links ?? []).map((link) => (
            <div className="admin-link-row" key={link.id}>
              <select
                value={link.platform}
                onChange={(event) => {
                  const platform = event.target.value as PlatformType;
                  updatePlatformLink(selectedRelease.id, link.id, {
                    platform,
                    label: platformOptions.find((option) => option.value === platform)?.label ?? 'Platform',
                  });
                }}
              >
                {platformOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input value={link.url} onChange={(event) => updatePlatformLink(selectedRelease.id, link.id, { url: event.target.value })} aria-label={`${link.label} URL`} type="url" />
              <button type="button" className="button text-button" onClick={() => removePlatformLink(selectedRelease.id, link.id)}>Remove</button>
            </div>
          ))}
        </div>
        <form className="admin-inline-form" onSubmit={addNewLink}>
          <select value={newLinkPlatform} onChange={(event) => setNewLinkPlatform(event.target.value as PlatformType)} aria-label="Platform">
            {platformOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input value={newLinkUrl} onChange={(event) => setNewLinkUrl(event.target.value)} placeholder="https://..." aria-label="New platform URL" type="url" required />
          <button type="submit" className="button primary">Add link</button>
        </form>
      </section>

      <div className="admin-footer-actions">
        <button type="button" className="button secondary" onClick={() => resetCatalog()}>Reset demo data</button>
        <span>Changes are saved in this browser.</span>
      </div>
    </div>
  );
}
