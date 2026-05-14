'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './Header.module.css';
import { Search, Bell, LogOut, Menu, User as UserIcon } from 'lucide-react';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (mounted) {
        setNotifications(data || []);
        const { count } = await supabase
          .from('notificacoes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('lida', false);
        
        setUnreadCount(count || 0);
      }
    };

    fetchNotifs();

    const playNotifSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    };

    const channel = supabase
      .channel(`user-notifs-${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notificacoes', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        if (mounted) {
          playNotifSound();
          setNotifications(prev => [payload.new, ...prev].slice(0, 10));
          setUnreadCount(c => c + 1);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase]);

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false);
    
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const handleNotifClick = async (n) => {
    setShowNotifs(false);
    if (n.link) {
      router.push(n.link);
    }
    if (!n.lida) {
      await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', n.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, lida: true } : item));
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftGroup}>
        <div className={styles.mobileLogo}>
          <img src="/images/logo.png" alt="Logo" className={styles.logoImg} />
        </div>
        
        <div className={styles.search}>
          <Search size={16} className={styles.searchIcon} />
          <input type="text" placeholder="Pesquisar..." className={styles.searchInput} />
        </div>
      </div>

      <div className={styles.actions}>
        <div className={styles.notifWrapper}>
          <button 
            className={`${styles.notification} ${styles.desktopNotification}`}
            onClick={() => {
              setShowNotifs(!showNotifs);
              if (!showNotifs) markAsRead();
            }}
          >
            <Bell size={20} className={styles.bellIcon} />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </button>

          {showNotifs && (
            <div className={styles.notifDropdown}>
              <div className={styles.notifHeader}>
                <h4>Notificações</h4>
              </div>
              <div className={styles.notifList}>
                {notifications.length > 0 ? notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`${styles.notifItem} ${!n.lida ? styles.unread : ''}`}
                    onClick={() => handleNotifClick(n)}
                  >
                    <div className={styles.notifDot} />
                    <div className={styles.notifContent}>
                      <p className={styles.notifTitle}>{n.titulo}</p>
                      <p className={styles.notifText}>{n.mensagem}</p>
                      <span className={styles.notifDate}>
                        {new Date(n.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className={styles.emptyNotifs}>Nenhuma notificação por enquanto.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.user}>
          <div className={styles.divider} />
          <div className={styles.userAvatar}>
            {user?.foto_url || user?.avatar_url ? (
              <img src={user.foto_url || user.avatar_url} alt="Avatar" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarPlaceholder}><UserIcon size={16} /></div>
            )}
          </div>
          <div className={styles.userText}>
            <p className={styles.userName}>{user?.nome?.split(' ')[0] || 'Usuário'}</p>
            <p className={styles.userStatus}>{user?.tipo === 'admin' ? 'Admin' : 'Paciente'}</p>
          </div>
          <button onClick={logout} className={styles.logoutBtn} title="Sair">
            <LogOut size={18} />
          </button>
        </div>

        <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Abrir menu">
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}
