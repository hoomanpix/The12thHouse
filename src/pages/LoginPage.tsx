import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

export function LoginPage() {
  const { configured, user, role, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && (role === 'artist' || role === 'admin')) {
      navigate('/admin', { replace: true });
    }
  }, [loading, user, role, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) setError(result.error.message);
    else navigate((location.state as { from?: string } | null)?.from ?? '/admin', { replace: true });
  };

  return (
    <section className="auth-page page-section">
      <div className="auth-panel">
        <p className="eyebrow">The12thHouse / private access</p>
        <h1>Artist login</h1>
        <p className="auth-intro">Sign in to manage releases, tracks, links, and publishing status.</p>
        {!configured && <p className="auth-notice">Supabase is not configured for this build.</p>}
        {configured && (
          <form className="auth-form" onSubmit={submit}>
            <label><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button primary" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}
        {user && role !== 'artist' && role !== 'admin' && <p className="auth-error">This account is signed in but has no artist role.</p>}
      </div>
    </section>
  );
}
