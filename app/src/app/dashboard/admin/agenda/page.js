'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getDaysInMonth, getFirstDayOfMonth, getStatusColor, getStatusBg } from '@/utils/helpers';
import styles from './agendaAdmin.module.css';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Monitor, MapPin, Plus, Check, X, Trash2, MoreVertical } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function AdminAgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const { addToast } = useToast();
  const supabase = createClient();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  useEffect(() => {
    async function fetchMonthSessions() {
      setLoading(true);
      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('sessoes')
        .select('*, pacientes(profiles(nome))')
        .gte('data', startOfMonth)
        .lte('data', endOfMonth);

      if (error) {
        console.error('Error fetching sessions:', error);
      } else {
        setSessions(data || []);
      }
      setLoading(false);
    }

    fetchMonthSessions();
  }, [year, month]);

  const handleUpdateStatus = async (sessionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('sessoes')
        .update({ status: newStatus })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s));
      addToast(`Sessão ${newStatus === 'concluida' ? 'concluída' : 'atualizada'} com sucesso!`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      addToast('Erro ao atualizar status da sessão.', 'error');
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('sessoes')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      addToast('Agendamento excluído com sucesso.', 'success');
    } catch (error) {
      console.error('Error deleting session:', error);
      addToast('Erro ao excluir agendamento.', 'error');
    }
  };

  const getSessionsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return sessions.filter(s => s.data.startsWith(dateStr));
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const selectedDaySessions = getSessionsForDay(selectedDay);
  const selectedDateStr = `${selectedDay} de ${monthNames[month]} de ${year}`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <CalendarIcon size={28} color="var(--color-green)" />
          <h1>Agenda do Consultório</h1>
        </div>
        <Link href="/dashboard/admin/agenda/novo">
          <Button><Plus size={16} /> Agendar Paciente</Button>
        </Link>
      </div>

      <div className={styles.layout}>
        <div className={styles.calendarWrap}>
          <div className={styles.calHeader}>
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className={styles.navBtn}>
              <ChevronLeft size={18} />
            </button>
            <h2>{monthNames[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className={styles.navBtn}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className={styles.weekdays}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className={styles.weekday}>{d}</div>)}
          </div>
          <div className={styles.daysGrid}>
            {days.map((day, i) => {
              const daySessions = getSessionsForDay(day);
              const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              const isSelected = day === selectedDay;
              return (
                <div 
                  key={i} 
                  className={`${styles.dayCell} ${!day ? styles.empty : ''} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
                  onClick={() => day && setSelectedDay(day)}
                >
                  {day && (
                    <>
                      <span className={styles.dayNum}>{day}</span>
                      <div className={styles.dots}>
                        {daySessions.slice(0, 3).map((s, si) => (
                          <span key={si} className={styles.sessionDot} style={{ background: getStatusColor(s.status) }} />
                        ))}
                        {daySessions.length > 3 && <span className={styles.more}>+</span>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <h3>Sessões para o Dia</h3>
            <span className={styles.dateLabel}>{selectedDateStr}</span>
          </div>
          
          <div className={styles.todayList}>
            {selectedDaySessions.length > 0 ? selectedDaySessions.map(s => (
              <div key={s.id} className={styles.todaySession}>
                <div className={styles.tsMainInfo}>
                  <span className={styles.tsTime}>{new Date(s.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                  <div className={styles.tsInfo}>
                    <p className={styles.tsName}>{s.pacientes?.profiles?.nome || 'Paciente'}</p>
                    <span className={styles.tsType}><Monitor size={10} /> {s.tipo || 'Sessão'}</span>
                  </div>
                  <span className={styles.tsBadge} style={{ color: getStatusColor(s.status), background: getStatusBg(s.status) }}>{s.status}</span>
                </div>
                
                <div className={styles.tsActions}>
                  {s.status === 'pendente' && (
                    <button onClick={() => handleUpdateStatus(s.id, 'confirmada')} title="Confirmar" className={styles.confirmBtn}>
                      <Check size={16} />
                    </button>
                  )}
                  {s.status !== 'concluida' && s.status !== 'cancelada' && (
                    <button onClick={() => handleUpdateStatus(s.id, 'concluida')} title="Concluir" className={styles.completeBtn}>
                      <Check size={16} />
                    </button>
                  )}
                  {s.status !== 'cancelada' && (
                    <button onClick={() => handleUpdateStatus(s.id, 'cancelada')} title="Cancelar" className={styles.cancelBtn}>
                      <X size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(s.id)} title="Excluir" className={styles.deleteBtn}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )) : <p className={styles.emptyMsg}>Nenhuma sessão agendada para este dia.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
