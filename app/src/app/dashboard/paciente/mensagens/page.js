'use client';
import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './chat.module.css';
import { Send, User, Paperclip, MoreVertical, CheckCheck } from 'lucide-react';

// Memoized message item
const MessageItem = memo(({ m, isOwn }) => {
  return (
    <div className={`${styles.messageWrapper} ${isOwn ? styles.ownMessage : styles.theirMessage}`}>
      <div className={styles.messageBubble}>
        <p>{m.mensagem}</p>
        <div className={styles.messageMeta}>
          <span>{new Date(m.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
          {isOwn && <CheckCheck size={14} className={m.lida ? styles.read : ''} />}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default function PacienteChatPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [admin, setAdmin] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const supabase = useMemo(() => createClient(), []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    let mounted = true;
    async function fetchAdmin() {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, bio')
        .eq('tipo', 'admin')
        .maybeSingle();
      
      if (mounted) {
        setAdmin(data);
        setLoading(false);
      }
    }
    fetchAdmin();
    return () => { mounted = false; };
  }, [supabase]);

  useEffect(() => {
    if (!admin || !user) return;

    let mounted = true;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('mensagens')
        .select('*')
        .or(`and(remetente_id.eq.${user.id},destinatario_id.eq.${admin.id}),and(remetente_id.eq.${admin.id},destinatario_id.eq.${user.id})`)
        .order('data', { ascending: true });
      
      if (mounted) {
        setMessages(data || []);
        setTimeout(() => scrollToBottom('auto'), 50);
      }

      await supabase
        .from('mensagens')
        .update({ lida: true })
        .eq('destinatario_id', user.id)
        .eq('remetente_id', admin.id)
        .eq('lida', false);
    };

    fetchMessages();

    const playNotificationSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    };

    const channelId = `chat_room_${[user.id, admin.id].sort().join('_')}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensagens'
      }, (payload) => {
        const msg = payload.new;
        const isRelated = 
          (msg.remetente_id === admin.id && msg.destinatario_id === user.id) ||
          (msg.remetente_id === user.id && msg.destinatario_id === admin.id);
        
        if (mounted && isRelated) {
          if (msg.remetente_id !== user.id) playNotificationSound();
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [admin?.id, user?.id, supabase, scrollToBottom]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !admin || isSending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      remetente_id: user.id,
      destinatario_id: admin.id,
      mensagem: content,
      data: new Date().toISOString(),
      lida: false
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { error } = await supabase
        .from('mensagens')
        .insert({
          remetente_id: user.id,
          destinatario_id: admin.id,
          mensagem: content
        });

      if (error) throw error;
    } catch (error) {
      addToast('Erro ao enviar mensagem', 'error');
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className={styles.loading}>Abrindo chat...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.chatContainer}>
        <header className={styles.chatHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.headerAvatar}>
              {admin?.avatar_url ? <img src={admin.avatar_url} alt="Dra" /> : <User size={20} />}
            </div>
            <div>
              <h4>{admin?.nome || 'Dra. Gerlane'}</h4>
              <p className={styles.onlineStatus}>Psicanalista • Online</p>
            </div>
          </div>
          <button className={styles.moreBtn}><MoreVertical size={20} /></button>
        </header>

        <div className={styles.messagesList}>
          <div className={styles.welcomeMsg}>
            <p>Este é o seu canal direto e seguro com a sua terapeuta. Suas mensagens são protegidas por sigilo profissional.</p>
          </div>
          {messages.map((m) => (
            <MessageItem 
              key={m.id} 
              m={m} 
              isOwn={m.remetente_id === user.id} 
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className={styles.inputArea} onSubmit={sendMessage}>
          <button type="button" className={styles.attachBtn}><Paperclip size={20} /></button>
          <input 
            type="text" 
            placeholder="Escreva para a Dra. Gerlane..." 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className={styles.sendBtn} disabled={!newMessage.trim() || isSending}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
