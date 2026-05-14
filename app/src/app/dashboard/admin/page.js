'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency, formatDate } from '@/utils/helpers';
import styles from './admin.module.css';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  ChevronRight,
  AlertCircle,
  Check,
  X,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ patients: 0, sessions: 0, revenue: 0, pendingCount: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const [patientsCount, sessionsCount, allPayments, nextSessions] = await Promise.all([
          supabase.from('pacientes').select('*', { count: 'exact', head: true }),
          supabase.from('sessoes').select('*', { count: 'exact', head: true }).eq('status', 'concluida'),
          supabase.from('pagamentos').select('*'),
          supabase.from('sessoes')
            .select('*')
            .gte('data', new Date().toISOString())
            .order('data', { ascending: true })
            .limit(5)
        ]);

        const totalRevenue = (allPayments.data || [])
          .filter(p => p.status === 'pago')
          .reduce((acc, curr) => acc + (curr.valor || 0), 0);
        
        const pendingCount = (allPayments.data || [])
          .filter(p => p.status === 'pendente').length;

        setStats({
          patients: patientsCount.count || 0,
          sessions: sessionsCount.count || 0,
          revenue: totalRevenue,
          pendingCount: pendingCount
        });

        setRecentSessions(nextSessions.data || []);
        setPendingPayments((allPayments.data || []).filter(p => p.status === 'pendente').slice(0, 3));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();

    // Inscrição em tempo real para atualizações automáticas
    const sessionsChannel = supabase.channel('admin_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
    };
  }, []);

  const handleUpdateStatus = async (sessionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('sessoes')
        .update({ status: newStatus })
        .eq('id', sessionId);

      if (error) throw error;

      setRecentSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s));
      addToast('Status atualizado!', 'success');
    } catch (error) {
      addToast('Erro ao atualizar.', 'error');
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Excluir este agendamento?')) return;
    try {
      const { error } = await supabase.from('sessoes').delete().eq('id', sessionId);
      if (error) throw error;
      setRecentSessions(prev => prev.filter(s => s.id !== sessionId));
      addToast('Excluído.', 'success');
    } catch (error) {
      addToast('Erro ao excluir.', 'error');
    }
  };

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Carregando insights...</p>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h1>Olá, Dra. {user?.nome?.split(' ')[0] || 'Gerlane'}! ✨</h1>
          <p>Aqui está o que está acontecendo na sua clínica hoje.</p>
        </div>
        <div className={styles.dateDisplay}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{backgroundColor: 'rgba(116, 159, 130, 0.1)', color: 'var(--color-green)'}}>
              <Users size={20} />
            </div>
            <span className={styles.statTrend}><ArrowUpRight size={12} /> Ativos</span>
          </div>
          <div className={styles.statBody}>
            <h3 className={styles.statValue}>{stats.patients}</h3>
            <p className={styles.statLabel}>Pacientes</p>
          </div>
          <div className={styles.statProgress}><div className={styles.progressBar} style={{width: '75%'}} /></div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{backgroundColor: 'rgba(52, 152, 219, 0.1)', color: '#3498db'}}>
              <Calendar size={20} />
            </div>
            <span className={styles.statTrend}><ArrowUpRight size={12} /> Concluídas</span>
          </div>
          <div className={styles.statBody}>
            <h3 className={styles.statValue}>{stats.sessions}</h3>
            <p className={styles.statLabel}>Sessões</p>
          </div>
          <div className={styles.statProgress}><div className={styles.progressBar} style={{width: '60%', backgroundColor: '#3498db'}} /></div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71'}}>
              <DollarSign size={20} />
            </div>
            <span className={styles.statTrend}><ArrowUpRight size={12} /> Receita</span>
          </div>
          <div className={styles.statBody}>
            <h3 className={styles.statValue}>{formatCurrency(stats.revenue)}</h3>
            <p className={styles.statLabel}>Total Recebido</p>
          </div>
          <div className={styles.statProgress}><div className={styles.progressBar} style={{width: '85%', backgroundColor: '#2ecc71'}} /></div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon} style={{backgroundColor: 'rgba(230, 126, 34, 0.1)', color: '#e67e22'}}>
              <AlertCircle size={20} />
            </div>
            <span className={styles.statTrend}>Pendentes</span>
          </div>
          <div className={styles.statBody}>
            <h3 className={styles.statValue}>{stats.pendingCount}</h3>
            <p className={styles.statLabel}>Faturas em aberto</p>
          </div>
          <div className={styles.statProgress}><div className={styles.progressBar} style={{width: '40%', backgroundColor: '#e67e22'}} /></div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeaderWithAction}>
            <div className={styles.sectionTitle}>
              <Clock size={18} />
              <h3>Próximas Sessões</h3>
            </div>
            <Link href="/dashboard/admin/agenda" className={styles.viewAll}>Ver agenda completa</Link>
          </div>
          
          <div className={styles.sessionsList}>
            {recentSessions.length > 0 ? recentSessions.map(session => (
              <div key={session.id} className={styles.sessionItem}>
                <div className={styles.sessionTime}>
                  <span className={styles.timeStr}>{new Date(session.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                  <span className={styles.dateStr}>{new Date(session.data).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</span>
                </div>
                <div className={styles.sessionPatient}>
                  <h4>Paciente #{session.paciente_id?.slice(0, 5)}</h4>
                  <p>Sessão de Psicanálise • 50 min</p>
                </div>
                <div className={styles.sessionActions}>
                  {session.status !== 'concluida' && (
                    <button onClick={() => handleUpdateStatus(session.id, 'concluida')} title="Concluir" className={styles.actionBtnIcon}><Check size={14} /></button>
                  )}
                  {session.status !== 'cancelada' && (
                    <button onClick={() => handleUpdateStatus(session.id, 'cancelada')} title="Cancelar" className={styles.actionBtnIcon}><X size={14} /></button>
                  )}
                  <button onClick={() => handleDelete(session.id)} title="Excluir" className={styles.actionBtnIcon}><Trash2 size={14} /></button>
                </div>
                <Link href={`/dashboard/admin/pacientes/${session.pacientes?.id}`} className={styles.sessionArrow}>
                  <ChevronRight size={18} />
                </Link>
              </div>
            )) : (
              <div className={styles.emptySessions}>
                <AlertCircle size={24} color="var(--text-muted)" />
                <p>Nenhuma sessão agendada para os próximos dias.</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.quickActions}>
          <h3 className={styles.cardTitle}>Atalhos Clínicos</h3>
          <div className={styles.actionBtns}>
            <Link href="/dashboard/admin/pacientes/novo" className={styles.actionBtn}>
              <div className={styles.btnIcon}><Users size={18} /></div>
              <span>Novo Paciente</span>
            </Link>
            <Link href="/dashboard/admin/agenda/novo" className={styles.actionBtn}>
              <div className={styles.btnIcon}><Calendar size={18} /></div>
              <span>Agendar Sessão</span>
            </Link>
            <Link href="/dashboard/admin/prontuario" className={styles.actionBtn}>
              <div className={styles.btnIcon}><TrendingUp size={18} /></div>
              <span>Atualizar Prontuário</span>
            </Link>
            <Link href="/dashboard/admin/horarios" className={styles.actionBtn}>
              <div className={styles.btnIcon}><Clock size={18} /></div>
              <span>Configurar Horários</span>
            </Link>
          </div>

          <div className={styles.reminderCard} style={{background: 'rgba(230, 126, 34, 0.05)', borderColor: 'rgba(230, 126, 34, 0.2)'}}>
            <div className={styles.reminderHeader}>
              <AlertCircle size={16} color="#e67e22" />
              <span style={{color: '#e67e22'}}>Faturas Pendentes</span>
            </div>
            <div className={styles.pendingMiniList}>
              {pendingPayments.length > 0 ? pendingPayments.map(p => (
                <div key={p.id} className={styles.pendingMiniItem}>
                  <p><strong>{p.pacientes?.profiles?.nome || 'Paciente'}</strong></p>
                  <span>{formatCurrency(p.valor)}</span>
                </div>
              )) : (
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Nenhuma fatura pendente hoje. ✨</p>
              )}
            </div>
            <Link href="/dashboard/admin/financeiro" className={styles.viewAll} style={{marginTop: '1rem', display: 'block', fontSize: '0.75rem'}}>
              Ver financeiro completo →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
