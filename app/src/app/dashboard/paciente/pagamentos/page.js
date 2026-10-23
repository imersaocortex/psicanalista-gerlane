'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, getStatusColor, getStatusBg, formatDate } from '@/utils/helpers';
import { PAYABLE_STATUSES } from '@/lib/billing.mjs';
import styles from './pagamentos.module.css';
import Button from '@/components/ui/Button';
import { CreditCard, CheckCircle2 } from 'lucide-react';

export default function PagamentosPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [pix, setPix] = useState(null);
  const [supabase] = useState(() => createClient());

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    try {
      const { data: patient, error } = await supabase.from('pacientes').select('id').eq('user_id', user.id).maybeSingle();
      if (error || !patient) throw new Error('Não foi possível consultar sua ficha.');
      const { data, error: paymentError } = await supabase.from('pagamentos').select('*').eq('paciente_id', patient.id).order('data', { ascending: false });
      if (paymentError) throw new Error('Não foi possível atualizar as faturas.');
      setPayments(data || []);
      setPix(current => current && data?.some(p => p.id === current.paymentId && !PAYABLE_STATUSES.includes(p.status)) ? null : current);
    } catch (error) { addToast(error.message, 'error'); }
    finally { setLoading(false); }
  }, [user, supabase, addToast]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.resolve().then(() => { if (active) fetchPayments(); });
    const refresh = () => { if (document.visibilityState === 'visible') fetchPayments(); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [user, fetchPayments]);

  const checkStatus = useCallback(async (paymentId, quiet = false) => {
    try {
      const response = await fetch('/api/payments/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível consultar o Asaas.');
      if (!quiet || data.status === 'pago') addToast(data.status === 'pago' ? 'Pagamento confirmado! Você já pode consultar sua agenda.' : 'Pagamento ainda não confirmado. Aguarde ou consulte a clínica.', data.status === 'pago' ? 'success' : 'info');
      await fetchPayments();
    } catch (error) { if (!quiet) addToast(error.message, 'error'); }
  }, [addToast, fetchPayments]);

  useEffect(() => {
    if (!pix) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') checkStatus(pix.paymentId, true); }, 30000);
    return () => clearInterval(timer);
  }, [pix, checkStatus]);

  const handlePay = async (paymentId, billingType) => {
    if (busy) return;
    setBusy(paymentId);
    try {
      const response = await fetch('/api/payments/asaas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId, billingType }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível preparar o pagamento.');
      if (data.paid) { addToast('Pagamento já confirmado.', 'success'); await fetchPayments(); }
      else if (data.pix) { setPix({ ...data.pix, paymentId, invoiceUrl: data.invoiceUrl }); await fetchPayments(); }
      else if (data.invoiceUrl) window.location.assign(data.invoiceUrl);
      else throw new Error('Pagamento indisponível. Consulte a clínica.');
    } catch (error) { addToast(error.message, 'error'); }
    finally { setBusy(null); }
  };

  if (loading) return <div className={styles.loading}>Carregando pagamentos...</div>;
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><CreditCard size={28} /><h1>Pagamentos</h1><p className={styles.subtitle}>O agendamento é liberado após a confirmação do pagamento, conforme o saldo de sessões contratado.</p></div>
        <Button variant="outline" onClick={fetchPayments}>Atualizar faturas</Button>
      </div>
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead><tr><th>Plano</th><th>Valor</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {payments.map(p => <tr key={p.id}>
              <td className={styles.bold}>{p.tipo_plano}</td><td>{formatCurrency(p.valor)}</td><td>{formatDate(p.data)}</td>
              <td><span className={styles.statusBadge} style={{ color: getStatusColor(p.status), background: getStatusBg(p.status) }}>{p.status === 'processando' ? 'Aguardando pagamento / confirmação' : p.status}</span></td>
              <td>{PAYABLE_STATUSES.includes(p.status) && <div className={styles.paymentActions}>
                <Button size="sm" disabled={!!busy} onClick={() => handlePay(p.id, 'PIX')}>{busy === p.id ? 'Aguarde...' : 'Pagar com Pix'}</Button>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => handlePay(p.id, 'UNDEFINED')}>Outras formas</Button>
                <button className={styles.receiptBtn} onClick={() => checkStatus(p.id)}>Verificar pagamento</button>
              </div>}
              {p.status === 'pago' && <span><CheckCircle2 size={14} /> Pagamento confirmado</span>}</td>
            </tr>)}
            {!payments.length && <tr><td colSpan="5" className={styles.emptyTable}>Nenhuma fatura. <Link href="/dashboard/paciente/planos">Escolha um plano ou consulta avulsa.</Link></td></tr>}
          </tbody>
        </table>
      </div>
      <p>Pix e outras formas dependem da disponibilidade da conta Asaas da clínica. Para recibos, entre em contato com a administração.</p>
      <Link href="/dashboard/paciente/agenda">Ir para minha agenda</Link>
      {pix && <div className={styles.pixOverlay}>
        <section className={styles.pixDialog} role="dialog" aria-modal="true" aria-labelledby="pix-title">
          <h2 id="pix-title">Pagar com Pix</h2>
          <p>Confira o valor e o recebedor no aplicativo do seu banco antes de confirmar.</p>
          <Image src={'data:image/png;base64,' + pix.encodedImage} alt="QR Code Pix desta fatura" width={240} height={240} unoptimized />
          {pix.expirationDate && <p>Validade informada pelo Asaas: {pix.expirationDate}</p>}
          <label htmlFor="pix-code">Pix copia e cola</label>
          <textarea id="pix-code" value={pix.payload} readOnly rows={4} />
          <Button onClick={async () => { try { await navigator.clipboard.writeText(pix.payload); addToast('Código Pix copiado.', 'success'); } catch { addToast('Selecione e copie o código acima.', 'info'); } }}>Copiar código Pix</Button>
          <Button variant="outline" onClick={() => checkStatus(pix.paymentId)}>Já paguei: verificar confirmação</Button>
          <p>O QR Code não confirma o pagamento. Aguarde a confirmação do Asaas para agendar.</p>
          <button className={styles.receiptBtn} onClick={() => setPix(null)}>Fechar</button>
        </section>
      </div>}
    </div>
  );
}
