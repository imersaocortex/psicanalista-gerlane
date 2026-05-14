'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { exportToPDF } from '@/utils/exportPDF';
import styles from './anamnese.module.css';
import Button from '@/components/ui/Button';
import { ClipboardList, Heart, Brain, Activity, Save, ChevronRight, ChevronLeft, CheckCircle, Quote, Download, File, Paperclip } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';

import AnamneseReport from '@/components/dashboard/AnamneseReport';

export default function AnamnesePacientePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    queixa_principal: '',
    historico_familiar: '',
    saude_fisica: '',
    uso_medicamentos: '',
    sono: '',
    alimentacao: '',
    objetivos: ''
  });
  const [arquivos, setArquivos] = useState([]);

  useEffect(() => {
    if (!user) return;

    async function checkExisting() {
      const { data: patient, error: patientError } = await supabase
        .from('pacientes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (patientError) {
        console.error('Error fetching patient for anamnese:', patientError.message);
        setLoading(false);
        return;
      }

      if (patient) {
        const { data } = await supabase
          .from('anamneses')
          .select('*')
          .eq('paciente_id', patient.id)
          .limit(1);
        
        if (data?.length > 0) {
          setAlreadyDone(true);
          setFormData({
            queixa_principal: data[0].queixa_principal,
            ...data[0].respostas
          });
          setArquivos(data[0].arquivos || []);
        }
      }
      setLoading(false);
    }
    checkExisting();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      console.log('Iniciando envio de anamnese...');
      
      const { data: patient, error: pError } = await supabase
        .from('pacientes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (pError) throw pError;
      if (!patient) throw new Error('Paciente não encontrado no prontuário.');

      console.log('Paciente encontrado:', patient.id);

      const { queixa_principal, ...respostas } = formData;

      const { error: iError } = await supabase
        .from('anamneses')
        .insert({
          paciente_id: patient.id,
          queixa_principal: queixa_principal,
          respostas: respostas
        });

      if (iError) {
        console.error('Erro na inserção:', iError);
        throw iError;
      }

      addToast('Anamnese enviada com sucesso! ✨', 'success');
      setAlreadyDone(true);
    } catch (error) {
      console.error('Erro Geral Anamnese:', error);
      addToast(error.message || 'Erro ao salvar anamnese.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    addToast('Gerando seu relatório PDF...', 'info');
    const success = await exportToPDF('anamnese-report', `Anamnese_${user?.email || 'Paciente'}.pdf`);
    if (success) {
      addToast('PDF gerado com sucesso!', 'success');
    } else {
      addToast('Erro ao gerar PDF.', 'error');
    }
  };

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Skeleton width="300px" height="40px" />
        <Skeleton width="100%" height="20px" style={{marginTop: '10px'}} />
      </div>
      <div className={styles.reportPaper}>
        <Skeleton width="100%" height="200px" />
        <Skeleton width="100%" height="200px" style={{marginTop: '20px'}} />
      </div>
    </div>
  );

  if (!alreadyDone) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}><ClipboardList size={64} /></div>
        <h1>Anamnese Clínica</h1>
        <p>Sua anamnese clínica ainda não foi preenchida pela sua terapeuta.</p>
        <p className={styles.subText}>A Dra. Gerlane preencherá este documento durante ou após as suas primeiras sessões.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><ClipboardList size={32} /></div>
        <div>
          <h1>Minha Anamnese Clínica</h1>
          <p>Documento oficial do seu prontuário clínico. Última atualização em {new Date().toLocaleDateString('pt-BR')}.</p>
        </div>
        <Button onClick={handleExport} variant="secondary">
          <Download size={16} /> Exportar PDF
        </Button>
      </div>

      <AnamneseReport formData={formData} arquivos={arquivos} id="anamnese-report" />
    </div>
  );
}
