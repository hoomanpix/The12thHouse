export function AdminPage() {
  return (
    <div className="page-section admin-page">
      <div className="section-heading">
        <p className="eyebrow">Admin</p>
        <h1>Artist dashboard</h1>
      </div>

      <div className="admin-panel">
        <div className="admin-card">
          <h2>Authentication</h2>
          <p>Supabase auth will protect this dashboard and enforce admin-only access.</p>
        </div>
        <div className="admin-card">
          <h2>Content management</h2>
          <p>Releases, track ordering, artwork uploads, and featured selections will be managed here.</p>
        </div>
        <div className="admin-card">
          <h2>Publishing</h2>
          <p>Draft and publish workflows will control what is shown to public visitors.</p>
        </div>
      </div>
    </div>
  );
}
