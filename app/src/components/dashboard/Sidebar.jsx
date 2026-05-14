'use client';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/utils/helpers';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { 
  Home, 
  Users, 
  Calendar, 
  Clock, 
  FileText, 
  DollarSign, 
  History, 
  MessageSquare, 
  CreditCard,
  HelpCircle,
  X
} from 'lucide-react';

const iconMap = {
  '🏠': <Home size={18} />,
  '👥': <Users size={18} />,
  '📅': <Calendar size={18} />,
  '⏰': <Clock size={18} />,
  '📝': <FileText size={18} />,
  '💰': <DollarSign size={18} />,
  '📋': <History size={18} />,
  '📄': <FileText size={18} />,
  '💬': <MessageSquare size={18} />,
  '💳': <CreditCard size={18} />,
  '❓': <HelpCircle size={18} />,
};

export default function Sidebar({ items = [], title = "Painel", subtitle = "Gerenciamento", isOpen, onClose }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {/* Overlay para mobile */}
      <div className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`} onClick={onClose} />
      
      <aside className={`${styles.sidebar} ${isOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <h2 className={styles.title}>{title}</h2>
            <span className={styles.subtitle}>{subtitle}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <nav className={styles.nav}>
          {items.map((item) => {
            const isActive = pathname === item.href;
            const icon = iconMap[item.icon] || item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                onClick={onClose}
              >
                <span className={styles.icon}>{icon}</span>
                <span className={styles.label}>{item.label}</span>
                {isActive && <div className={styles.activeIndicator} />}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>{getInitials(user?.nome || 'U')}</div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user?.nome || 'Usuário'}</p>
              <p className={styles.userRole}>{user?.tipo === 'admin' ? 'Psicanalista' : 'Paciente'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
