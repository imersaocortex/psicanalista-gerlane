'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const logout = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    
    // Limpeza Profunda de Cache do PWA e Navegador
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
      const cookies = document.cookie.split("; ");
      for (let c = 0; c < cookies.length; c++) {
        const d = window.location.hostname.split(".");
        while (d.length > 0) {
          const cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
          const p = location.pathname.split('/');
          document.cookie = cookieBase + '/';
          while (p.length > 0) {
            document.cookie = cookieBase + p.join('/');
            p.pop();
          }
          d.shift();
        }
      }
    }

    // Forçar hard reload no logout para limpar todo o cache e estado do Roteador do Next.js
    window.location.href = '/login';
  }, [supabase]);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.warn("Aviso ao buscar perfil no login:", profileError);
      }

      const userData = { ...data.user, ...profile };
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Registrar o Service Worker (PWA)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.log('SW registration failed: ', err));
    }

    let inactivityTimer;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      // 10 minutes = 600,000 ms
      inactivityTimer = setTimeout(() => {
        console.log('Logging out due to inactivity');
        logout();
      }, 600000);
    };

    const handleInitialSession = async () => {
      let isSettled = false;
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          console.warn('Timeout na validação de sessão! Forçando abertura para evitar tela travada.');
          setLoading(false);
        }
      }, 4000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) console.warn("Aviso ao restaurar perfil:", profileError);
          
          setUser({ ...session.user, ...profile });
          resetTimer();
        }
      } catch (err) {
        console.error("Erro ao verificar sessão inicial:", err);
      } finally {
        isSettled = true;
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    handleInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setUser({ ...session.user, ...profile });
          resetTimer();
        } else {
          setUser(null);
          if (inactivityTimer) clearTimeout(inactivityTimer);
        }
      } catch (err) {
        console.error("Erro ao mudar estado de auth:", err);
      } finally {
        setLoading(false);
      }
    });

    // Activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      subscription.unsubscribe();
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [supabase, logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

