'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from './financeiroNovo.module.css';
import Button from '@/components/ui/Button';
import { User, CreditCard, DollarSign, ArrowLeft, Save, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function NovoPagamentoPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    paciente_id: '',
    tipo_plano: 'avulso',
    valor: '',
    status: 'pendente',
    data: new Date().toISOString().split('T')[0]
  });

  const supabase = createClient();
  const { addToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchPatients() {
      const { data } = await supabase
        .from('pacientes')
        .select('id, profiles(nome)')
        .eq('status', 'ativo');
      
      setPatients(data || []);
      if (data?.length > 0) {
        setFormData(prev => ({ ...prev, paciente_id: data[0].id }));
      }
      setLoading(false);
    }
    fetchPatients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.paciente_id || !formData.valor || !formData.data) {
      addToast('Preencha todos os campos obrigatórios', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('pagamentos')
        .insert({
          paciente_id: formData.paciente_id,
          tipo_plano: formData.tipo_plano,
          valor: parseFloat(formData.valor),
          status: formData.status,
          data: new Date(formData.data).toISOString()
        });

      if (error) throw error;

      addToast('Fatura gerada com sucesso! 💰', 'success');
      router.push('/dashboard/admin/financeiro');
    } catch (error) {
      console.error('Error saving payment:', error);
      addToast('Erro ao gerar fatura.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando dados...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/admin/financeiro" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar para Financeiro
        </Link>
        <h1>Gerar Nova Fatura</h1>
        <p>Crie um novo lançamento de pagamento para o paciente.</p>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label><User size={16} /> Selecionar Paciente</label>
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
              <label><CreditCard size={16} /> Tipo de Plano</label>
              <select 
                value={formData.tipo_plano}
                onChange={e => setFormData({ ...formData, tipo_plano: e.target.value })}
                className={styles.select}
                required
              >
                <option value="avulso">Sessão Avulsa</option>
                <option value="mensal">Plano Mensal</option>
                <option value="trimestral">Plano Trimestral</option>
                <option value="semestral">Plano Semestral</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><DollarSign size={16} /> Valor (R$)</label>
              <input 
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.valor}
                onChange={e => setFormData({ ...formData, valor: e.target.value })}
                className={styles.input}
                required
              />
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label><Calendar size={16} /> Data de Lançamento / Vencimento</label>
              <input 
                type="date"
                value={formData.data}
                onChange={e => setFormData({ ...formData, data: e.target.value })}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Status Inicial</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className={styles.select}
                required
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>

          <div className={styles.footer}>
            <Button type="submit" disabled={saving}>
              {saving ? 'Gerando...' : <><Save size={16} /> Gerar Lançamento</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
