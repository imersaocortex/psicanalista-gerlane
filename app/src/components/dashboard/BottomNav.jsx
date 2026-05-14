'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BottomNav.module.css';
import { 
  Home, 
  Calendar, 
  MessageSquare, 
  HelpCircle,
  User,
  Users,
  FileText
} from 'lucide-react';

export default function BottomNav({ items }) {
  const pathname = usePathname();

  // Itens padrão (Paciente) se nenhum for fornecido
  const defaultItems = [
    { icon: <Home size={20} />, label: 'Início', href: '/dashboard/paciente' },
    { icon: <Calendar size={20} />, label: 'Agenda', href: '/dashboard/paciente/agenda' },
    { icon: <HelpCircle size={20} />, label: 'FAQ', href: '/dashboard/paciente/faq' },
    { icon: <User size={20} />, label: 'Perfil', href: '/dashboard/paciente/perfil' },
  ];

  const navItems = items || defaultItems;

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
