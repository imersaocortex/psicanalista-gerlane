'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate, getStatusColor, getStatusBg } from '@/utils/helpers';
import { exportToPDF } from '@/utils/exportPDF';
import styles from './financeiro.module.css';
import Button from '@/components/ui/Button';
import { DollarSign, PieChart, TrendingUp, Filter, FileBarChart, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function FinanceiroPage() {
  const [filter, setFilter] = useState('todos');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);

      // 1. Buscar todos os pacientes com nomes (padrão que já funciona no sistema)
      const { data: patients } = await supabase
        .from('pacientes')
        .select('id, profiles:user_id(nome)');
      
      const nameMap = {};
      patients?.forEach(p => { nameMap[p.id] = p.profiles?.nome || 'Paciente'; });

      // 2. Buscar pagamentos
      const { data, error } = await supabase
        .from('pagamentos')
        .select('*')
        .order('data', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
      }

      // 3. Enriquecer pagamentos com nome do paciente
      const enriched = (data || []).map(p => ({
        ...p,
        paciente_nome: nameMap[p.paciente_id] || 'Paciente'
      }));

      setPayments(enriched);
      setLoading(false);
    }

    fetchPayments();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta fatura do paciente?')) return;
    
    try {
      const { error } = await supabase.from('pagamentos').delete().eq('id', id);
      if (error) throw error;
      
      setPayments(prev => prev.filter(p => p.id !== id));
      addToast('Fatura excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir fatura:', error);
      addToast('Erro ao excluir fatura.', 'error');
    }
  };

  const totalRevenue = payments.filter(p => p.status === 'pago').reduce((s, p) => s + (p.valor || 0), 0);
  const totalPending = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + (p.valor || 0), 0);
  const paidCount = payments.filter(p => p.status === 'pago').length;

  const filtered = filter === 'todos' ? payments : payments.filter(p => p.status === filter);

  if (loading) return <div className={styles.loading}>Carregando dados financeiros...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <DollarSign size={28} color="var(--color-green)" />
          <div>
            <h1>Gestão Financeira</h1>
            <p className={styles.subtitle}>Controle de faturamento, planos e recebimentos.</p>
          </div>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
          <Link href="/dashboard/admin/financeiro/configuracoes">
            <Button variant="secondary"><Settings size={16} /> Configurações</Button>
          </Link>
          <Button onClick={() => exportToPDF('relatorio-financeiro', 'relatorio_financeiro.pdf')}>
            <FileBarChart size={16} /> Relatório Completo
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{borderLeft: '4px solid var(--color-success)'}}>
          <TrendingUp size={32} className={styles.statIcon} color="var(--color-success)" />
          <div>
            <span className={styles.statValue}>{formatCurrency(totalRevenue)}</span>
            <span className={styles.statLabel}>Faturamento Total</span>
          </div>
        </div>
        <div className={styles.statCard} style={{borderLeft: '4px solid var(--color-warning)'}}>
          <DollarSign size={32} className={styles.statIcon} color="var(--color-warning)" />
          <div>
            <span className={styles.statValue}>{formatCurrency(totalPending)}</span>
            <span className={styles.statLabel}>Valor Pendente</span>
          </div>
        </div>
        <div className={styles.statCard} style={{borderLeft: '4px solid var(--color-info)'}}>
          <PieChart size={32} className={styles.statIcon} color="var(--color-info)" />
          <div>
            <span className={styles.statValue}>{paidCount}</span>
            <span className={styles.statLabel}>Pagamentos Recebidos</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <TrendingUp size={20} color="var(--text-muted)" />
            <h3>Transações Recentes</h3>
          </div>
          <div className={styles.filters}>
            <Filter size={14} color="var(--text-muted)" style={{marginRight:'8px'}} />
            {['todos', 'pago', 'pendente', 'cancelado'].map(f => (
              <button 
                key={f} 
                className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.tableCard} id="relatorio-financeiro">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Plano</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className={styles.bold}>{p.paciente_nome}</td>
                  <td>{p.tipo_plano}</td>
                  <td>{formatCurrency(p.valor)}</td>
                  <td>{formatDate(p.data)}</td>
                  <td>
                    <span className={styles.statusBadge} style={{color: getStatusColor(p.status), background: getStatusBg(p.status)}}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleDelete(p.id)}
                      title="Excluir Fatura"
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className={styles.emptyTable}>Nenhuma transação encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
