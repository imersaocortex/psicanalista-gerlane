'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
const AuthContext = createContext();
async function loadProfile(db, authUser) {
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', authUser.id).single();
  if (error || !['admin', 'paciente'].includes(profile?.tipo)) throw new Error('Seu perfil não está disponível. Entre em contato com a clínica.');
  return { ...authUser, ...profile, id: authUser.id };
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  const version = useRef(0);
  const currentUser = useRef(null);
  const logout = useCallback(async () => {
    version.current++; currentUser.current = null; setUser(null); setLoading(true);
    try { await supabase.auth.signOut({ scope: 'local' }); }
    finally { window.location.replace('/login'); }
  }, [supabase]);
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.status === 0 || error.name === 'AuthRetryableFetchError' ? 'Não foi possível conectar ao serviço de acesso. Verifique sua conexão e tente novamente.' : 'Não foi possível entrar. Verifique seu e-mail, senha e a confirmação do e-mail.');
      const profile = await loadProfile(supabase, data.user);
      currentUser.current = profile; setUser(profile); return profile;
    } catch (error) {
      setUser(null); currentUser.current = null; await supabase.auth.signOut({ scope: 'local' }); throw error;
    } finally { setLoading(false); }
  }, [supabase]);
  useEffect(() => {
    let active = true;
    let deferred;
    const restore = async (authUser) => {
      const token = ++version.current;
      try {
        const profile = authUser ? await loadProfile(supabase, authUser) : null;
        if (active && token === version.current) { currentUser.current = profile; setUser(profile); }
      } catch {
        if (active && token === version.current) { currentUser.current = null; setUser(null); }
      } finally { if (active && token === version.current) setLoading(false); }
    };
    supabase.auth.getUser().then(({ data }) => restore(data.user)).catch(() => restore(null));
    // Keep this callback synchronous to avoid holding Supabase's auth lock during a database request.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      clearTimeout(deferred); deferred = setTimeout(() => restore(session?.user || null), 0);
    });
    let inactivity;
    const resetTimer = () => {
      clearTimeout(inactivity);
      if (currentUser.current) inactivity = setTimeout(logout, 600000);
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    const interval = setInterval(() => { if (currentUser.current && !inactivity) resetTimer(); }, 1000);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => {
      active = false; subscription.unsubscribe(); clearTimeout(deferred); clearTimeout(inactivity); clearInterval(interval);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [supabase, logout]);
  return <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
