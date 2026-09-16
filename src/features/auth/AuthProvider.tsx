import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

type AppRole = 'artist' | 'admin' | null;
export const ADMIN_ALLOWLIST = ['kamielkhajehpour@gmail.com'];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: AppRole;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  sendMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchRole(userId: string): Promise<AppRole> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
  if (error) console.warn('Unable to read the user role. Apply supabase/schema.sql first.', error.message);
  return data?.role === 'artist' || data?.role === 'admin' ? data.role : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const refreshRole = useCallback(async () => setRole(session?.user ? await fetchRole(session.user.id) : null), [session?.user]);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured) { setLoading(false); return () => { mounted = false; }; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setRole(data.session?.user ? await fetchRole(data.session.user.id) : null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setRole(null); else void fetchRole(nextSession.user.id).then(setRole);
      setLoading(false);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!ADMIN_ALLOWLIST.includes(normalizedEmail)) return { error: new Error('This email is not authorized for The12thHouse admin.') };
    if (!isSupabaseConfigured) return { error: new Error('Supabase is not configured.') };
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!ADMIN_ALLOWLIST.includes(normalizedEmail)) return { error: new Error('This email is not on the artist access list.') };
    if (!isSupabaseConfigured) return { error: new Error('Supabase is not configured.') };
    const adminRedirect = `${window.location.origin}${window.location.pathname}#/admin`;
    const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail, options: { emailRedirectTo: adminRedirect } });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  }, []);

  const value = useMemo(() => ({ session, user: session?.user ?? null, role, loading, configured: isSupabaseConfigured, signIn, sendMagicLink, signOut, refreshRole }), [session, role, loading, signIn, sendMagicLink, signOut, refreshRole]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
