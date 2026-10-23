'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import InstallPWA from '@/components/ui/InstallPWA';
import styles from '@/app/login/login.module.css';

export default function AuthScreen({ mode = 'login' }) {
  const registering = mode === 'register', recovering = mode === 'recover', resetting = mode === 'reset';
  const { login, logout, isAuthenticated, user, loading } = useAuth();
  const router = useRouter(), params = useSearchParams();
  const [busy, setBusy] = useState(false), [visible, setVisible] = useState(false);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [values, setValues] = useState({ nome: '', email: '', password: '', confirm: '', privacy: false });
  useEffect(() => {
    if (!params.has('erro') && !resetting && !recovering && !loading && isAuthenticated && user && !busy && !success)
      router.replace(user.tipo === 'admin' ? '/dashboard/admin' : '/dashboard/paciente');
  }, [params, resetting, recovering, loading, isAuthenticated, user, busy, success, router]);
  const change = e => setValues(prev => ({ ...prev, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  async function submit(e) {
    e.preventDefault(); setError(''); setSuccess('');
    if ((registering || resetting) && values.password !== values.confirm) { setError('As senhas precisam ser iguais.'); return; }
    setBusy(true);
    try {
      if (registering) {
        const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: values.nome, email: values.email, password: values.password, acceptedPrivacy: values.privacy }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível criar a conta.');
        if (result.requiresEmailConfirmation) setSuccess('Cadastro solicitado! Verifique seu e-mail e confirme o acesso pelo link recebido. Se já possui uma conta, entre ou recupere sua senha.');
        else { window.location.assign('/dashboard/paciente'); return; }
      } else if (recovering) {
        const db = createClient();
        const { error } = await db.auth.resetPasswordForEmail(values.email.trim(), { redirectTo: window.location.origin + '/auth/callback?next=/redefinir-senha' });
        if (error) throw new Error('Não foi possível solicitar a recuperação. Aguarde e tente novamente.');
        setSuccess('Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.');
      } else if (resetting) {
        const db = createClient();
        const { data: { user: authUser } } = await db.auth.getUser();
        if (!authUser) throw new Error('O link expirou. Solicite uma nova recuperação de senha.');
        const { error } = await db.auth.updateUser({ password: values.password });
        if (error) throw new Error('Não foi possível alterar a senha. Use uma senha diferente com pelo menos 8 caracteres.');
        await db.auth.signOut();
        setSuccess('Senha atualizada. Você já pode entrar com a nova senha.');
      } else {
        const profile = await login(values.email, values.password);
        router.replace(profile.tipo === 'admin' ? '/dashboard/admin' : '/dashboard/paciente');
      }
    } catch (err) { setError(err.message || 'Não foi possível concluir. Tente novamente.'); }
    finally { setBusy(false); }
  }
  const heading = registering ? 'Crie sua conta' : recovering ? 'Recuperar acesso' : resetting ? 'Nova senha' : 'Entre no seu espaço';
  return <main className={styles.page}>
    <div className={styles.meshBg} aria-hidden="true"><div className={styles.orb1} /><div className={styles.orb2} /></div>
    <div className={styles.card}>
      <div className={styles.topBar}><Link href="/" className={styles.backLink}><ArrowLeft size={16} /> Site da Dra. Gerlane</Link></div>
      <header className={styles.header}>
        <div className={styles.appMark}><Image src="/images/logo.png" width={380} height={83} alt="Flor de lótus da logomarca da Dra. Gerlane" className={styles.lotusLogo} loading="eager" /></div>
        <h1 className={styles.appName}>Acolher</h1><p className={styles.slogan}>Seu bem-estar em um só lugar</p>
        <p className={styles.professional}>Dra. Gerlane Albuquerque · Psicanalista</p>
      </header>
      <h2 className={styles.formTitle}>{heading}</h2>
      {(error || params.has('erro')) && <p className={styles.error} role="alert">{error || (params.get('erro') === 'conexao' ? 'Não foi possível validar sua sessão no servidor. Tente novamente em instantes.' : params.get('erro') === 'perfil' ? 'Seu perfil de acesso não está disponível. Entre em contato com a clínica.' : 'Este link expirou ou é inválido. Solicite um novo link de acesso.')}</p>}
      {success ? <div className={styles.success} role="status"><CheckCircle2 size={24} /><p>{success}</p><Link href="/login">Voltar para entrar</Link></div> :
      <form className={styles.form} onSubmit={submit}>
        {registering && <div className={styles.formGroup}><label htmlFor="nome">Nome completo</label><input id="nome" name="nome" autoComplete="name" value={values.nome} onChange={change} minLength={3} maxLength={120} required className={styles.input} /></div>}
        {!resetting && <div className={styles.formGroup}><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="email" value={values.email} onChange={change} maxLength={254} required className={styles.input} /></div>}
        {!recovering && <div className={styles.formGroup}><label htmlFor="password">{resetting ? 'Nova senha' : 'Senha'}</label><div className={styles.passwordField}><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={registering || resetting ? 'new-password' : 'current-password'} value={values.password} onChange={change} minLength={registering || resetting ? 8 : undefined} maxLength={128} required className={styles.input} /><button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{(registering || resetting) && <small>Use pelo menos 8 caracteres.</small>}</div>}
        {(registering || resetting) && <div className={styles.formGroup}><label htmlFor="confirm">Confirme a senha</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" value={values.confirm} onChange={change} minLength={8} maxLength={128} required className={styles.input} /></div>}
        {registering && <label className={styles.consent}><input name="privacy" type="checkbox" checked={values.privacy} onChange={change} required /><span>Li o <Link href="/privacidade" target="_blank" rel="noopener noreferrer">aviso de privacidade</Link> e desejo criar minha conta.</span></label>}
        <button className={styles.loginBtn} disabled={busy} type="submit">{busy ? 'Aguarde...' : registering ? 'Criar minha conta' : recovering ? 'Enviar link de recuperação' : resetting ? 'Salvar nova senha' : 'Entrar'}</button>
      </form>}
      <nav className={styles.authLinks} aria-label="Opções de acesso">
        {isAuthenticated && params.has('erro') && <button type="button" onClick={logout}>Sair da conta atual</button>}
        {mode === 'login' ? <><Link href="/recuperar-senha">Esqueci minha senha</Link><p>Ainda não tem acesso? <Link href="/cadastro">Crie sua conta</Link></p></> : <Link href="/login">Já tenho uma conta. Entrar</Link>}
      </nav>
      <InstallPWA />
      <footer className={styles.footer}><Image src="/images/logo.png" loading="eager" width={150} height={60} alt="Dra. Gerlane Albuquerque" style={{ width: 'auto', height: 38 }} /><a href="https://wa.me/5584998127788" target="_blank" rel="noopener noreferrer" className={styles.helperText}>Precisa de ajuda? Fale com a clínica</a></footer>
    </div>
  </main>;
}
