'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency } from '@/utils/helpers';
import styles from './planos.module.css';
import Button from '@/components/ui/Button';
import { ShieldCheck, CheckCircle2, ArrowRight, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function PacientePlanos() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(null);
  const [plans, setPlans] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    async function fetchPlans() {
      try {
        const { data: patient, error: patientError } = await supabase
          .from('pacientes')
          .select('id, plano_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (patientError) {
          console.error('Error fetching patient data for plans:', patientError.message);
          return;
        }

        if (patient) {
          setPatientId(patient.id);
          setCurrentPlanId(patient.plano_id);
          
          const { data: allPlans } = await supabase
            .from('planos')
            .select('*')
            .eq('ativo', true);
          
          setPlans(allPlans || []);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, [user]);

  const handlePlanChange = async (planId, planName, planPrice) => {
    if (planId === currentPlanId) return;
    
    setChanging(planId);
    try {
      // 1. Criar um registro de pagamento para o novo plano
      const { data: payment, error: payError } = await supabase
        .from('pagamentos')
        .insert({
          paciente_id: patientId,
          valor: planPrice,
          tipo_plano: planName,
          status: 'pendente',
          data: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      if (payError) throw payError;

      // 2. Chamar a API do Asaas para gerar o link
      const response = await fetch('/api/payments/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.id })
      });

      const result = await response.json();

      if (result.invoiceUrl) {
        addToast('Redirecionando para o pagamento do novo plano...', 'success');
        window.open(result.invoiceUrl, '_blank');
      } else {
        throw new Error(result.error || 'Erro ao gerar pagamento');
      }
    } catch (error) {
      addToast(error.message || 'Erro ao processar troca de plano', 'error');
    } finally {
      setChanging(null);
    }
  };

  if (loading) return (
    <div className={styles.loadingContainer}>
      <Loader2 className={styles.spinner} size={40} />
      <p>Carregando opções de planos...</p>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Planos e Assinatura</h1>
        <p>Escolha o plano que melhor se adapta à sua jornada de terapia.</p>
      </div>

      <div className={styles.plansGrid}>
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`${styles.planCard} ${plan.id === currentPlanId ? styles.current : ''}`}
          >
            {plan.id === currentPlanId && (
              <div className={styles.currentBadge}>
                <ShieldCheck size={14} /> Seu Plano Atual
              </div>
            )}
            <div className={styles.planHeader}>
              <h3>{plan.nome}</h3>
              <p className={styles.price}>
                R$ {plan.preco}<span>/{plan.periodicidade}</span>
              </p>
            </div>
            
            <div className={styles.features}>
              <div className={styles.feature}>
                <CheckCircle2 size={16} color="var(--color-green)" />
                <span>Consultas semanais</span>
              </div>
              <div className={styles.feature}>
                <CheckCircle2 size={16} color="var(--color-green)" />
                <span>Portal do Paciente 24h</span>
              </div>
              <div className={styles.feature}>
                <CheckCircle2 size={16} color="var(--color-green)" />
                <span>Acesso a materiais clínicos</span>
              </div>
            </div>

            <div className={styles.actions}>
              {plan.id === currentPlanId ? (
                <Button variant="outline" disabled style={{ width: '100%', opacity: 0.7 }}>
                  Plano Ativo
                </Button>
              ) : (
                <Button 
                  onClick={() => handlePlanChange(plan.id, plan.nome, plan.preco)} 
                  disabled={changing === plan.id}
                  style={{ width: '100%' }}
                >
                  {changing === plan.id ? 'Processando...' : (
                    <>Mudar para este plano <ArrowRight size={16} /></>
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.infoBox}>
        <div className={styles.infoIcon}>
          <CreditCard size={24} />
        </div>
        <div className={styles.infoText}>
          <h4>Sobre as cobranças</h4>
          <p>Ao mudar de plano, uma nova fatura será gerada. O seu plano atual será atualizado automaticamente assim que o pagamento da nova fatura for confirmado pelo nosso sistema via Asaas.</p>
        </div>
      </div>
    </div>
  );
}
