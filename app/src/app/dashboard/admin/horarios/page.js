'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './horarios.module.css';
import Button from '@/components/ui/Button';
import { Clock, Check, Loader2 } from 'lucide-react';

const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const defaultTimeSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export default function HorariosPage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState({});
  const [timeSlots, setTimeSlots] = useState(defaultTimeSlots);
  const [newSlot, setNewSlot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    fetchAvailability();
  }, [user]);
  async function fetchAvailability() {
    try {
      const { data: configData } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('admin_id', user.id)
        .eq('chave', 'horarios_disponiveis')
        .maybeSingle();

      if (configData?.valor) {
        setTimeSlots(configData.valor);
      }

      const { data, error } = await supabase
        .from('disponibilidade')
        .select('*')
        .eq('admin_id', user.id);
      
      if (error) throw error;
      
      const mapped = {};
      data?.forEach(item => {
        mapped[item.dia_semana] = item.horarios;
      });
      setSchedule(mapped);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  }

  const addTimeSlot = () => {
    if (!newSlot) return;
    if (timeSlots.includes(newSlot)) {
      addToast('Este horário já existe.', 'warning');
      return;
    }
    const sorted = [...timeSlots, newSlot].sort();
    setTimeSlots(sorted);
    setNewSlot('');
    addToast('Horário adicionado à grade!', 'info');
  };

  const removeTimeSlot = (time) => {
    setTimeSlots(prev => prev.filter(t => t !== time));
    addToast('Horário removido da grade.', 'info');
  };

  const toggleSlot = (day, time) => {
    setSchedule(prev => {
      const daySlots = prev[day] || [];
      const newSlots = daySlots.includes(time) ? daySlots.filter(t => t !== time) : [...daySlots, time];
      return { ...prev, [day]: newSlots };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Iniciando salvamento de horários...', { userId: user.id });
      
      // Passo 1: Salvar a grade de horários (a lista de 08:00, 09:00...)
      const { error: configError } = await supabase
        .from('configuracoes_sistema')
        .upsert({
          admin_id: user.id,
          chave: 'horarios_disponiveis',
          valor: timeSlots,
          updated_at: new Date().toISOString()
        }, { onConflict: 'admin_id, chave' });

      if (configError) {
        console.error('Erro no Passo 1 (configuracoes_sistema):', configError);
        throw new Error(`Erro ao salvar grade de horários: ${configError.message}`);
      }

      // Passo 2: Salvar a disponibilidade para cada dia
      console.log('Passo 1 concluído. Iniciando Passo 2 (disponibilidade)...');
      
      for (const day of daysOfWeek) {
        const slots = schedule[day] || [];
        const { error: dispError } = await supabase
          .from('disponibilidade')
          .upsert({
            admin_id: user.id,
            dia_semana: day,
            horarios: slots,
            updated_at: new Date().toISOString()
          }, { onConflict: 'admin_id, dia_semana' });
        
        if (dispError) {
          console.error(`Erro no Passo 2 - Dia ${day}:`, dispError);
          throw new Error(`Erro ao salvar dia ${day}: ${dispError.message}`);
        }
      }

      addToast('Disponibilidade e horários salvos! ✅', 'success');
    } catch (error) {
      console.error('ERRO DETALHADO NO SALVAMENTO:', error);
      // Forçar a exibição da mensagem de erro no Toast
      addToast(error.message || 'Erro inesperado ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loader}><Loader2 className={styles.spin} /> Carregando...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <Clock size={28} color="var(--color-green)" />
          <div>
            <h1>Minha Disponibilidade</h1>
            <p className={styles.subtitle}>Os pacientes só poderão agendar nos horários marcados aqui.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <div className={styles.configCard}>
        <h3>Gerenciar Grade de Horários</h3>
        <p>Adicione ou remova os horários que você atende (ex: 08:30, 14:15).</p>
        <div className={styles.addSlotArea}>
          <input 
            type="time" 
            value={newSlot} 
            onChange={e => setNewSlot(e.target.value)}
            className={styles.timeInput}
          />
          <Button onClick={addTimeSlot} variant="secondary">Adicionar Horário</Button>
        </div>
        <div className={styles.activeSlots}>
          {timeSlots.map(time => (
            <span key={time} className={styles.slotBadge}>
              {time}
              <button onClick={() => removeTimeSlot(time)}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.timeCol}>Horário</th>
                {daysOfWeek.map(day => <th key={day}>{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time}>
                  <td className={styles.timeLabel}>{time}</td>
                  {daysOfWeek.map(day => {
                    const isActive = (schedule[day] || []).includes(time);
                    return (
                      <td key={day} className={styles.slotCell}>
                        <button 
                          className={`${styles.slotBtn} ${isActive ? styles.active : ''}`}
                          onClick={() => toggleSlot(day, time)}
                        >
                          {isActive ? <Check size={16} /> : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}><span className={styles.dot} style={{background: 'rgba(45, 106, 79, 0.1)', border: '1px solid var(--color-green)'}}></span> Disponível</div>
        <div className={styles.legendItem}><span className={styles.dot} style={{background: 'var(--bg-secondary)'}}></span> Indisponível</div>
      </div>
    </div>
  );
}
