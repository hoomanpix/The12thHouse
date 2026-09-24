import { useMemo, useState } from 'react';
import { useCatalog } from '../features/catalog/CatalogProvider';
import type { PlatformType, Release, ReleaseContentType } from '../types';

const platformOptions: Array<{ value: PlatformType; label: string }> = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'apple_music', label: 'Apple Music' },
  { value: 'youtube_music', label: 'YouTube Music' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'bandcamp', label: 'Bandcamp' },
  { value: 'custom', label: 'Custom link' },
];

function readFileAsDataUrl(file: File, onRead: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.addEventListener('load', () => onRead(String(reader.result ?? '')));
  reader.readAsDataURL(file);
}

function emptyRelease(title: string, type: 'single' | 'album', contentType: ReleaseContentType): Omit<Release, 'id' | 'created_at' | 'updated_at'> {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `release-${Date.now()}`;
  return {
    artist_id: 'artist-1', title, slug, type, contentType, visualType: contentType === 'visual' ? 'cover' : undefined,
    release_date: new Date().toISOString().slice(0, 10), description: '', artwork_url: null,
    featured: false, published: false, tracks: [], platform_links: [],
  };
}

export function AdminPage() {
  const {
    releases, homeCardIds, addRelease, updateHomeCard, updateRelease, addTrack, removeTrack, updateTrack,
    addPlatformLink, updatePlatformLink, removePlatformLink, resetCatalog,
  } = useCatalog();
  const [selectedReleaseId, setSelectedReleaseId] = useState(releases[0]?.id ?? '');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackFile, setNewTrackFile] = useState<string | null>(null);
  const [newLinkPlatform, setNewLinkPlatform] = useState<PlatformType>('spotify');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newReleaseTitle, setNewReleaseTitle] = useState('');
  const [newReleaseType, setNewReleaseType] = useState<'single' | 'album'>('single');
  const [newReleaseContent, setNewReleaseContent] = useState<ReleaseContentType>('music');
  const [newReleaseDate, setNewReleaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [newReleaseDescription, setNewReleaseDescription] = useState('');
  const [newReleaseArtwork, setNewReleaseArtwork] = useState<string | null>(null);
  const [newReleaseTrackTitle, setNewReleaseTrackTitle] = useState('');
  const [newReleaseAudio, setNewReleaseAudio] = useState<string | null>(null);

  const selectedRelease = releases.find((release) => release.id === selectedReleaseId) ?? releases[0];
  const totalPlays = useMemo(() => releases.reduce((total, release) => total + (release.tracks ?? []).reduce((sum, track) => sum + (track.play_count ?? 0), 0), 0), [releases]);
  const playableTracks = releases.reduce((total, release) => total + (release.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url)).length, 0);
  const visibleReleases = releases.filter((release) => release.published);

  if (!selectedRelease) return <p className="admin-empty">No releases are available yet.</p>;

  const updateArtwork = (file: File | undefined) => {
    if (file) readFileAsDataUrl(file, (artwork_url) => updateRelease(selectedRelease.id, { artwork_url }));
  };

  const addNewTrack = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTrackTitle.trim();
    if (!title) return;
    addTrack(selectedRelease.id, { title, audio_url: newTrackFile ?? (newTrackUrl.trim() || null), duration: 0, published: Boolean(newTrackFile || newTrackUrl.trim()), play_count: 0 });
    setNewTrackTitle(''); setNewTrackUrl(''); setNewTrackFile(null);
  };

  const addNewLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = newLinkUrl.trim();
    if (!url) return;
    addPlatformLink(selectedRelease.id, { platform: newLinkPlatform, label: platformOptions.find((option) => option.value === newLinkPlatform)?.label ?? 'Platform', url });
    setNewLinkUrl('');
  };

  const createRelease = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newReleaseTitle.trim();
    if (!title) return;
    const draft = emptyRelease(title, newReleaseType, newReleaseContent);
    const releaseId = addRelease({
      ...draft,
      release_date: newReleaseDate,
      description: newReleaseDescription.trim(),
      artwork_url: newReleaseArtwork,
      tracks: newReleaseTrackTitle.trim() ? [{ id: `track-${Date.now() + 1}`, release_id: '', title: newReleaseTrackTitle.trim(), audio_url: newReleaseAudio, duration: 0, published: Boolean(newReleaseAudio), play_count: 0, order: 1 }] : [],
    });
    setSelectedReleaseId(releaseId);
    setNewReleaseTitle(''); setNewReleaseDate(new Date().toISOString().slice(0, 10)); setNewReleaseDescription(''); setNewReleaseArtwork(null); setNewReleaseTrackTitle(''); setNewReleaseAudio(null);
  };

  return (
    <div className="page-section admin-page">
      <div className="section-heading split">
        <div><p className="eyebrow">Independent content administration</p><h1>Control room</h1><p className="admin-intro">Manage releases, audio, visuals, platform links and the three featured cards on Home.</p></div>
        <label className="admin-release-picker"><span className="eyebrow">Editing release</span><select value={selectedRelease.id} onChange={(event) => setSelectedReleaseId(event.target.value)}>{releases.map((release) => <option key={release.id} value={release.id}>{release.title}</option>)}</select></label>
      </div>

      <div className="admin-stats" aria-label="Catalog statistics">
        <div className="admin-stat"><span>Total plays</span><strong>{totalPlays.toLocaleString()}</strong></div>
        <div className="admin-stat"><span>Playable tracks</span><strong>{playableTracks}</strong></div>
        <div className="admin-stat"><span>Published releases</span><strong>{visibleReleases.length}</strong></div>
      </div>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading"><div><p className="eyebrow">Catalog</p><h2>Add a single, album or visual</h2></div></div>
        <form className="admin-grid-form admin-new-release-form" onSubmit={createRelease}>
          <label>Title<input value={newReleaseTitle} onChange={(event) => setNewReleaseTitle(event.target.value)} placeholder="Release title" aria-label="Release title" required /></label>
          <label>Release date<input type="date" value={newReleaseDate} onChange={(event) => setNewReleaseDate(event.target.value)} aria-label="Release date" required /></label>
          <label>Type<select value={newReleaseType} onChange={(event) => setNewReleaseType(event.target.value as 'single' | 'album')} aria-label="Release type"><option value="single">Single</option><option value="album">Album</option></select></label>
          <label>Content<select value={newReleaseContent} onChange={(event) => setNewReleaseContent(event.target.value as ReleaseContentType)} aria-label="Content type"><option value="music">Music</option><option value="visual">Visual</option></select></label>
          <label className="admin-file-input">{newReleaseArtwork ? 'Cover selected' : 'Upload cover'}<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFileAsDataUrl(file, setNewReleaseArtwork); }} /></label>
          <label>Description<textarea value={newReleaseDescription} onChange={(event) => setNewReleaseDescription(event.target.value)} placeholder="Release description" rows={2} /></label>
          <label>First track title<input value={newReleaseTrackTitle} onChange={(event) => setNewReleaseTrackTitle(event.target.value)} placeholder="Optional for visual releases" /></label>
          <label className="admin-file-input">{newReleaseAudio ? 'Audio selected' : 'Upload first audio file'}<input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFileAsDataUrl(file, setNewReleaseAudio); }} /></label>
          <button type="submit" className="button primary">Create release</button>
        </form>
        <p className="admin-help">اثر جدید همراه با تاریخ انتشار، کاور و در صورت انتخاب، اولین فایل صوتی ساخته می‌شود. برای آلبوم می‌توانید ترک‌های بعدی را در Audio manager اضافه کنید.</p>
      </section>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading"><div><p className="eyebrow">Home layout</p><h2>Choose the three featured cards</h2></div></div>
        <div className="admin-home-card-grid">
          {[0, 1, 2].map((slot) => <label className="admin-home-card-slot" key={slot}><span>Card {slot + 1} · {slot === 2 ? 'Album / visual' : 'Featured work'}</span><select value={homeCardIds[slot] ?? ''} onChange={(event) => updateHomeCard(slot, event.target.value)}><option value="">Automatic selection</option>{visibleReleases.map((release) => <option key={release.id} value={release.id}>{release.title} · {release.type}</option>)}</select></label>)}
        </div>
        <p className="admin-help">The selected title, description, release date and cover are read directly from each release and appear on Home.</p>
      </section>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading"><div><p className="eyebrow">Release settings</p><h2>{selectedRelease.title}</h2></div><label className="admin-toggle"><input type="checkbox" checked={selectedRelease.published} onChange={(event) => updateRelease(selectedRelease.id, { published: event.target.checked })} /><span>Published on site</span></label></div>
        <div className="admin-edit-grid">
          <label>Title<input value={selectedRelease.title} onChange={(event) => updateRelease(selectedRelease.id, { title: event.target.value })} /></label>
          <label>Release date<input type="date" value={selectedRelease.release_date} onChange={(event) => updateRelease(selectedRelease.id, { release_date: event.target.value })} /></label>
          <label>Content type<select value={selectedRelease.contentType} onChange={(event) => updateRelease(selectedRelease.id, { contentType: event.target.value as ReleaseContentType })}><option value="music">Music</option><option value="visual">Visual</option></select></label>
          <label>Artwork URL<input value={selectedRelease.artwork_url?.startsWith('data:') ? '' : selectedRelease.artwork_url ?? ''} onChange={(event) => updateRelease(selectedRelease.id, { artwork_url: event.target.value || null })} placeholder="https://..." /></label>
          <label className="admin-file-input">{selectedRelease.artwork_url?.startsWith('data:') ? 'Uploaded artwork' : 'Upload artwork'}<input type="file" accept="image/*" onChange={(event) => updateArtwork(event.target.files?.[0])} /></label>
          <label className="admin-toggle"><input type="checkbox" checked={selectedRelease.featured} onChange={(event) => updateRelease(selectedRelease.id, { featured: event.target.checked })} /><span>Featured/latest release</span></label>
        </div>
        <label className="admin-textarea-label">Description<textarea value={selectedRelease.description} onChange={(event) => updateRelease(selectedRelease.id, { description: event.target.value })} rows={3} /></label>
      </section>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading"><div><p className="eyebrow">Audio manager</p><h2>{selectedRelease.type === 'album' ? 'Album tracks' : 'Single track'}</h2></div></div>
        <div className="admin-track-list">{(selectedRelease.tracks ?? []).map((track) => { const isPlayable = track.published !== false && Boolean(track.audio_url); return <div className="admin-track-row" key={track.id}><div className="admin-track-copy"><strong>{track.title}</strong><span>{track.play_count ?? 0} plays · {track.audio_url ? 'Audio ready' : 'No audio file'}</span></div><label className="admin-toggle admin-toggle--small"><input type="checkbox" checked={isPlayable} disabled={!track.audio_url} onChange={(event) => updateTrack(selectedRelease.id, track.id, { published: event.target.checked })} /><span>{isPlayable ? 'Playable' : 'Hidden'}</span></label><label className="admin-file-input admin-file-input--compact">Replace audio<input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFileAsDataUrl(file, (audio_url) => updateTrack(selectedRelease.id, track.id, { audio_url, published: true })); }} /></label><button type="button" className="button text-button" onClick={() => removeTrack(selectedRelease.id, track.id)}>Remove</button></div>; })}</div>
        <form className="admin-inline-form admin-track-form" onSubmit={addNewTrack}><input value={newTrackTitle} onChange={(event) => setNewTrackTitle(event.target.value)} placeholder="Track title" aria-label="New track title" required /><input value={newTrackUrl} onChange={(event) => setNewTrackUrl(event.target.value)} placeholder="Audio URL (optional)" aria-label="Audio URL" type="url" /><label className="admin-file-input">{newTrackFile ? 'Audio selected' : 'Upload audio'}<input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFileAsDataUrl(file, setNewTrackFile); }} /></label><button type="submit" className="button primary">Add track</button></form>
        <p className="admin-help">A track is playable only when audio exists and its Playable switch is on.</p>
      </section>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading"><div><p className="eyebrow">Distribution</p><h2>Where to listen</h2></div></div>
        <div className="admin-link-list">{(selectedRelease.platform_links ?? []).map((link) => <div className="admin-link-row" key={link.id}><select value={link.platform} onChange={(event) => { const platform = event.target.value as PlatformType; updatePlatformLink(selectedRelease.id, link.id, { platform, label: platformOptions.find((option) => option.value === platform)?.label ?? 'Platform' }); }}>{platformOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><input value={link.url} onChange={(event) => updatePlatformLink(selectedRelease.id, link.id, { url: event.target.value })} aria-label={`${link.label} URL`} type="url" /><button type="button" className="button text-button" onClick={() => removePlatformLink(selectedRelease.id, link.id)}>Remove</button></div>)}</div>
        <form className="admin-inline-form" onSubmit={addNewLink}><select value={newLinkPlatform} onChange={(event) => setNewLinkPlatform(event.target.value as PlatformType)} aria-label="Platform">{platformOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><input value={newLinkUrl} onChange={(event) => setNewLinkUrl(event.target.value)} placeholder="https://..." aria-label="New platform URL" type="url" required /><button type="submit" className="button primary">Add link</button></form>
      </section>

      <div className="admin-footer-actions"><button type="button" className="button secondary" onClick={() => resetCatalog()}>Reset demo data</button><span>Admin changes are saved in this browser.</span></div>
    </div>
  );
}
