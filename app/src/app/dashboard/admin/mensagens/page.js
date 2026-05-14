'use client';
import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './chat.module.css';
import { Send, User, Search, Paperclip, MoreVertical, CheckCheck } from 'lucide-react';

// Memoized message item to prevent unnecessary re-renders
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

export default function AdminChatPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const listRef = useRef(null);
  const supabase = useMemo(() => createClient(), []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Initial fetch and scroll
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Fetch patients list
  useEffect(() => {
    let mounted = true;
    async function fetchPatients() {
      const { data } = await supabase
        .from('pacientes')
        .select('id, user_id, foto_url, profiles:user_id (nome, email)')
        .eq('status', 'ativo');
      
      if (mounted) {
        setPatients(data || []);
        setLoading(false);
      }
    }
    fetchPatients();
    return () => { mounted = false; };
  }, [supabase]);

  // Subscribe to messages and fetch history
  useEffect(() => {
    if (!selectedPatient || !user) return;

    let mounted = true;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('mensagens')
        .select('*')
        .or(`and(remetente_id.eq.${user.id},destinatario_id.eq.${selectedPatient.user_id}),and(remetente_id.eq.${selectedPatient.user_id},destinatario_id.eq.${user.id})`)
        .order('data', { ascending: true });
      
      if (mounted) {
        setMessages(data || []);
        // Delayed scroll to ensure DOM is ready
        setTimeout(() => scrollToBottom('auto'), 50);
      }
      
      await supabase
        .from('mensagens')
        .update({ lida: true })
        .eq('destinatario_id', user.id)
        .eq('remetente_id', selectedPatient.user_id)
        .eq('lida', false);
    };

    fetchMessages();

    const playNotificationSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    };

    const channelId = `chat_room_${[user.id, selectedPatient.user_id].sort().join('_')}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensagens'
      }, (payload) => {
        const msg = payload.new;
        const isRelated = 
          (msg.remetente_id === selectedPatient.user_id && msg.destinatario_id === user.id) ||
          (msg.remetente_id === user.id && msg.destinatario_id === selectedPatient.user_id);
        
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
  }, [selectedPatient?.user_id, user?.id, supabase, scrollToBottom]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPatient || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Optimistic Update
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      remetente_id: user.id,
      destinatario_id: selectedPatient.user_id,
      mensagem: messageContent,
      data: new Date().toISOString(),
      lida: false
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { error } = await supabase
        .from('mensagens')
        .insert({
          remetente_id: user.id,
          destinatario_id: selectedPatient.user_id,
          mensagem: messageContent
        });

      if (error) throw error;
    } catch (error) {
      addToast('Erro ao enviar mensagem', 'error');
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.profiles?.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.chatContainer}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3>Mensagens</h3>
            <div className={styles.searchBar}>
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Buscar paciente..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.patientList}>
            {filteredPatients.map(p => (
              <div 
                key={p.id} 
                className={`${styles.patientItem} ${selectedPatient?.id === p.id ? styles.active : ''}`}
                onClick={() => setSelectedPatient(p)}
              >
                <div className={styles.avatar}>
                  {p.foto_url ? <img src={p.foto_url} alt="P" /> : <User size={20} />}
                </div>
                <div className={styles.patientInfo}>
                  <p className={styles.patientName}>{p.profiles?.nome}</p>
                  <p className={styles.lastMsg}>Clique para conversar</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className={styles.chatArea}>
          {selectedPatient ? (
            <>
              <header className={styles.chatHeader}>
                <div className={styles.headerInfo}>
                  <div className={styles.headerAvatar}>
                    {selectedPatient.foto_url ? <img src={selectedPatient.foto_url} alt="P" /> : <User size={20} />}
                  </div>
                  <div>
                    <h4>{selectedPatient.profiles?.nome}</h4>
                    <p className={styles.onlineStatus}>Paciente Ativo</p>
                  </div>
                </div>
                <button className={styles.moreBtn}><MoreVertical size={20} /></button>
              </header>

              <div className={styles.messagesList} ref={listRef}>
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
                  placeholder="Escreva sua mensagem..." 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  autoComplete="off"
                />
                <button type="submit" className={styles.sendBtn} disabled={!newMessage.trim() || isSending}>
                  <Send size={20} />
                </button>
              </form>
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Send size={48} /></div>
              <h3>Selecione um paciente</h3>
              <p>Escolha um paciente na lista ao lado para iniciar o atendimento.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
