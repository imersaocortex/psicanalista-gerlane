'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { X, Menu, Lock } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    // Prevent scroll when menu is open
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.style.overflow = 'auto';
    };
  }, [menuOpen]);

  const navLinks = [
    { label: 'Início', href: '/' },
    { label: 'Sobre', href: '#sobre' },
    { label: 'Psicanálise', href: '#psicanalise' },
    { label: 'Áreas de Atuação', href: '#areas' },
    { label: 'Contato', href: '#contato' },
  ];

  return (
    <>
      <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`} suppressHydrationWarning>
        <div className={styles.container} suppressHydrationWarning>
          <Link href="/" className={styles.logo}>
            <img src="/images/logo.png" alt="Logo Dra. Gerlane" className={styles.logoImg} />
          </Link>

          {/* Desktop Links */}
          <div className={styles.desktopLinks} suppressHydrationWarning>
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            ))}
            <Link href="/login" className={styles.loginBtn}>
              <Lock size={14} /> Área do Paciente
            </Link>
          </div>

          {/* Hamburger Toggle */}
          <button 
            className={styles.hamburger} 
            onClick={() => setMenuOpen(true)} 
            aria-label="Abrir Menu"
          >
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar Drawer */}
      <div className={`${styles.sidebarOverlay} ${menuOpen ? styles.overlayVisible : ''}`} onClick={() => setMenuOpen(false)} suppressHydrationWarning />
      
      <div className={`${styles.mobileSidebar} ${menuOpen ? styles.sidebarOpen : ''}`} suppressHydrationWarning>
        <div className={styles.sidebarHeader} suppressHydrationWarning>
          <img src="/images/logo.png" alt="Logo" className={styles.sidebarLogo} />
          <button className={styles.closeBtn} onClick={() => setMenuOpen(false)}>
            <X size={28} />
          </button>
        </div>

        <div className={styles.sidebarNav} suppressHydrationWarning>
          {navLinks.map(link => (
            <a 
              key={link.href} 
              href={link.href} 
              className={styles.sidebarNavLink} 
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className={styles.sidebarFooter} suppressHydrationWarning>
            <Link href="/login" className={styles.sidebarLoginBtn} onClick={() => setMenuOpen(false)}>
              <Lock size={16} /> Área do Paciente
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
