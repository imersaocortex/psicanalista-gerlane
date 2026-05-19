'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './configuracoes.module.css';
import Button from '@/components/ui/Button';
import { Settings, MessageSquare, CreditCard, Save } from 'lucide-react';

export default function ConfiguracoesAdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const supabase = createClient();

  const [configs, setConfigs] = useState({
    evolution_api_url: '',
    evolution_api_instance: '',
    evolution_api_apikey: '',
    asaas_api_key: '',
    asaas_environment: 'sandbox'
  });

  useEffect(() => {
    if (!user) return;
    async function fetchConfigs() {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .eq('admin_id', user.id);
      
      if (data) {
        const configMap = {};
        data.forEach(item => {
          configMap[item.chave] = item.valor;
        });
        setConfigs(prev => ({ ...prev, ...configMap }));
      }
      setLoading(false);
    }
    fetchConfigs();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfigs(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const entries = Object.entries(configs);
      
      for (const [chave, valor] of entries) {
        // Garantir serialização em JSON válida para colunas JSON/JSONB do Supabase
        const { error } = await supabase
          .from('configuracoes_sistema')
          .upsert({
            admin_id: user.id,
            chave,
            valor: JSON.stringify(valor),
            updated_at: new Date().toISOString()
          }, { onConflict: 'admin_id, chave' });

        if (error) throw error;
      }

      addToast('Configurações salvas com sucesso!', 'success');
    } catch (error) {
      addToast('Erro ao salvar configurações.', 'error');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{padding: '2rem'}}>Carregando configurações...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1><Settings size={28} style={{marginRight: '10px', verticalAlign: 'middle'}} /> Configurações do Sistema</h1>
          <p>Gerencie as integrações e chaves de API da sua clínica.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className={styles.formContainer}>
        {/* Evolution API - WhatsApp */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <MessageSquare size={20} color="#25D366" />
            <h3>Integração WhatsApp (Evolution API)</h3>
          </div>
          <p className={styles.sectionDesc}>Configure sua instância da Evolution API para envio automático de mensagens e notificações.</p>
          
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>URL Base da API (ex: https://evo.seusite.com)</label>
              <input 
                type="text" 
                name="evolution_api_url"
                value={configs.evolution_api_url} 
                onChange={handleChange}
                placeholder="https://"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Nome da Instância (ex: ClinicaBot)</label>
              <input 
                type="text" 
                name="evolution_api_instance"
                value={configs.evolution_api_instance} 
                onChange={handleChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Global API Key (Global API Key da Evolution)</label>
              <input 
                type="password" 
                name="evolution_api_apikey"
                value={configs.evolution_api_apikey} 
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Asaas - Financeiro */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <CreditCard size={20} color="#0052cc" />
            <h3>Integração Financeira (Asaas)</h3>
          </div>
          <p className={styles.sectionDesc}>Configure suas credenciais para emissão de cobranças automáticas.</p>
          
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>Asaas API Key (Access Token)</label>
              <input 
                type="password" 
                name="asaas_api_key"
                value={configs.asaas_api_key} 
                onChange={handleChange}
                placeholder="$aact_..."
              />
            </div>
            <div className={styles.formGroup}>
              <label>Ambiente</label>
              <select name="asaas_environment" value={configs.asaas_environment} onChange={handleChange}>
                <option value="sandbox">Sandbox (Testes)</option>
                <option value="production">Produção (Real)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : <><Save size={18} /> Salvar Configurações</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
