'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from './planos.module.css';
import Button from '@/components/ui/Button';
import { Plus, CreditCard, Trash2, Edit2, CheckCircle, XCircle, Hash } from 'lucide-react';

export default function PlanosAdminPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    id: null,
    nome: '',
    descricao: '',
    preco: '',
    periodicidade: 'mensal',
    limite_sessoes: 4,
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

  const openNewPlanModal = () => {
    setFormData({ id: null, nome: '', descricao: '', preco: '', periodicidade: 'mensal', limite_sessoes: 4, asaas_id: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (plan) => {
    setFormData({
      id: plan.id,
      nome: plan.nome,
      descricao: plan.descricao,
      preco: plan.preco,
      periodicidade: plan.periodicidade,
      limite_sessoes: plan.limite_sessoes || 4,
      asaas_id: plan.asaas_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este plano? Esta ação só funcionará se nenhum paciente estiver usando este plano.')) return;
    
    try {
      const { error } = await supabase.from('planos').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') throw new Error('Não é possível excluir um plano que já está vinculado a pacientes. Sugerimos apenas inativá-lo.');
        throw error;
      }
      addToast('Plano excluído com sucesso!', 'success');
      fetchPlans();
    } catch (error) {
      addToast(error.message || 'Erro ao excluir plano.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nome: formData.nome,
        descricao: formData.descricao,
        preco: parseFloat(formData.preco),
        periodicidade: formData.periodicidade,
        limite_sessoes: parseInt(formData.limite_sessoes),
        asaas_id: formData.asaas_id
      };

      if (formData.id) {
        const { error } = await supabase.from('planos').update(payload).eq('id', formData.id);
        if (error) throw error;
        addToast('Plano atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase.from('planos').insert(payload);
        if (error) throw error;
        addToast('Plano criado com sucesso! 💎', 'success');
      }

      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      addToast('Erro ao salvar o plano', 'error');
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
          <p>Configure os planos de assinatura recorrente e seus limites de sessões.</p>
        </div>
        <Button onClick={openNewPlanModal}>
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
              <span className={styles.period}>/{plan.periodicidade === 'avulso' ? 'sessão' : 'mês'}</span>
            </div>
            
            <div className={styles.asaasInfo}>
              <Hash size={14} />
              <span>Limite: {plan.limite_sessoes || 'Ilimitado'} sessões</span>
            </div>
            
            <div className={styles.asaasInfo} style={{marginTop: '4px'}}>
              <CreditCard size={14} />
              <span>Asaas ID: {plan.asaas_id || 'Não vinculado'}</span>
            </div>

            <div className={styles.planActions}>
              <button className={styles.editBtn} onClick={() => handleEdit(plan)} title="Editar"><Edit2 size={16} /></button>
              <button 
                className={plan.ativo ? styles.deactivateBtn : styles.activateBtn}
                onClick={() => toggleStatus(plan.id, plan.ativo)}
                title={plan.ativo ? "Inativar" : "Ativar"}
              >
                {plan.ativo ? <XCircle size={16} /> : <CheckCircle size={16} />}
              </button>
              <button className={styles.deleteBtn} onClick={() => handleDelete(plan.id)} title="Excluir"><Trash2 size={16} /></button>
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
            <h2>{formData.id ? 'Editar Plano' : 'Criar Novo Plano'}</h2>
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
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label>Limite de Sessões (por ciclo)</label>
                  <input 
                    type="number" 
                    value={formData.limite_sessoes} 
                    onChange={e => setFormData({...formData, limite_sessoes: e.target.value})}
                    required 
                    min="1"
                    placeholder="Ex: 4"
                  />
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
              </div>
              <div className={styles.modalFooter}>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">{formData.id ? 'Salvar Alterações' : 'Criar Plano'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
