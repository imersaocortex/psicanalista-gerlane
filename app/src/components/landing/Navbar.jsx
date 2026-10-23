'use client';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useDrawerFocus } from '@/hooks/useDrawerFocus';
import styles from './Navbar.module.css';
import { X, Menu, Lock } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const drawerRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDrawerFocus(drawerRef, menuOpen, closeMenu);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Início', href: '/' },
    { label: 'Sobre', href: '#sobre' },
    { label: 'Psicanálise', href: '#psicanalise' },
    { label: 'Áreas de Atuação', href: '#areas' },
    { label: 'Contato', href: '#contato' },
  ];

  return (
    <>
      <nav aria-label="Navegação principal" className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            <Image width={380} height={83} src="/images/logo.png" alt="Dra. Gerlane Albuquerque — Página inicial" className={styles.logoImg} />
          </Link>

          {/* Desktop Links */}
          <div className={styles.desktopLinks}>
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
            aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="landing-menu"
          >
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar Drawer */}
      <div aria-hidden="true" className={`${styles.sidebarOverlay} ${menuOpen ? styles.overlayVisible : ''}`} onClick={() => setMenuOpen(false)} />

      <div id="landing-menu" ref={drawerRef} inert={!menuOpen} className={`${styles.mobileSidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Image width={380} height={83} src="/images/logo.png" alt="Dra. Gerlane Albuquerque" className={styles.sidebarLogo} />
          <button aria-label="Fechar menu" className={styles.closeBtn} onClick={() => setMenuOpen(false)}>
            <X size={28} />
          </button>
        </div>

        <div className={styles.sidebarNav}>
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
          <div className={styles.sidebarFooter}>
            <Link href="/login" className={styles.sidebarLoginBtn} onClick={() => setMenuOpen(false)}>
              <Lock size={16} /> Área do Paciente
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
