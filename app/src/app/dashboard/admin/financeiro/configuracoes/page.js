'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './configuracoes.module.css';
import Button from '@/components/ui/Button';
import { Settings, Save, CreditCard, DollarSign, QrCode, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function FinanceiroConfigPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const [config, setConfig] = useState({
    pix_key: '',
    session_value: '',
    asaas_api_key: '',
    asaas_environment: 'sandbox',
    payment_method: 'pix'
  });

  useEffect(() => {
    if (!user) return;
    async function fetchConfig() {
      const { data } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .eq('admin_id', user.id);
      
      const mapped = {};
      data?.forEach(item => {
        mapped[item.chave] = item.valor;
      });

      if (Object.keys(mapped).length > 0) {
        setConfig(prev => ({
          ...prev,
          ...mapped
        }));
      }
      setLoading(false);
    }
    fetchConfig();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const entries = Object.entries(config);
      for (const [chave, valor] of entries) {
        const { error } = await supabase
          .from('configuracoes_sistema')
          .upsert({
            admin_id: user.id,
            chave,
            valor,
            updated_at: new Date().toISOString()
          }, { onConflict: 'admin_id, chave' });
        
        if (error) throw error;
      }
      addToast('Configurações salvas com sucesso! 💰', 'success');
    } catch (error) {
      console.error('Error saving config:', error);
      addToast('Erro ao salvar configurações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando configurações...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/admin/financeiro" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao Financeiro
        </Link>
        <div className={styles.titleArea}>
          <Settings size={28} color="var(--color-green)" />
          <div>
            <h1>Configurações de Pagamento</h1>
            <p>Configure como você deseja receber e os valores das suas sessões.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.grid}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <DollarSign size={20} />
              <h3>Valores e Cobrança</h3>
            </div>
            <div className={styles.formGroup}>
              <label>Valor da Sessão Individual (R$)</label>
              <input 
                type="number" 
                value={config.session_value}
                onChange={e => setConfig({...config, session_value: e.target.value})}
                placeholder="Ex: 150.00"
              />
              <span className={styles.hint}>Este valor será usado como base para novos agendamentos.</span>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <QrCode size={20} />
              <h3>Pagamento via Pix</h3>
            </div>
            <div className={styles.formGroup}>
              <label>Chave Pix para Recebimento</label>
              <input 
                type="text" 
                value={config.pix_key}
                onChange={e => setConfig({...config, pix_key: e.target.value})}
                placeholder="CPF, E-mail, Celular ou Chave Aleatória"
              />
              <span className={styles.hint}>Será mostrada ao paciente ao finalizar um agendamento manual.</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Shield size={20} />
            <h3>Integração com Gateway (Opcional)</h3>
          </div>
          <p className={styles.sectionDesc}>
            Configure o Asaas para automação de Pix, Boletos e Cartão de Crédito.
          </p>
          
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>Asaas API Key</label>
              <input 
                type="password" 
                value={config.asaas_api_key}
                onChange={e => setConfig({...config, asaas_api_key: e.target.value})}
                placeholder="$a.abc..."
              />
            </div>
            <div className={styles.formGroup}>
              <label>Ambiente</label>
              <select 
                value={config.asaas_environment}
                onChange={e => setConfig({...config, asaas_environment: e.target.value})}
                className={styles.select}
              >
                <option value="sandbox">Homologação (Testes)</option>
                <option value="production">Produção</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : <><Save size={16} /> Salvar Configurações</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
