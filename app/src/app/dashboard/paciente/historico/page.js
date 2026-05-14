'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { formatDate, getStatusColor, getStatusBg } from '@/utils/helpers';
import styles from './historico.module.css';
import { History, Monitor, MapPin } from 'lucide-react';

export default function HistoricoPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    async function fetchHistory() {
      try {
        const { data: patient, error: pError } = await supabase
          .from('pacientes')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (pError) {
          console.error('Error fetching patient for history:', pError.message);
          return;
        }

        if (patient) {
          const { data } = await supabase
            .from('sessoes')
            .select('*')
            .eq('paciente_id', patient.id)
            .order('data', { ascending: false });
          
          setSessions(data || []);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [user]);

  if (loading) return <div className={styles.loading}>Carregando histórico...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <History size={24} color="var(--color-green)" />
          <h1>Histórico de Sessões</h1>
        </div>
        <p className={styles.subtitle}>Acompanhe sua jornada de transformação.</p>
      </div>

      <div className={styles.list}>
        {sessions.map((s, index) => (
          <div key={s.id} className={styles.sessionCard} style={{ animationDelay: `${index * 0.1}s` }}>
            <div className={styles.dateBlock}>
              <span className={styles.day}>{new Date(s.data).getDate()}</span>
              <span className={styles.month}>{new Date(s.data).toLocaleDateString('pt-BR', { month: 'short' })}</span>
            </div>
            
            <div className={styles.content}>
              <div className={styles.cardHeader}>
                <h4>Sessão às {new Date(s.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</h4>
                <span className={styles.badge} style={{ color: getStatusColor(s.status), background: getStatusBg(s.status) }}>
                  {s.status}
                </span>
              </div>
              <p className={styles.details}>
                <Monitor size={14} /> Online/Presencial
              </p>
              {s.observacoes && <p className={styles.notes}>{s.observacoes}</p>}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className={styles.empty}>Nenhuma sessão encontrada no histórico.</div>
        )}
      </div>
    </div>
  );
}
