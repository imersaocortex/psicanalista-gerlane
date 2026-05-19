'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import BottomNav from '@/components/dashboard/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './PacienteLayout.module.css';

const patientMenu = [
  { icon: '🏠', label: 'Início', href: '/dashboard/paciente' },
  { icon: '📅', label: 'Agenda', href: '/dashboard/paciente/agenda' },
  { icon: '📝', label: 'Minha Anamnese', href: '/dashboard/paciente/anamnese' },
  { icon: '💳', label: 'Pagamentos', href: '/dashboard/paciente/pagamentos' },
  { icon: '👤', label: 'Meu Perfil', href: '/dashboard/paciente/perfil' },
  { icon: '❓', label: 'Dúvidas (FAQ)', href: '/dashboard/paciente/faq' },
];

export default function PacienteLayout({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.tipo !== 'paciente') {
        router.push('/dashboard/admin');
      }
    }
  }, [isAuthenticated, user, loading, router]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className={styles.spinner}></div>
    </div>
  );

  if (!isAuthenticated) return null;

  return (
    <div className={styles.layout}>
      <Sidebar 
        items={patientMenu} 
        title="Minha Terapia" 
        subtitle="Área do Paciente" 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className={styles.mainWrapper}>
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className={styles.content}>{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
