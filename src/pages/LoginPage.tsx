import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

export function LoginPage() {
  const { configured, user, role, loading, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && (role === 'artist' || role === 'admin')) navigate('/admin', { replace: true });
  }, [loading, user, role, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setSent(false); setSubmitting(true);
    const result = await sendMagicLink(email);
    setSubmitting(false);
    if (result.error) setError(result.error.message);
    else setSent(true);
  };

  return (
    <section className="auth-page page-section">
      <div className="auth-panel">
        <p className="eyebrow">The12thHouse / private access</p>
        <h1>Artist login</h1>
        <p className="auth-intro">Enter the approved email and we will send a one-time sign-in link.</p>
        {!configured && <p className="auth-notice">Supabase is not configured for this build.</p>}
        {configured && <form className="auth-form" onSubmit={submit}>
          <label><span>Approved email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {sent && <p className="auth-success" role="status">Check your inbox for the sign-in link.</p>}
          <button className="button primary" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send magic link'}</button>
        </form>}
        {user && role !== 'artist' && role !== 'admin' && <p className="auth-error">This account has no artist role.</p>}
        {location.state && <span className="sr-only">Redirecting after authentication</span>}
      </div>
    </section>
  );
}
