'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from './prontuarioAdmin.module.css';
import Button from '@/components/ui/Button';
import { FileText, ClipboardList, User, Save } from 'lucide-react';

export default function ProntuarioAdminPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchPatients() {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, profiles(nome)');
      
      if (data && data.length > 0) {
        setPatients(data);
        setSelectedPatientId(data[0].id);
      }
      setLoading(false);
    }
    fetchPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;

    async function fetchPatientDetail() {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*, profiles(nome), anamneses(*)')
        .eq('id', selectedPatientId)
        .single();
      
      if (data) {
        setPatientData(data);
        setNotes(data.notas || '');
      }
    }
    fetchPatientDetail();
  }, [selectedPatientId]);

  const handleSave = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pacientes')
        .update({ notas: notes })
        .eq('id', selectedPatientId);

      if (error) throw error;
      addToast('Prontuário atualizado com sucesso! 📋', 'success');
    } catch (error) {
      addToast('Erro ao salvar prontuário', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando prontuários...</div>;
  if (patients.length === 0) return <div className={styles.empty}>Nenhum paciente encontrado.</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <FileText size={28} color="var(--color-green)" />
          <div>
            <h1>Prontuário Clínico</h1>
            <p className={styles.subtitle}>Gerencie o histórico e observações dos pacientes.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : <><Save size={16} /> Salvar Alterações</>}
        </Button>
      </div>

      <div className={styles.selector}>
        <User size={18} color="var(--text-muted)" />
        <label>Selecionar Paciente:</label>
        <div className={styles.selectWrapper}>
          <select 
            value={selectedPatientId} 
            onChange={e => setSelectedPatientId(e.target.value)}
            className={styles.select}
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.profiles?.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <ClipboardList size={20} className={styles.icon} color="var(--color-green)" />
            <h3>Dados da Anamnese</h3>
          </div>
          <div className={styles.fieldList}>
            <div className={styles.field}>
              <label>Queixa Principal</label>
              <p>{patientData?.anamneses?.[0]?.queixa_principal || 'Não informada'}</p>
            </div>
            {patientData?.anamneses?.[0]?.respostas && Object.entries(patientData.anamneses[0].respostas).map(([key, val]) => (
              <div key={key} className={styles.field}><label>{key}</label><p>{val}</p></div>
            ))}
            {!patientData?.anamneses?.[0] && <p className={styles.emptyMsg}>Nenhuma anamnese registrada.</p>}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <FileText size={20} className={styles.icon} color="var(--color-green)" />
            <h3>Notas da Sessão e Observações</h3>
          </div>
          <textarea 
            className={styles.textarea}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Digite aqui as observações da sessão..."
            rows={15}
          />
        </div>
      </div>
    </div>
  );
}
