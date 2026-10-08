import { useEffect, useMemo, useState } from 'react';
import type { Release } from '../../types';
import { loadPlatformLinkClickStats, loadQualifiedTrackViews, summarizePlatformClickStats, type PlatformLinkClickStat } from './analytics';

const numberFormat = new Intl.NumberFormat();
const platformNames: Record<string, string> = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  youtube_music: 'YouTube Music',
  soundcloud: 'SoundCloud',
  bandcamp: 'Bandcamp',
  custom: 'Custom link',
};

function displayPlatform(platform: string) {
  return platformNames[platform] ?? platform;
}

export function AnalyticsPanel({ releases, isRemote }: { releases: Release[]; isRemote: boolean }) {
  const [clickStats, setClickStats] = useState<PlatformLinkClickStat[]>([]);
  const [qualifiedViewCounts, setQualifiedViewCounts] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    if (!isRemote) {
      setClickStats([]);
      setError('Connect Supabase and apply the preview analytics migration to load platform click statistics.');
      return () => { active = false; };
    }

    setIsLoading(true);
    setError(null);
    void loadPlatformLinkClickStats().then((result) => {
      if (!active) return;
      setClickStats(result.data);
      setError(result.error);
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => { active = false; };
  }, [isRemote, refreshVersion]);

  useEffect(() => {
    let active = true;
    if (!isRemote) {
      setQualifiedViewCounts(null);
      return () => { active = false; };
    }
    void loadQualifiedTrackViews().then((result) => {
      if (!active) return;
      setQualifiedViewCounts(Object.fromEntries(result.data.map((track) => [track.track_id, Math.max(0, Number(track.qualified_view_count) || 0)])));
      if (result.error) setError((current) => current ?? result.error);
    });
    return () => { active = false; };
  }, [isRemote, refreshVersion]);

  const trackRows = useMemo(() => releases
    .filter((release) => release.contentType === 'music')
    .flatMap((release) => (release.tracks ?? []).map((track) => ({
      key: `${release.id}:${track.id}`,
      releaseTitle: release.title,
      trackTitle: track.title,
      plays: qualifiedViewCounts?.[track.id] ?? 0,
    })))
    .sort((left, right) => right.plays - left.plays || left.trackTitle.localeCompare(right.trackTitle)), [releases, qualifiedViewCounts]);

  const playTotal = trackRows.reduce((sum, track) => sum + track.plays, 0);
  const { totalClicks, topPlatform, topPlatformClicks } = summarizePlatformClickStats(clickStats);

  return <section className="admin-view analytics-view" aria-label="Listening and platform-link analytics">
    <div className="admin-view-intro">
      <p>Listening and distribution-link activity tracked since analytics rollout. A track play is counted once per session after 30 seconds of actual audio progress.</p>
      <button type="button" className="button secondary" onClick={() => setRefreshVersion((version) => version + 1)} disabled={isLoading}>
        {isLoading ? 'Refreshing…' : 'Refresh statistics'}
      </button>
    </div>

    {error && <p className="admin-notice admin-notice--error" role="alert">Analytics statistics unavailable: {error}</p>}
    {isLoading && <p className="admin-muted" role="status" aria-live="polite">Loading analytics statistics…</p>}

    <div className="admin-stats analytics-summary" role="group" aria-label="All-time totals">
      <article className="admin-stat"><span>Qualified track plays</span><strong>{numberFormat.format(playTotal)}</strong><small>30+ seconds listened per session, since rollout</small></article>
      <article className="admin-stat"><span>Platform-link clicks</span><strong>{numberFormat.format(totalClicks)}</strong><small>Spotify, SoundCloud and other destinations</small></article>
      <article className="admin-stat"><span>Most-clicked platform</span><strong className="analytics-platform-highlight">{topPlatform ? displayPlatform(topPlatform) : '—'}</strong><small>{topPlatform ? `${numberFormat.format(topPlatformClicks)} all-time clicks` : 'No clicks recorded yet'}</small></article>
    </div>

    <section className="admin-card analytics-card" aria-labelledby="analytics-tracks-title">
      <div className="admin-card-heading"><div><span className="admin-kicker">LISTENING · ALL TIME</span><h2 id="analytics-tracks-title">Track plays</h2></div></div>
      <p className="admin-muted">One qualified view is recorded after 30 seconds of advancing playback. Pause and resume carries progress forward; seeking does not count as listened time.</p>
      {trackRows.length === 0 ? <p className="admin-empty">No music tracks are available to report yet.</p> : <div className="analytics-table-wrap" tabIndex={0} role="region" aria-label="Track play statistics">
        <table className="analytics-table">
          <caption className="visually-hidden">All-time qualified views by track</caption>
          <thead><tr><th scope="col">Release</th><th scope="col">Track</th><th scope="col">Qualified plays</th></tr></thead>
          <tbody>{trackRows.map((track) => <tr key={track.key}><td>{track.releaseTitle}</td><td>{track.trackTitle}</td><td>{numberFormat.format(track.plays)}</td></tr>)}</tbody>
        </table>
      </div>}
    </section>

    <section className="admin-card analytics-card" aria-labelledby="analytics-platforms-title">
      <div className="admin-card-heading"><div><span className="admin-kicker">DISTRIBUTION · ALL TIME</span><h2 id="analytics-platforms-title">Platform-link clicks</h2></div></div>
      <p className="admin-muted">Click totals are grouped by the saved link for each release.</p>
      {clickStats.length === 0 && !isLoading && !error ? <p className="admin-empty">No platform links are saved yet.</p> : clickStats.length > 0 && <div className="analytics-table-wrap" tabIndex={0} role="region" aria-label="Platform link click statistics">
        <table className="analytics-table">
          <caption className="visually-hidden">All-time external link clicks by release and platform</caption>
          <thead><tr><th scope="col">Release</th><th scope="col">Platform</th><th scope="col">Link</th><th scope="col">Clicks</th></tr></thead>
          <tbody>{clickStats.map((stat) => <tr key={stat.platform_link_id}><td>{stat.release_title}</td><td>{displayPlatform(stat.platform)}</td><td>{stat.label}</td><td>{numberFormat.format(Math.max(0, Number(stat.click_count) || 0))}</td></tr>)}</tbody>
        </table>
      </div>}
    </section>
  </section>;
}
