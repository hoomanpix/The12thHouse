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

const approvedAdminEmail = 'kamielkhajehpour@gmail.com';

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
    releases, upcomingReleases, homeCardIds, addRelease, addUpcomingRelease, updateUpcomingRelease, publishUpcomingRelease, removeUpcomingRelease, updateHomeCard, updateRelease, addTrack, removeTrack, updateTrack,
    addPlatformLink, updatePlatformLink, removePlatformLink, resetCatalog,
    user, isReady, isRemote, isRecoveringPassword, signIn, signUp, resetPassword, updatePassword, signOut,
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
  const [comingSoonTitle, setComingSoonTitle] = useState('');
  const [comingSoonContent, setComingSoonContent] = useState<ReleaseContentType>('music');
  const [comingSoonType, setComingSoonType] = useState<'single' | 'album'>('single');
  const [comingSoonDate, setComingSoonDate] = useState(new Date().toISOString().slice(0, 10));
  const [comingSoonDescription, setComingSoonDescription] = useState('');
  const [comingSoonArtwork, setComingSoonArtwork] = useState<string | null>(null);
  const [comingSoonTrackCount, setComingSoonTrackCount] = useState(1);
  const [comingSoonTrackNames, setComingSoonTrackNames] = useState<string[]>(['']);
  const [comingSoonVisualType, setComingSoonVisualType] = useState<'cover' | 'animation'>('cover');
  const [comingSoonVisualFile, setComingSoonVisualFile] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'upcoming' | 'new'>('upcoming');
  const [uploadUpcomingId, setUploadUpcomingId] = useState('');
  const [directTrackCount, setDirectTrackCount] = useState(1);
  const [directTrackNames, setDirectTrackNames] = useState<string[]>(['']);
  const [directTrackFiles, setDirectTrackFiles] = useState<Array<string | null>>([null]);
  const [directTitle, setDirectTitle] = useState('');
  const [directContent, setDirectContent] = useState<ReleaseContentType>('music');
  const [directType, setDirectType] = useState<'single' | 'album'>('single');
  const [directDate, setDirectDate] = useState(new Date().toISOString().slice(0, 10));
  const [directDescription, setDirectDescription] = useState('');
  const [directArtwork, setDirectArtwork] = useState<string | null>(null);
  const [directVisualType, setDirectVisualType] = useState<'cover' | 'animation'>('cover');
  const [directVisualFile, setDirectVisualFile] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authError, setAuthError] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const selectedRelease = releases.find((release) => release.id === selectedReleaseId) ?? releases[0];
  const totalPlays = useMemo(() => releases.reduce((total, release) => total + (release.tracks ?? []).reduce((sum, track) => sum + (track.play_count ?? 0), 0), 0), [releases]);
  const playableTracks = releases.reduce((total, release) => total + (release.tracks ?? []).filter((track) => track.published !== false && Boolean(track.audio_url)).length, 0);
  const visibleReleases = releases.filter((release) => release.published);

  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    if (authMode === 'signup' && authEmail.trim().toLowerCase() !== approvedAdminEmail) {
      setAuthError(`Only ${approvedAdminEmail} can create the artist account.`);
      return;
    }
    const result = authMode === 'signin' ? await signIn(authEmail, authPassword) : await signUp(authEmail, authPassword);
    if (result.error) setAuthError(result.error);
  };

  const requestPasswordReset = async () => {
    setAuthError('');
    const result = await resetPassword(authEmail);
    setAuthError(result.error ?? 'Password reset email sent. Check your inbox and spam folder.');
  };

  const saveNewPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    if (newPassword.length < 6) { setAuthError('Password must be at least 6 characters.'); return; }
    const result = await updatePassword(newPassword);
    if (result.error) setAuthError(result.error);
    else setAuthError('Password updated. You can now use it on any device or browser.');
  };

  if (!isReady) return <div className="admin-auth-card"><p className="eyebrow">Connecting</p><h1>Loading control room…</h1><p>Connecting to the shared catalog.</p></div>;
  if (isRemote && isRecoveringPassword) return <div className="admin-auth-card"><p className="eyebrow">The12thHouse Admin</p><h1>Set a new password</h1><p>Choose a password for the approved artist account.</p><form onSubmit={saveNewPassword} className="admin-auth-form"><label>New password<input type="password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>{authError && <p className="admin-auth-error" role="alert">{authError}</p>}<button className="button primary" type="submit">Save new password</button></form></div>;
  if (isRemote && !user) return <div className="admin-auth-card"><p className="eyebrow">The12thHouse Admin</p><h1>{authMode === 'signin' ? 'Sign in to control room' : 'Create artist account'}</h1><p>Only the approved artist email can access this area from any device or browser.</p><form onSubmit={submitAuth} className="admin-auth-form"><label>Email<input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required /></label><label>Password<input type="password" minLength={6} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required /></label>{authError && <p className="admin-auth-error" role="alert">{authError}</p>}<button className="button primary" type="submit">{authMode === 'signin' ? 'Sign in' : 'Create account'}</button></form>{authMode === 'signin' && <button type="button" className="button text-button" onClick={() => void requestPasswordReset()}>Forgot password? Send reset email</button>}<button type="button" className="button text-button" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}>{authMode === 'signin' ? 'Create a new account' : 'Back to sign in'}</button></div>;
  if (isRemote && user && user.email?.toLowerCase() !== approvedAdminEmail) return <div className="admin-auth-card"><p className="eyebrow">Access denied</p><h1>Admin access is restricted</h1><p>This account is not the approved artist account.</p><button type="button" className="button primary" onClick={() => void signOut()}>Sign out</button></div>;

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

  const createComingSoon = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!comingSoonTitle.trim()) return;
    const draft = emptyRelease(comingSoonTitle, comingSoonType, comingSoonContent);
    addUpcomingRelease({ ...draft, release_date: comingSoonDate, description: comingSoonDescription.trim(), artwork_url: comingSoonArtwork, visualType: comingSoonContent === 'visual' ? comingSoonVisualType : undefined, visual_url: comingSoonContent === 'visual' ? comingSoonVisualFile : null, tracks: comingSoonContent === 'music' ? comingSoonTrackNames.slice(0, comingSoonType === 'album' ? comingSoonTrackCount : 1).filter((name) => name.trim()).map((name, index) => ({ id: `track-${Date.now()}-${index}`, release_id: '', title: name.trim(), audio_url: null, duration: 0, published: false, play_count: 0, order: index + 1 })) : [] });
    setComingSoonTitle(''); setComingSoonDescription(''); setComingSoonArtwork(null); setComingSoonVisualFile(null); setComingSoonTrackNames(['']); setComingSoonTrackCount(1);
  };

  const saveUpcomingAudio = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const upcoming = upcomingReleases.find((release) => release.id === uploadUpcomingId);
    if (!upcoming) return;
    const hasAudio = (upcoming.tracks ?? []).some((track) => Boolean(track.audio_url));
    if (hasAudio) publishUpcomingRelease(upcoming.id);
  };

  const createDirectUploadRelease = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!directTitle.trim()) return;
    const draft = emptyRelease(directTitle, directType, directContent);
    const releaseId = addRelease({ ...draft, release_date: directDate, description: directDescription.trim(), artwork_url: directArtwork, visualType: directContent === 'visual' ? directVisualType : undefined, visual_url: directContent === 'visual' ? directVisualFile : null, published: true, tracks: directContent === 'music' ? directTrackNames.slice(0, directType === 'album' ? directTrackCount : 1).filter((name) => name.trim()).map((name, index) => ({ id: `track-${Date.now()}-${index}`, release_id: '', title: name.trim(), audio_url: directTrackFiles[index] ?? null, duration: 0, published: Boolean(directTrackFiles[index]), play_count: 0, order: index + 1 })) : [] });
    setSelectedReleaseId(releaseId); setDirectTitle(''); setDirectDescription(''); setDirectArtwork(null); setDirectVisualFile(null); setDirectTrackNames(['']); setDirectTrackFiles([null]); setDirectTrackCount(1);
  };

  return (
    <div className="page-section admin-page">
      <div className="section-heading split">
        <div><p className="eyebrow">Independent content administration</p><h1>Control room</h1><p className="admin-intro">Manage releases, audio, visuals, platform links and the three featured cards on Home.</p></div>
        <div className="admin-header-actions"><label className="admin-release-picker"><span className="eyebrow">Editing release</span><select value={selectedRelease.id} onChange={(event) => setSelectedReleaseId(event.target.value)}>{releases.map((release) => <option key={release.id} value={release.id}>{release.title}</option>)}</select></label><button type="button" className="button secondary" onClick={() => document.getElementById('edit-release-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Edit release</button><button type="button" className="button text-button" onClick={() => void signOut()}>Sign out</button></div>
      </div>

      <div className="admin-stats" aria-label="Catalog statistics">
        <div className="admin-stat"><span>Total plays</span><strong>{totalPlays.toLocaleString()}</strong></div>
        <div className="admin-stat"><span>Playable tracks</span><strong>{playableTracks}</strong></div>
        <div className="admin-stat"><span>Published releases</span><strong>{visibleReleases.length}</strong></div>
      </div>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading"><div><p className="eyebrow">Coming soon</p><h2>Prepare a future release</h2></div></div>
        <form className="admin-grid-form admin-new-release-form" onSubmit={createComingSoon}>
          <label>Title<input value={comingSoonTitle} onChange={(event) => setComingSoonTitle(event.target.value)} placeholder="Future release title" required /></label>
          <label>Release date<input type="date" value={comingSoonDate} onChange={(event) => setComingSoonDate(event.target.value)} required /></label>
          <div className="admin-content-choice"><span>Publish as</span><div><button type="button" className={`button ${comingSoonContent === 'music' ? 'primary' : 'secondary'}`} onClick={() => setComingSoonContent('music')}>Music</button><button type="button" className={`button ${comingSoonContent === 'visual' ? 'primary' : 'secondary'}`} onClick={() => setComingSoonContent('visual')}>Visual</button></div></div>
          {comingSoonContent === 'music' && <label>Type<select value={comingSoonType} onChange={(event) => { const type = event.target.value as 'single' | 'album'; setComingSoonType(type); setComingSoonTrackCount(type === 'album' ? Math.max(2, comingSoonTrackCount) : 1); setComingSoonTrackNames((names) => type === 'album' ? names : [names[0] ?? '']); }}><option value="single">Single track</option><option value="album">Album</option></select></label>}
          <label className="admin-file-input">{comingSoonArtwork ? 'Cover selected' : 'Upload cover'}<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFileAsDataUrl(file, setComingSoonArtwork); }} /></label>
          <label>Description<textarea value={comingSoonDescription} onChange={(event) => setComingSoonDescription(event.target.value)} rows={2} placeholder="What is coming?" /></label>
          {comingSoonContent === 'visual' ? <><label>Visual format<select value={comingSoonVisualType} onChange={(event) => setComingSoonVisualType(event.target.value as 'cover' | 'animation')}><option value="cover">New cover image</option><option value="animation">Motion / animation / video</option></select></label>{comingSoonVisualType === 'animation' && <label className="admin-file-input">{comingSoonVisualFile ? 'Video selected' : 'Upload video'}<input type="file" accept="video/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFileAsDataUrl(file, setComingSoonVisualFile); }} /></label>}</> : <>{comingSoonType === 'album' && <label>Number of tracks<input type="number" min="1" max="50" value={comingSoonTrackCount} onChange={(event) => { const count = Math.max(1, Number(event.target.value)); setComingSoonTrackCount(count); setComingSoonTrackNames((names) => Array.from({ length: count }, (_, index) => names[index] ?? '')); }} /></label>}<div className="admin-track-name-grid">{Array.from({ length: comingSoonType === 'album' ? comingSoonTrackCount : 1 }, (_, index) => <label key={index}>Track {index + 1}<input value={comingSoonTrackNames[index] ?? ''} onChange={(event) => setComingSoonTrackNames((names) => names.map((name, nameIndex) => nameIndex === index ? event.target.value : name))} placeholder="Track name" required /></label>)}</div></>}
          <button type="submit" className="button primary">Save coming soon</button>
        </form>
        <div className="admin-upcoming-list">{upcomingReleases.length === 0 ? <p className="admin-help">No coming-soon releases yet.</p> : upcomingReleases.map((release) => <div className="admin-upcoming-row" key={release.id}><div><strong>{release.title}</strong><span>{release.type} · {release.release_date} · {(release.tracks ?? []).length} tracks</span></div><button type="button" className="button text-button" onClick={() => removeUpcomingRelease(release.id)}>Remove</button></div>)}</div>
      </section>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading"><div><p className="eyebrow">Upload files</p><h2>Attach audio to a coming release or create new</h2></div></div>
        <div className="admin-mode-switch"><label><input type="radio" name="upload-mode" checked={uploadMode === 'upcoming'} onChange={() => setUploadMode('upcoming')} /> Use coming soon list</label><label><input type="radio" name="upload-mode" checked={uploadMode === 'new'} onChange={() => setUploadMode('new')} /> Create new release</label></div>
        {uploadMode === 'upcoming' ? <form className="admin-upload-form" onSubmit={saveUpcomingAudio}>
          <label>Coming-soon release<select value={uploadUpcomingId} onChange={(event) => setUploadUpcomingId(event.target.value)}><option value="">Select a prepared release</option>{upcomingReleases.map((release) => <option key={release.id} value={release.id}>{release.title} · {release.type}</option>)}</select></label>
          {upcomingReleases.find((release) => release.id === uploadUpcomingId)?.tracks?.map((track) => { const current = upcomingReleases.find((release) => release.id === uploadUpcomingId); return <div className="admin-upload-track" key={track.id}><div><strong>{track.title}</strong><span>{track.audio_url ? 'Audio uploaded' : 'Waiting for file'}</span></div><label className="admin-file-input">{track.audio_url ? 'Replace file' : 'Upload file'}<input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file || !current) return; readFileAsDataUrl(file, (audio_url) => updateUpcomingRelease(current.id, { tracks: (current.tracks ?? []).map((item) => item.id === track.id ? { ...item, audio_url, published: true } : item) })); }} /></label></div>; })}
          <button type="submit" className="button primary" disabled={!uploadUpcomingId}>Publish uploaded release</button><p className="admin-help">هر فایل مستقیماً به نام ترک از قبل تعریف‌شده متصل می‌شود.</p>
        </form> : <form className="admin-upload-form" onSubmit={createDirectUploadRelease}>
          <div className="admin-edit-grid"><label>Title<input value={directTitle} onChange={(event) => setDirectTitle(event.target.value)} placeholder="Release title" required /></label><label>Release date<input type="date" value={directDate} onChange={(event) => setDirectDate(event.target.value)} required /></label><div className="admin-content-choice"><span>Publish as</span><div><button type="button" className={`button ${directContent === 'music' ? 'primary' : 'secondary'}`} onClick={() => setDirectContent('music')}>Music</button><button type="button" className={`button ${directContent === 'visual' ? 'primary' : 'secondary'}`} onClick={() => setDirectContent('visual')}>Visual</button></div></div>{directContent === 'music' && <label>Type<select value={directType} onChange={(event) => { const type = event.target.value as 'single' | 'album'; setDirectType(type); setDirectTrackCount(type === 'album' ? Math.max(2, directTrackCount) : 1); setDirectTrackNames((names) => type === 'album' ? names : [names[0] ?? '']); setDirectTrackFiles((files) => type === 'album' ? files : [files[0] ?? null]); }}><option value="single">Single track</option><option value="album">Album</option></select></label>}</div>
          <label className="admin-file-input">{directArtwork ? 'Cover selected' : 'Upload cover'}<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFileAsDataUrl(file, setDirectArtwork); }} /></label><label className="admin-textarea-label">Description<textarea value={directDescription} onChange={(event) => setDirectDescription(event.target.value)} rows={2} /></label>
          {directContent === 'visual' ? <label>Visual format<select value={directVisualType} onChange={(event) => setDirectVisualType(event.target.value as 'cover' | 'animation')}><option value="cover">New cover image</option><option value="animation">Motion / animation / video</option></select></label> : <>{directType === 'album' && <label>Number of tracks<input type="number" min="1" max="50" value={directTrackCount} onChange={(event) => { const count = Math.max(1, Number(event.target.value)); setDirectTrackCount(count); setDirectTrackNames((names) => Array.from({ length: count }, (_, index) => names[index] ?? '')); setDirectTrackFiles((files) => Array.from({ length: count }, (_, index) => files[index] ?? null)); }} /></label>}<div className="admin-upload-track-list">{Array.from({ length: directType === 'album' ? directTrackCount : 1 }, (_, index) => <div className="admin-upload-track" key={index}><input value={directTrackNames[index] ?? ''} onChange={(event) => setDirectTrackNames((names) => names.map((name, nameIndex) => nameIndex === index ? event.target.value : name))} placeholder={`Track ${index + 1} name`} required /><label className="admin-file-input">{directTrackFiles[index] ? 'File selected' : 'Upload audio'}<input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFileAsDataUrl(file, (audio_url) => setDirectTrackFiles((files) => files.map((item, itemIndex) => itemIndex === index ? audio_url : item))); }} /></label></div>)}</div></>}
          {directContent === 'visual' && directVisualType === 'animation' && <label className="admin-file-input">{directVisualFile ? 'Video selected' : 'Upload video'}<input type="file" accept="video/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFileAsDataUrl(file, setDirectVisualFile); }} /></label>}
          <button type="submit" className="button primary">Create and publish release</button>
        </form>}
      </section>

      <section className="admin-panel admin-panel--single">
        <div className="admin-section-heading"><div><p className="eyebrow">Home layout</p><h2>Choose the three featured cards</h2></div></div>
        <div className="admin-home-card-grid">
          {[0, 1, 2].map((slot) => <label className="admin-home-card-slot" key={slot}><span>Card {slot + 1} · {slot === 2 ? 'Album / visual' : 'Featured work'}</span><select value={homeCardIds[slot] ?? ''} onChange={(event) => updateHomeCard(slot, event.target.value)}><option value="">Automatic selection</option>{visibleReleases.map((release) => <option key={release.id} value={release.id}>{release.title} · {release.type}</option>)}</select></label>)}
        </div>
        <p className="admin-help">The selected title, description, release date and cover are read directly from each release and appear on Home.</p>
      </section>

      <section id="edit-release-settings" className="admin-panel admin-panel--single">
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
