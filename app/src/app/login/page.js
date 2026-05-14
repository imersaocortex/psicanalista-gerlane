'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './login.module.css';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      addToast('Por favor, preencha todos os campos', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Iniciando tentativa de login para:', email);
      const user = await login(email, password);
      console.log('Login bem-sucedido. Perfil:', user.tipo);
      
      addToast(`Bem-vindo(a), ${user.nome || 'usuário'}!`, 'success');
      
      // Redirection
      const dest = user.tipo === 'admin' ? '/dashboard/admin' : '/dashboard/paciente';
      router.push(dest);
    } catch (error) {
      console.error('Erro no login:', error);
      addToast(error.message || 'Erro ao realizar login. Verifique suas credenciais.', 'error');
      setIsSubmitting(false); // Reset local state on error
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.meshBg}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
      </div>

      <div className={styles.card}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} /> Voltar ao site
          </Link>
        </div>

        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <img src="/images/logo.png" alt="Logo Dra. Gerlane Albuquerque" className={styles.logoImg} />
          </div>
          <h1>Portal do Consultório</h1>
          <p>Acesse seu ambiente exclusivo</p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.formGroup}>
            <label htmlFor="email">E-mail</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="seu@email.com" 
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Senha</label>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" 
              className={styles.input}
              required
            />
          </div>
          <button type="submit" className={styles.loginBtn} disabled={isSubmitting}>
            {isSubmitting ? <span className={styles.spinner} /> : 'Entrar no Sistema'}
          </button>
        </form>

        <div className={styles.footer}>
          <div className={styles.secureBadge}>
            <Lock size={12} />
            <span>Ambiente Seguro</span>
          </div>
          <p className={styles.helperText}>Problemas com acesso? Entre em contato com o suporte.</p>
        </div>
      </div>
    </div>
  );
}
