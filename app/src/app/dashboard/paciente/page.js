'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency, formatDate } from '@/utils/helpers';
import styles from './paciente.module.css';
import Link from 'next/link';
import { Calendar, CreditCard, Bell, ArrowRight, Quote, ShieldCheck, ClipboardList, MessageSquare } from 'lucide-react';

export default function PacienteHome() {
  const { user } = useAuth();
  const [data, setData] = useState({
    upcoming: null,
    pendingPayment: null,
    currentPlan: null,
    recentNotifications: []
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    async function fetchPatientDashboard() {
      try {
        const { data: patient, error: patientError } = await supabase
          .from('pacientes')
          .select('id, plano_id, planos(nome, preco, periodicidade)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (patientError) {
          console.error('Error fetching patient data:', patientError.message);
          return;
        }

        if (patient) {
          const [sessionsRes, paymentsRes, notifsRes] = await Promise.all([
            supabase.from('sessoes')
              .select('*')
              .eq('paciente_id', patient.id)
              .gte('data', new Date().toISOString())
              .order('data', { ascending: true })
              .limit(1),
            supabase.from('pagamentos')
              .select('*')
              .eq('paciente_id', patient.id)
              .eq('status', 'pendente')
              .order('data', { ascending: true })
              .limit(1),
            supabase.from('notificacoes')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(3)
          ]);

          setData({
            upcoming: sessionsRes.data?.[0] || null,
            pendingPayment: paymentsRes.data?.[0] || null,
            currentPlan: patient.planos || null,
            recentNotifications: notifsRes.data || []
          });
        }
      } catch (error) {
        console.error('Error fetching patient dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPatientDashboard();
  }, [user]);

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}></div>
      <p>Preparando seu consultório virtual...</p>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h1>Bem-vindo(a) de volta, {user?.nome?.split(' ')[0] || 'Paciente'} ✨</h1>
          <p>Este é o seu porto seguro para o autoconhecimento.</p>
        </div>
      </div>

      {data.pendingPayment && (
        <div className={styles.alertBanner}>
          <div className={styles.alertContent}>
            <Bell size={20} className={styles.alertIcon} />
            <p>Você possui uma fatura pendente de <strong>{formatCurrency(data.pendingPayment.valor)}</strong>. Regularize para manter seu plano ativo.</p>
          </div>
          <Link href="/dashboard/paciente/pagamentos" className={styles.alertBtn}>
            Pagar Agora
          </Link>
        </div>
      )}

      <div className={styles.quickHub}>
        <Link href="/dashboard/paciente/agenda" className={styles.hubItem}>
          <div className={styles.hubIcon} style={{backgroundColor: 'rgba(116, 159, 130, 0.1)', color: 'var(--color-green)'}}>
            <Calendar size={20} />
          </div>
          <span>Agenda</span>
        </Link>
        <Link href="/dashboard/paciente/pagamentos" className={styles.hubItem}>
          <div className={styles.hubIcon} style={{backgroundColor: 'rgba(230, 126, 34, 0.1)', color: '#e67e22'}}>
            <CreditCard size={20} />
          </div>
          <span>Financeiro</span>
        </Link>
        <Link href="/dashboard/paciente/planos" className={styles.hubItem}>
          <div className={styles.hubIcon} style={{backgroundColor: 'rgba(52, 152, 219, 0.1)', color: '#3498db'}}>
            <ShieldCheck size={20} />
          </div>
          <span>Meu Plano</span>
        </Link>
        <Link href="/dashboard/paciente/anamnese" className={styles.hubItem}>
          <div className={styles.hubIcon} style={{backgroundColor: 'rgba(155, 89, 182, 0.1)', color: '#9b59b2'}}>
            <ClipboardList size={20} />
          </div>
          <span>Anamnese</span>
        </Link>
        <Link href="/dashboard/paciente/mensagens" className={styles.hubItem}>
          <div className={styles.hubIcon} style={{backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71'}}>
            <MessageSquare size={20} />
          </div>
          <span>Mensagens</span>
        </Link>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.highlightCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox} style={{backgroundColor: 'rgba(116, 159, 130, 0.1)'}}>
              <Calendar size={20} color="var(--color-green)" />
            </div>
            <h3>Próxima Sessão</h3>
          </div>
          {data.upcoming ? (
            <div className={styles.cardBody}>
              <p className={styles.mainInfo}>{formatDate(data.upcoming.data)}</p>
              <p className={styles.subInfo}>
                às {new Date(data.upcoming.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} • Online
              </p>
              <Link href="/dashboard/paciente/agenda" className={styles.actionLink}>
                Ver detalhes <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className={styles.cardBody}>
              <p className={styles.emptyText}>Nenhuma sessão agendada no momento.</p>
              <Link href="/dashboard/paciente/agenda" className={styles.actionLink}>
                Agendar agora <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox} style={{backgroundColor: 'rgba(230, 126, 34, 0.1)'}}>
              <CreditCard size={20} color="#e67e22" />
            </div>
            <h3>Financeiro</h3>
          </div>
          {data.pendingPayment ? (
            <div className={styles.cardBody}>
              <p className={styles.mainInfo}>{formatCurrency(data.pendingPayment.valor)}</p>
              <p className={styles.subInfo}>Vencimento pendente</p>
              <Link href="/dashboard/paciente/pagamentos" className={styles.actionLink} style={{color: '#e67e22'}}>
                Regularizar <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className={styles.cardBody}>
              <p className={styles.emptyText}>Todos os pagamentos estão em dia.</p>
              <Link href="/dashboard/paciente/pagamentos" className={styles.actionLink}>
                Histórico <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox} style={{backgroundColor: 'rgba(52, 152, 219, 0.1)'}}>
              <ShieldCheck size={20} color="#3498db" />
            </div>
            <h3>Meu Plano</h3>
          </div>
          <div className={styles.cardBody}>
            {data.currentPlan ? (
              <>
                <p className={styles.mainInfo}>{data.currentPlan.nome}</p>
                <p className={styles.subInfo}>R$ {data.currentPlan.preco}/{data.currentPlan.periodicidade}</p>
              </>
            ) : (
              <p className={styles.emptyText}>Nenhum plano ativo.</p>
            )}
            <Link href="/dashboard/paciente/planos" className={styles.actionLink} style={{color: '#3498db', marginTop: '10px'}}>
              Gerenciar plano <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox} style={{backgroundColor: 'rgba(155, 89, 182, 0.1)'}}>
              <Bell size={20} color="#9b59b2" />
            </div>
            <h3>Notificações</h3>
          </div>
          <div className={styles.cardBody}>
            {data.recentNotifications.length > 0 ? (
              <div className={styles.miniNotifList}>
                {data.recentNotifications.map(n => (
                  <div key={n.id} className={styles.miniNotifItem}>
                    <p className={styles.notifTitle}>{n.titulo}</p>
                    <span className={styles.notifTime}>{new Date(n.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>Sem novidades por aqui.</p>
            )}
            <Link href="/dashboard/paciente/perfil" className={styles.actionLink} style={{color: '#9b59b2', marginTop: '10px'}}>
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.quoteSection}>
        <Quote size={40} className={styles.quoteIcon} />
        <div className={styles.quoteCard}>
          <p className={styles.quoteText}>"Sua visão se tornará clara somente quando você puder olhar para o seu próprio coração. Quem olha para fora, sonha; quem olha para dentro, desperta."</p>
          <span className={styles.author}>— Carl Jung</span>
        </div>
      </div>
    </div>
  );
}
