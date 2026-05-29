'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import BottomNav from '@/components/dashboard/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './AdminLayout.module.css';
import { Home, Users, Calendar, Clock, FileText, DollarSign } from 'lucide-react';

const adminMenu = [
  { icon: '🏠', label: 'Início', href: '/dashboard/admin' },
  { icon: '👥', label: 'Pacientes', href: '/dashboard/admin/pacientes' },
  { icon: '📅', label: 'Agenda', href: '/dashboard/admin/agenda' },
  { icon: '⏰', label: 'Horários', href: '/dashboard/admin/horarios' },
  { icon: '💳', label: 'Planos', href: '/dashboard/admin/planos' },
  { icon: '📝', label: 'Prontuário', href: '/dashboard/admin/prontuario' },
  { icon: '💰', label: 'Financeiro', href: '/dashboard/admin/financeiro' },
  { icon: '⚙️', label: 'Configurações', href: '/dashboard/admin/configuracoes' },
  { icon: '👤', label: 'Meu Perfil', href: '/dashboard/admin/perfil' },
];

const adminBottomItems = [
  { icon: <Home size={20} />, label: 'Início', href: '/dashboard/admin' },
  { icon: <Users size={20} />, label: 'Pacientes', href: '/dashboard/admin/pacientes' },
  { icon: <Calendar size={20} />, label: 'Agenda', href: '/dashboard/admin/agenda' },
  { icon: <FileText size={20} />, label: 'Prontuário', href: '/dashboard/admin/prontuario' },
  { icon: <DollarSign size={20} />, label: 'Financeiro', href: '/dashboard/admin/financeiro' },
];

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user && user.tipo && user.tipo !== 'admin') {
        router.push('/dashboard/paciente');
      }
    }
  }, [isAuthenticated, user, loading, router]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className={styles.spinner}></div>
      <p style={{ marginTop: '20px', color: '#666' }}>Carregando...</p>
    </div>
  );

  if (!isAuthenticated) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className={styles.spinner}></div>
      <p style={{ marginTop: '20px', color: '#666' }}>Iniciando sessão segura...</p>
    </div>
  );

  return (
    <div className={styles.layout}>
      <Sidebar 
        items={adminMenu} 
        title="Consultório" 
        subtitle="Painel Admin" 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className={styles.mainWrapper}>
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
        />
        
        <main className={styles.content}>
          {children}
        </main>

        <BottomNav items={adminBottomItems} />
      </div>
    </div>
  );
}
