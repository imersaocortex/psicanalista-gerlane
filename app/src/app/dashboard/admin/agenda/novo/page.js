'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from './agendaNovo.module.css';
import Button from '@/components/ui/Button';
import { Calendar, Clock, User, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NovoAgendamentoPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    paciente_id: '',
    data: '',
    hora: '',
    observacoes: ''
  });
  const [availability, setAvailability] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);

  const daysMapping = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const supabase = createClient();
  const { addToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      // Fetch patients
      const { data: pData } = await supabase
        .from('pacientes')
        .select('id, user_id, profiles(nome)')
        .eq('status', 'ativo');
      
      setPatients(pData || []);
      if (pData?.length > 0) {
        setFormData(prev => ({ ...prev, paciente_id: pData[0].id }));
      }

      // Fetch availability
      const { data: aData } = await supabase
        .from('disponibilidade')
        .select('dia_semana, horarios');
      
      const mapped = {};
      aData?.forEach(item => {
        mapped[item.dia_semana] = item.horarios;
      });
      setAvailability(mapped);

      setLoading(false);
    }
    fetchData();
  }, []);

  // Update available slots and fetch booked sessions when date changes
  useEffect(() => {
    async function fetchBookedAndFilter() {
      if (!formData.data) return;

      const dateObj = new Date(formData.data + 'T00:00:00');
      const dayName = daysMapping[dateObj.getDay()];
      const baseSlots = availability[dayName] || [];

      // Fetch existing sessions for this date
      const startOfDay = new Date(formData.data + 'T00:00:00').toISOString();
      const endOfDay = new Date(formData.data + 'T23:59:59').toISOString();

      const { data: bookedData } = await supabase
        .from('sessoes')
        .select('data')
        .gte('data', startOfDay)
        .lte('data', endOfDay)
        .neq('status', 'cancelada');

      const bookedTimes = bookedData?.map(s => {
        const d = new Date(s.data);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }) || [];

      setBookedSlots(bookedTimes);
      
      // Filter baseSlots to exclude bookedTimes
      const filtered = baseSlots.filter(slot => !bookedTimes.includes(slot));
      setAvailableSlots(filtered);
      
      // Reset selected hour if it's not in the new slots
      if (filtered.length > 0 && !filtered.includes(formData.hora)) {
        setFormData(prev => ({ ...prev, hora: filtered[0] }));
      } else if (filtered.length === 0) {
        setFormData(prev => ({ ...prev, hora: '' }));
      }
    }

    fetchBookedAndFilter();
  }, [formData.data, availability]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.paciente_id || !formData.data || !formData.hora) {
      addToast('Preencha todos os campos obrigatórios', 'warning');
      return;
    }

    setSaving(true);
    try {
      const sessionDate = new Date(`${formData.data}T${formData.hora}:00`);
      
      const { error } = await supabase
        .from('sessoes')
        .insert({
          paciente_id: formData.paciente_id,
          data: sessionDate.toISOString(),
          status: 'agendada',
          observacoes: formData.observacoes
        });

      if (error) throw error;

      const selectedPatient = patients.find(p => p.id === formData.paciente_id);
      if (selectedPatient && selectedPatient.user_id) {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedPatient.user_id,
            title: 'Consulta Agendada 📅',
            message: `Olá ${selectedPatient.profiles?.nome?.split(' ')[0] || ''}! Uma nova sessão de terapia foi agendada para você no dia ${sessionDate.toLocaleDateString('pt-BR')} às ${formData.hora}.`,
            link: '/dashboard/paciente/agenda'
          })
        }).catch(err => console.error(err));
      }

      addToast('Sessão agendada com sucesso! 📅', 'success');
      router.push('/dashboard/admin/agenda');
    } catch (error) {
      console.error('Error saving session:', error);
      addToast('Erro ao agendar sessão. Verifique se o horário está disponível.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando pacientes...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/admin/agenda" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar para Agenda
        </Link>
        <h1>Novo Agendamento</h1>
        <p>Preencha os dados abaixo para reservar um horário.</p>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label><User size={16} /> Paciente</label>
            <select 
              value={formData.paciente_id}
              onChange={e => setFormData({ ...formData, paciente_id: e.target.value })}
              className={styles.select}
              required
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.profiles?.nome}</option>
              ))}
            </select>
          </div>

          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label><Calendar size={16} /> Data</label>
              <input 
                type="date"
                value={formData.data}
                onChange={e => setFormData({ ...formData, data: e.target.value })}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label><Clock size={16} /> Horário</label>
              <select 
                value={formData.hora}
                onChange={e => setFormData({ ...formData, hora: e.target.value })}
                className={styles.select}
                required
                disabled={!formData.data || availableSlots.length === 0}
              >
                {availableSlots.length > 0 ? (
                  <>
                    <option value="" disabled>Selecione um horário</option>
                    {availableSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </>
                ) : (
                  <option value="">{formData.data ? 'Sem horários para este dia' : 'Selecione uma data primeiro'}</option>
                )}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Observações / Notas</label>
            <textarea 
              value={formData.observacoes}
              onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Ex: Primeira sessão, foco em ansiedade..."
              className={styles.textarea}
              rows={4}
            />
          </div>

          <div className={styles.footer}>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : <><Save size={16} /> Confirmar Agendamento</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
