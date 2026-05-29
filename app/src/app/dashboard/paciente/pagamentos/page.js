'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, getStatusColor, getStatusBg, formatDate } from '@/utils/helpers';
import styles from './pagamentos.module.css';
import Button from '@/components/ui/Button';
import { CreditCard, Receipt, CheckCircle2 } from 'lucide-react';

export default function PagamentosPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      addToast('Pagamento processado! Ele será atualizado em instantes após a confirmação do Asaas.', 'success');
      // Usar o router do Next.js para não quebrar a hidratação e o estado da página
      router.replace('/dashboard/paciente/pagamentos');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchPayments() {
      setLoading(true);
      try {
        const { data: patient, error: patientError } = await supabase
          .from('pacientes')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (patientError) {
          console.error('Error fetching patient record:', patientError.message);
          return;
        }

        if (patient) {
          const { data } = await supabase
            .from('pagamentos')
            .select('*')
            .eq('paciente_id', patient.id)
            .order('data', { ascending: false });
          
          setPayments(data || []);
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [user]);

  const handlePay = async (paymentId) => {
    try {
      addToast('Gerando link de pagamento...', 'info');
      
      const response = await fetch('/api/payments/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
        addToast('Link de pagamento aberto em nova aba!', 'success');
        
        // Atualiza localmente para refletir que está processando
        setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'processando' } : p));
      } else {
        throw new Error('Link de pagamento não recebido');
      }
    } catch (error) {
      console.error('Payment error:', error);
      addToast(error.message || 'Erro ao processar pagamento', 'error');
    }
  };

  if (loading) return <div className={styles.loading}>Carregando pagamentos...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <CreditCard size={28} color="var(--color-green)" />
          <div>
            <h1>Pagamentos</h1>
            <p className={styles.subtitle}>Gerencie seus planos e faturas.</p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'24px'}}>
          <Receipt size={20} color="var(--text-muted)" />
          <h3 className={styles.sectionTitle} style={{marginBottom:0}}>Histórico de Faturas</h3>
        </div>
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Plano</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className={styles.bold}>{p.tipo_plano}</td>
                  <td>{formatCurrency(p.valor)}</td>
                  <td>{formatDate(p.data)}</td>
                  <td>
                    <span className={styles.statusBadge} style={{ color: getStatusColor(p.status), background: getStatusBg(p.status) }}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.status === 'pendente' && <Button size="sm" onClick={() => handlePay(p.id)}>Pagar</Button>}
                    {p.status === 'pago' && <button className={styles.receiptBtn}><CheckCircle2 size={12} /> Recibo</button>}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="5" className={styles.emptyTable}>Nenhum histórico de pagamento.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
