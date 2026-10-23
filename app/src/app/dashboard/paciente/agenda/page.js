'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { clinicDate, clinicSlot } from '@/lib/billing.mjs';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getDaysInMonth, getFirstDayOfMonth, getStatusColor } from '@/utils/helpers';
import styles from './agenda.module.css';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Info, X, Clock, CheckCircle, Monitor, Building2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function AgendaPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedModality, setSelectedModality] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [balance, setBalance] = useState(null);
  const slotsRequest = useRef(0);
  const [viewingDetails, setViewingDetails] = useState(null); // Data selecionada para ver detalhes
  const [supabase] = useState(() => createClient());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];


  const fetchSessions = useCallback(async () => {
    try {
      const { data: patient } = await supabase
        .from('pacientes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (patient) {
        const startOfMonth = clinicSlot(`${year}-${String(month + 1).padStart(2, '0')}-01`, '00:00');
        const nextMonth = new Date(Date.UTC(year, month + 1, 1));
        const endOfMonth = clinicSlot(nextMonth.toISOString().slice(0,10), '00:00');

        const { data } = await supabase
          .from('sessoes')
          .select('*')
          .eq('paciente_id', patient.id)
          .gte('data', startOfMonth)
          .lt('data', endOfMonth);

        setSessions(data || []);

        // Verificação de pagamentos pendentes
        const { data: credits, error: balanceError } = await supabase.rpc('acolher_booking_balance');
        setBalance(balanceError ? null : credits);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, user, year, month]);

  const fetchAvailability = useCallback(async () => {
    const { data } = await supabase.from('disponibilidade').select('*');
    setAvailability(data || []);
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.resolve().then(() => { if (active) { fetchSessions(); fetchAvailability(); } });
    return () => { active = false; };
  }, [user, year, month, fetchSessions, fetchAvailability]);

  const handleRequestSession = () => {
    if (!balance) {
      addToast(balance === null ? 'A agenda precisa de conferência da clínica. Tente novamente mais tarde.' : 'Confirme o pagamento em Pagamentos para liberar seu saldo de sessões.', 'warning');
      return;
    }
    setSelectedDate(null); setSelectedTime(null); setSelectedModality(null); setBookedSlots([]); slotsRequest.current++;
    setIsModalOpen(true);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const daySessions = getSessionsForDay(day);
    if (daySessions.length > 0) {
      setViewingDetails({
        day,
        sessions: daySessions
      });
    }
  };

  const getSessionsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return sessions.filter(s => clinicDate(s.data) === dateStr);
  };

  const getAvailableTimesForDate = (date) => {
    if (!date) return [];
    const dayOfWeek = weekDays[new Date(clinicDate(date) + 'T12:00:00Z').getUTCDay()];
    const dayAvailability = availability.find(a => a.dia_semana === dayOfWeek);
    if (!dayAvailability) return [];

    // Filter out booked slots
    return (Array.isArray(dayAvailability.horarios) ? dayAvailability.horarios : []).filter(slot => !bookedSlots.includes(slot) && new Date(clinicSlot(clinicDate(date), slot)).getTime() > Date.now());
  };

  const handleConfirmRequest = async () => {
    if (!selectedDate || !selectedTime || !selectedModality || requesting) return;
    setRequesting(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: clinicDate(selectedDate), time: selectedTime, modality: selectedModality }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível solicitar o horário.');

      addToast('Solicitação enviada! Aguarde a confirmação da clínica.', 'success');
      setIsModalOpen(false);
      fetchSessions();
    } catch (error) {
      console.error('Error requesting session:', error.message || error);
      addToast(error.message || 'Erro ao solicitar horário.', 'error');
    } finally {
      setRequesting(false);
    }
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}></div>
      <p>Sincronizando sua agenda...</p>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <CalendarIcon size={28} color="var(--color-green)" />
          <div>
            <h1>Minha Agenda</h1>
            <p className={styles.subtitle}>Acompanhe seus horários agendados.</p>
          </div>
        </div>
        <Button onClick={handleRequestSession}>
          <Plus size={18} /> Solicitar Horário
        </Button>
      </div>

      <p>{balance === null ? 'Não foi possível verificar seu saldo de sessões.' : 'Saldo de sessões pagas: ' + balance + '.'} <Link href="/dashboard/paciente/pagamentos">Ver pagamentos</Link></p>
      <div className={styles.calendarContainer}>
        <div className={styles.calHeader}>
          <h2>{monthNames[month]} {year}</h2>
          <div className={styles.navBtns}>
            <button className={styles.navBtn} onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
              <ChevronLeft size={20} />
            </button>
            <button className={styles.navBtn} onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className={styles.weekdays}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className={styles.weekday}>{d}</div>
          ))}
        </div>

        <div className={styles.daysGrid}>
          {days.map((day, i) => {
            if (!day) return <div key={i} className={`${styles.dayCell} ${styles.empty}`}></div>;

            const daySessions = getSessionsForDay(day);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div
                key={i}
                className={`${styles.dayCell} ${isToday ? styles.today : ''} ${daySessions.length > 0 ? styles.hasSession : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <span className={styles.dayNum}>{day}</span>
                <div className={styles.sessionContainer}>
                  {daySessions.map(s => (
                    <div key={s.id} className={styles.sessionTag} style={{borderLeft: `3px solid ${getStatusColor(s.status)}`}}>
                      {new Date(s.data).toLocaleTimeString('pt-BR', {timeZone: 'America/Sao_Paulo', hour: '2-digit', minute:'2-digit'})}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.footerInfo}>
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{background: 'var(--color-info)'}}></span>
              <span>Pendente</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{background: 'var(--color-success)'}}></span>
              <span>Confirmada</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{background: 'var(--color-error)'}}></span>
              <span>Cancelada</span>
            </div>
          </div>
          <div className={styles.infoAlert}>
            <Info size={16} />
            <p>Clique em um dia para ver os detalhes das sessões.</p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3><Clock size={20} /> Solicitar Novo Horário</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Selecione a Data</label>
                <input
                  type="date"
                  min={clinicDate()}
                  onChange={async (e) => {
                    const requestId = ++slotsRequest.current;
                    const dateStr = e.target.value;
                    setSelectedDate(null); setSelectedTime(null); setSelectedModality(null); setBookedSlots([]);
                    if (!dateStr) return;
                    const { data: booked, error: bookedError } = await supabase.rpc('booked_session_slots', { p_day: dateStr });
                    if (requestId !== slotsRequest.current) return;
                    if (bookedError) { addToast('Não foi possível consultar os horários. Tente novamente.', 'error'); return; }
                    const times = (booked || []).map(s => new Date(s.data).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }));
                    setSelectedDate(new Date(dateStr + 'T12:00:00-03:00'));
                    setBookedSlots(times);
                  }}
                />
              </div>

              {selectedDate && (
                <div className={styles.timeSection}>
                  <label>Horários Disponíveis para {weekDays[new Date(clinicDate(selectedDate) + 'T12:00:00Z').getUTCDay()]}</label>
                  <div className={styles.timeGrid}>
                    {getAvailableTimesForDate(selectedDate).length > 0 ? (
                      getAvailableTimesForDate(selectedDate).map(time => (
                        <button
                          key={time}
                          className={`${styles.timeBtn} ${selectedTime === time ? styles.selectedTime : ''}`}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </button>
                      ))
                    ) : (
                      <p className={styles.noTimes}>Dra. Gerlane não possui horários disponíveis neste dia.</p>
                    )}
                  </div>
                </div>
              )}

              {selectedTime && (
                <div className={styles.modalitySection}>
                  <label>Selecione a Modalidade</label>
                  <div className={styles.modalityGrid}>
                    <button
                      className={`${styles.modalityBtn} ${selectedModality === 'presencial' ? styles.activeModality : ''}`}
                      onClick={() => setSelectedModality('presencial')}
                    >
                      <Building2 size={18} /> Presencial
                    </button>
                    <button
                      className={`${styles.modalityBtn} ${selectedModality === 'online' ? styles.activeModality : ''}`}
                      onClick={() => setSelectedModality('online')}
                    >
                      <Monitor size={18} /> Online
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleConfirmRequest}
                disabled={!selectedDate || !selectedTime || !selectedModality || requesting}
              >
                {requesting ? 'Enviando...' : 'Confirmar Solicitação'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewingDetails && (
        <div className={styles.modalOverlay} onClick={() => setViewingDetails(null)}>
          <div className={styles.detailModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3><CalendarIcon size={20} /> Detalhes do Dia {viewingDetails.day}</h3>
              <button onClick={() => setViewingDetails(null)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailsList}>
                {viewingDetails.sessions.map(s => (
                  <div key={s.id} className={styles.detailItem}>
                    <div className={styles.detailTime}>
                      <Clock size={16} />
                      <span>{new Date(s.data).toLocaleTimeString('pt-BR', {timeZone: 'America/Sao_Paulo', hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className={styles.detailStatus}>
                      <span className={styles.statusBadge} style={{backgroundColor: getStatusColor(s.status)}}>
                        {s.status.toUpperCase()}
                      </span>
                    </div>
                    <div className={styles.detailInfo}>
                      <p><strong>Tipo:</strong> Psicanálise Clínica</p>
                      {s.observacoes && <p><strong>Nota:</strong> {s.observacoes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <Button style={{width: '100%'}} onClick={() => setViewingDetails(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
