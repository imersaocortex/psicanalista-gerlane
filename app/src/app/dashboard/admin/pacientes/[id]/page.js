'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate } from '@/utils/helpers';
import styles from './pacienteDetalhes.module.css';
import Button from '@/components/ui/Button';
import { ArrowLeft, User, Phone, Calendar, Briefcase, Mail, Save, Trash2, History, ClipboardList, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function PacienteDetalhesPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    profissao: '',
    status: 'ativo'
  });
  const [lastPayment, setLastPayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pendente');
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchPatient() {
      const { data, error } = await supabase
        .from('pacientes')
        .select(`
          *,
          profiles:user_id (
            nome,
            email
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error('Error fetching patient:', error);
        addToast('Paciente não encontrado ou ID inválido.', 'error');
        router.push('/dashboard/admin/pacientes');
      } else {
        setPatient(data);
        setFormData({
          nome: data.profiles?.nome || '',
          email: data.profiles?.email || '',
          telefone: data.telefone || '',
          data_nascimento: data.data_nascimento || '',
          profissao: data.profissao || '',
          status: data.status || 'ativo'
        });

        // Buscar última fatura
        const { data: payData } = await supabase
          .from('pagamentos')
          .select('*')
          .eq('paciente_id', id)
          .order('data', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (payData) {
          setLastPayment(payData);
          setPaymentStatus(payData.status);
        }
      }
      setLoading(false);
    }

    async function fetchData() {
      const { data: plansData } = await supabase.from('planos').select('*');
      setPlans(plansData || []);
      await fetchPatient();
    }
    
    fetchData();
  }, [id]);

  const handleCreateInvoice = async () => {
    if (!selectedPlanId) {
      addToast('Selecione um plano primeiro.', 'warning');
      return;
    }

    setCreatingInvoice(true);
    // Use loose equality to handle string/number type mismatch from select element
    const plan = plans.find(p => String(p.id) === String(selectedPlanId));
    
    if (!plan) {
      addToast('Plano selecionado não encontrado.', 'error');
      setCreatingInvoice(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pagamentos')
        .insert({
          paciente_id: id,
          valor: plan.preco,
          tipo_plano: plan.periodicidade || 'avulso',
          status: 'pendente',
          data: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error.message, error.code, error.details, error.hint);
        throw error;
      }

      setLastPayment(data);
      setPaymentStatus(data.status);
      addToast('Fatura inicial gerada com sucesso!', 'success');
    } catch (error) {
      console.error('Error creating invoice:', error?.message || error);
      addToast(error?.message || 'Erro ao gerar fatura.', 'error');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Update Profile (Name/Email if needed)
      // Note: Changing email in Auth requires more steps, so we usually don't do it here easily.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nome: formData.nome })
        .eq('id', patient.user_id);

      if (profileError) throw profileError;

      // 2. Update Patient clinical record
      const { error: patientError } = await supabase
        .from('pacientes')
        .update({
          telefone: formData.telefone,
          data_nascimento: formData.data_nascimento,
          profissao: formData.profissao,
          status: formData.status
        })
        .eq('id', id);

      if (patientError) throw patientError;

      // 3. Update Payment Status if changed
      if (lastPayment && paymentStatus !== lastPayment.status) {
        await supabase
          .from('pagamentos')
          .update({ status: paymentStatus })
          .eq('id', lastPayment.id);
      }

      addToast('Dados do paciente atualizados!', 'success');
    } catch (error) {
      console.error('Error updating patient:', error);
      addToast('Erro ao atualizar dados.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Deseja realmente arquivar este paciente? Os dados não serão deletados, mas ele não aparecerá nas listas ativas.')) {
      try {
        const { error } = await supabase
          .from('pacientes')
          .update({ status: 'arquivado' })
          .eq('id', id);
        
        if (error) throw error;
        addToast('Paciente arquivado com sucesso.', 'success');
        router.push('/dashboard/admin/pacientes');
      } catch (error) {
        addToast('Erro ao arquivar paciente.', 'error');
      }
    }
  };

  const handlePermanentDelete = async () => {
    if (confirm('Tem certeza que deseja excluir permanentemente este paciente e todos os seus dados (sessões, pagamentos, anamnese)? Esta ação não pode ser desfeita.')) {
      setLoading(true);
      try {
        // 1. Delete sessoes
        const { error: sessoesError } = await supabase
          .from('sessoes')
          .delete()
          .eq('paciente_id', id);
        if (sessoesError) throw sessoesError;

        // 2. Delete pagamentos
        const { error: pagamentosError } = await supabase
          .from('pagamentos')
          .delete()
          .eq('paciente_id', id);
        if (pagamentosError) throw pagamentosError;

        // 3. Delete anamneses
        const { error: anamnesesError } = await supabase
          .from('anamneses')
          .delete()
          .eq('paciente_id', id);
        if (anamnesesError) throw anamnesesError;

        // 4. Delete pacientes
        const { error: pacienteError } = await supabase
          .from('pacientes')
          .delete()
          .eq('id', id);
        if (pacienteError) throw pacienteError;

        // 5. Delete profiles
        if (patient?.user_id) {
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', patient.user_id);
          if (profileError) throw profileError;
        }

        addToast('Paciente excluído com sucesso!', 'success');
        router.push('/dashboard/admin/pacientes');
      } catch (error) {
        console.error('Error deleting patient:', error);
        addToast(error.message || 'Erro ao excluir paciente.', 'error');
        setLoading(false);
      }
    }
  };

  if (loading) return <div className={styles.loading}>Carregando perfil...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/admin/pacientes" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar
        </Link>
        <div className={styles.titleArea}>
          <h1>Ficha do Paciente</h1>
          <div className={styles.actions}>
            <Button variant="outline" onClick={handleDelete} className={styles.archiveBtn}>
              Arquivar
            </Button>
            <Button variant="danger" onClick={handlePermanentDelete} className={styles.deleteBtn}>
              <Trash2 size={16} /> Excluir permanentemente
            </Button>
            <Link href={`/dashboard/admin/pacientes/${id}/anamnese`}>
              <Button variant="outline">
                <ClipboardList size={16} /> Ficha de Anamnese
              </Button>
            </Link>
            <Link href={`/dashboard/admin/prontuario?id=${id}`}>
              <Button variant="secondary">
                <History size={16} /> Ver Prontuário
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <User size={20} color="var(--color-green)" />
            <h3>Informações Cadastrais</h3>
          </div>
          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Nome Completo</label>
              <input 
                type="text"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>E-mail (Apenas Visualização)</label>
              <input 
                type="email"
                value={formData.email}
                disabled
                className={styles.input}
                style={{ opacity: 0.6 }}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label><Phone size={14} /> Telefone</label>
                <input 
                  type="text"
                  value={formData.telefone}
                  onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label><Calendar size={14} /> Data de Nascimento</label>
                <input 
                  type="date"
                  value={formData.data_nascimento}
                  onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label><Briefcase size={14} /> Profissão</label>
                <input 
                  type="text"
                  value={formData.profissao}
                  onChange={e => setFormData({ ...formData, profissao: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Status Clínico</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className={styles.select}
                >
                  <option value="ativo">Ativo</option>
                  <option value="em_espera">Em Espera</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>
            </div>

            <div className={styles.footer}>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : <><Save size={16} /> Salvar Alterações</>}
              </Button>
            </div>
          </form>
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.card}>
            <h3>Resumo de Sessões</h3>
            <p className={styles.emptyMsg}>Histórico detalhado em breve.</p>
          </div>
          
          <div className={styles.card} style={{ borderTop: '4px solid var(--color-warning)' }}>
            <div className={styles.cardHeader}>
              <CreditCard size={18} color="var(--color-warning)" />
              <h3>Financeiro (Última Fatura)</h3>
            </div>
            {lastPayment ? (
              <div className={styles.paymentInfo}>
                <p><strong>Plano:</strong> {lastPayment.tipo_plano}</p>
                <p><strong>Valor:</strong> {formatCurrency(lastPayment.valor)}</p>
                <p><strong>Data:</strong> {formatDate(lastPayment.data)}</p>
                <div className={styles.statusSelectGroup}>
                  <label>Alterar Status:</label>
                  <select 
                    value={paymentStatus} 
                    onChange={e => setPaymentStatus(e.target.value)}
                    className={styles.statusSelect}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className={styles.createInvoiceArea}>
                <p className={styles.emptyMsg}>Este paciente não possui histórico financeiro.</p>
                <div className={styles.formGroup} style={{marginTop: '1rem'}}>
                  <label>Gerar cobrança do plano:</label>
                  <select 
                    className={styles.select}
                    value={selectedPlanId}
                    onChange={e => setSelectedPlanId(e.target.value)}
                  >
                    <option value="">Selecione um Plano</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} - {formatCurrency(p.preco)}</option>
                    ))}
                  </select>
                </div>
                <Button 
                  style={{width: '100%', marginTop: '1rem'}} 
                  onClick={handleCreateInvoice}
                  disabled={creatingInvoice}
                >
                  {creatingInvoice ? 'Gerando...' : 'Gerar Fatura Inicial'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
