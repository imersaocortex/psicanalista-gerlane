'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import styles from './prontuario.module.css';
import { FileText, User, Activity, ClipboardList } from 'lucide-react';

export default function ProntuarioPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    async function fetchProntuario() {
      try {
        const { data: patientData, error: pError } = await supabase
          .from('pacientes')
          .select(`
            *,
            profiles(nome, email),
            anamneses(*)
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (pError) {
          console.error('Error fetching patient for prontuario:', pError.message);
          return;
        }
        setData(patientData);
      } catch (error) {
        console.error('Error fetching prontuario:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProntuario();
  }, [user]);

  if (loading) return <div className={styles.loading}>Carregando seu prontuário...</div>;
  if (!data) return <div className={styles.empty}>Nenhum registro clínico encontrado.</div>;

  const anamnesis = data.anamneses?.[0];
  const age = data.data_nascimento ? new Date().getFullYear() - new Date(data.data_nascimento).getFullYear() : '?';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <FileText size={24} color="var(--color-green)" />
          <h1>Meu Prontuário</h1>
        </div>
        <p className={styles.subtitle}>Informações clínicas e anamnese.</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <User size={20} className={styles.icon} color="var(--color-green)" />
            <h3>Dados Pessoais</h3>
          </div>
          <div className={styles.fieldList}>
            <div className={styles.field}><label>Nome</label><span>{data.profiles?.nome}</span></div>
            <div className={styles.field}><label>Data de Nascimento</label><span>{data.data_nascimento ? new Date(data.data_nascimento).toLocaleDateString('pt-BR') : 'Não informada'}</span></div>
            <div className={styles.field}><label>Idade</label><span>{age} anos</span></div>
            <div className={styles.field}><label>Profissão</label><span>{data.profissao || 'Não informada'}</span></div>
            <div className={styles.field}><label>Contato de Emergência</label><span>{data.contato_emergencia || 'Não informado'}</span></div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <Activity size={20} className={styles.icon} color="var(--color-green)" />
            <h3>Informações Clínicas</h3>
          </div>
          <div className={styles.fieldList}>
            <div className={styles.field}><label>Queixa Principal</label><span>{anamnesis?.queixa_principal || 'Não informada'}</span></div>
            {anamnesis?.respostas && Object.entries(anamnesis.respostas).map(([key, val]) => (
              <div key={key} className={styles.field}><label>{key}</label><span>{val}</span></div>
            ))}
            {!anamnesis && <p className={styles.emptyMsg}>Nenhuma anamnese registrada.</p>}
          </div>
        </div>

        <div className={`${styles.card} ${styles.fullWidth}`}>
          <div className={styles.cardTitle}>
            <ClipboardList size={20} className={styles.icon} color="var(--color-green)" />
            <h3>Observações da Profissional</h3>
          </div>
          <p className={styles.notes}>{data.notas || 'Nenhuma observação registrada pela profissional.'}</p>
        </div>
      </div>
    </div>
  );
}
