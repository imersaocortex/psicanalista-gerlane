'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from './planos.module.css';
import Button from '@/components/ui/Button';
import { Plus, CreditCard, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';

export default function PlanosAdminPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    periodicidade: 'mensal',
    asaas_id: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    const { data } = await supabase.from('planos').select('*').order('created_at', { ascending: false });
    setPlans(data || []);
    setLoading(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('planos')
        .insert({
          ...formData,
          preco: parseFloat(formData.preco)
        });

      if (error) throw error;

      addToast('Plano criado com sucesso! 💎', 'success');
      setIsModalOpen(false);
      setFormData({ nome: '', descricao: '', preco: '', periodicidade: 'mensal', asaas_id: '' });
      fetchPlans();
    } catch (error) {
      addToast('Erro ao criar plano', 'error');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const { error } = await supabase
      .from('planos')
      .update({ ativo: !currentStatus })
      .eq('id', id);
    
    if (!error) fetchPlans();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Gestão de Planos</h1>
          <p>Configure os planos de assinatura recorrente para seus pacientes.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Novo Plano
        </Button>
      </div>

      <div className={styles.grid}>
        {plans.map(plan => (
          <div key={plan.id} className={`${styles.planCard} ${!plan.ativo ? styles.inactive : ''}`}>
            <div className={styles.planBadge}>{plan.periodicidade}</div>
            <h3>{plan.nome}</h3>
            <p className={styles.desc}>{plan.descricao}</p>
            <div className={styles.priceSection}>
              <span className={styles.currency}>R$</span>
              <span className={styles.price}>{plan.preco}</span>
              <span className={styles.period}>/mês</span>
            </div>
            
            <div className={styles.asaasInfo}>
              <CreditCard size={14} />
              <span>Asaas ID: {plan.asaas_id || 'Não vinculado'}</span>
            </div>

            <div className={styles.planActions}>
              <button className={styles.editBtn}><Edit2 size={16} /></button>
              <button 
                className={plan.ativo ? styles.deactivateBtn : styles.activateBtn}
                onClick={() => toggleStatus(plan.id, plan.ativo)}
              >
                {plan.ativo ? <XCircle size={16} /> : <CheckCircle size={16} />}
              </button>
              <button className={styles.deleteBtn}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}

        {plans.length === 0 && !loading && (
          <div className={styles.empty}>
            <p>Nenhum plano cadastrado. Comece criando um novo plano acima.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Criar Novo Plano</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nome do Plano</label>
                <input 
                  type="text" 
                  value={formData.nome} 
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  required 
                  placeholder="Ex: Plano Individual Mensal"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Descrição</label>
                <textarea 
                  value={formData.descricao} 
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                  placeholder="O que este plano inclui?"
                />
              </div>
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label>Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.preco} 
                    onChange={e => setFormData({...formData, preco: e.target.value})}
                    required 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Periodicidade</label>
                  <select 
                    value={formData.periodicidade} 
                    onChange={e => setFormData({...formData, periodicidade: e.target.value})}
                  >
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                    <option value="avulso">Sessão Avulsa</option>
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Asaas ID (Opcional)</label>
                <input 
                  type="text" 
                  value={formData.asaas_id} 
                  onChange={e => setFormData({...formData, asaas_id: e.target.value})}
                  placeholder="prod_..."
                />
              </div>
              <div className={styles.modalFooter}>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Criar Plano</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
