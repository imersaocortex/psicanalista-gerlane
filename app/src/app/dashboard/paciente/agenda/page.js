'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getDaysInMonth, getFirstDayOfMonth, getStatusColor } from '@/utils/helpers';
import styles from './agenda.module.css';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Info, X, Clock, CheckCircle } from 'lucide-react';
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
  const [requesting, setRequesting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [viewingDetails, setViewingDetails] = useState(null); // Data selecionada para ver detalhes
  const supabase = createClient();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  useEffect(() => {
    if (!user) return;
    fetchSessions();
    fetchAvailability();
  }, [user, year, month]);

  async function fetchSessions() {
    setLoading(true);
    try {
      const { data: patient } = await supabase
        .from('pacientes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (patient) {
        const startOfMonth = new Date(year, month, 1).toISOString();
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

        const { data } = await supabase
          .from('sessoes')
          .select('*')
          .eq('paciente_id', patient.id)
          .gte('data', startOfMonth)
          .lte('data', endOfMonth);
        
        setSessions(data || []);

        // Verificação de pagamentos pendentes
        const { data: payments } = await supabase
          .from('pagamentos')
          .select('id')
          .eq('paciente_id', patient.id)
          .eq('status', 'pendente');
        
        setHasPendingPayment(payments?.length > 0);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailability() {
    const { data } = await supabase.from('disponibilidade').select('*');
    setAvailability(data || []);
  }

  const handleRequestSession = () => {
    if (hasPendingPayment) {
      addToast('Você possui faturas pendentes. Regularize seu financeiro para agendar novas sessões.', 'warning');
      return;
    }
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
    return sessions.filter(s => s.data.startsWith(dateStr));
  };

  const getAvailableTimesForDate = (date) => {
    if (!date) return [];
    const dayOfWeek = weekDays[date.getDay()];
    const dayAvailability = availability.find(a => a.dia_semana === dayOfWeek);
    if (!dayAvailability) return [];
    
    // Filter out booked slots
    return dayAvailability.horarios.filter(slot => !bookedSlots.includes(slot));
  };

  const handleConfirmRequest = async () => {
    if (!selectedDate || !selectedTime) return;
    setRequesting(true);
    try {
      const { data: patient, error: patientError } = await supabase
        .from('pacientes')
        .select('id, planos(nome, limite_sessoes)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (patientError || !patient) {
        throw new Error('Não foi possível identificar sua ficha de paciente. Entre em contato com a clínica.');
      }

      // Formata a data e hora
      const sessionDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Validação do Limite de Sessões no mês correspondente
      const reqYear = sessionDate.getFullYear();
      const reqMonth = sessionDate.getMonth();
      const reqStartOfMonth = new Date(reqYear, reqMonth, 1).toISOString();
      const reqEndOfMonth = new Date(reqYear, reqMonth + 1, 0, 23, 59, 59).toISOString();

      const { data: monthSessions, error: countError } = await supabase
        .from('sessoes')
        .select('id')
        .eq('paciente_id', patient.id)
        .gte('data', reqStartOfMonth)
        .lte('data', reqEndOfMonth)
        .neq('status', 'cancelada');

      if (countError) throw countError;

      const monthSessionsCount = monthSessions?.length || 0;
      const limit = patient.planos?.limite_sessoes || 4; // Padrão de 4 se não houver plano configurado

      console.log(`[Session Limit Validation] Month: ${monthNames[reqMonth]}, Limit: ${limit}, Scheduled: ${monthSessionsCount}`);

      if (monthSessionsCount >= limit) {
        // Disparar notificação e mensagem de WhatsApp via Evolution API alertando o paciente
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            title: 'Limite de Sessões Atingido ⚠️',
            message: `Você tentou agendar uma sessão para o dia ${sessionDate.toLocaleDateString('pt-BR')} às ${selectedTime}, mas atingiu o limite de ${limit} sessões contratadas para este mês (${monthNames[reqMonth]}). Caso queira agendar mais sessões, fale com a Dra. Gerlane para adquirir uma sessão avulsa ou faça o upgrade do seu plano.`,
            link: '/dashboard/paciente/planos'
          })
        }).catch(err => console.error('[Session Limit WhatsApp Alert Error]', err));

        throw new Error(`Você atingiu o limite de ${limit} sessões para este mês (${monthNames[reqMonth]}). Atualmente você possui ${monthSessionsCount} sessões ativas. Para agendar mais, adquira uma sessão avulsa ou faça o upgrade do seu plano.`);
      }

      const { error } = await supabase
        .from('sessoes')
        .insert({
          paciente_id: patient.id,
          data: sessionDate.toISOString(),
          status: 'pendente',
          observacoes: 'Solicitado via Portal do Paciente'
        });

      if (error) throw error;

      // Disparar notificação de sucesso para o próprio paciente
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: 'Agendamento Solicitado 📅',
          message: `Olá! Seu pedido de agendamento para o dia ${sessionDate.toLocaleDateString('pt-BR')} às ${selectedTime} foi enviado com sucesso para a clínica. Avisaremos assim que for confirmado!`,
          link: '/dashboard/paciente/agenda'
        })
      }).catch(err => console.error(err));

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
                      {new Date(s.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
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
                  min={new Date().toISOString().split('T')[0]}
                  onChange={async (e) => {
                    const dateStr = e.target.value;
                    const dateObj = new Date(dateStr + 'T12:00:00');
                    setSelectedDate(dateObj);
                    setSelectedTime(null);
                    
                    // Fetch all booked slots for this day
                    const startOfDay = new Date(dateStr + 'T00:00:00').toISOString();
                    const endOfDay = new Date(dateStr + 'T23:59:59').toISOString();
                    
                    const { data: booked } = await supabase
                      .from('sessoes')
                      .select('data')
                      .gte('data', startOfDay)
                      .lte('data', endOfDay)
                      .neq('status', 'cancelada');
                    
                    const times = booked?.map(s => {
                      const d = new Date(s.data);
                      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    }) || [];
                    
                    setBookedSlots(times);
                  }}
                />
              </div>

              {selectedDate && (
                <div className={styles.timeSection}>
                  <label>Horários Disponíveis para {weekDays[selectedDate.getDay()]}</label>
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
            </div>

            <div className={styles.modalFooter}>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleConfirmRequest} 
                disabled={!selectedDate || !selectedTime || requesting}
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
                      <span>{new Date(s.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
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
