'use client';
import Script from 'next/script';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import styles from './PublicAnalytics.module.css';

const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
const enabled = /^G-[A-Z0-9]+$/.test(id);
const preferenceKey = 'gerlane-public-analytics-consent-v1';
function subscribe(callback) {
  window.addEventListener('storage', callback);
  window.addEventListener('gerlane-consent', callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener('gerlane-consent', callback); };
}
function snapshot() { try { return localStorage.getItem(preferenceKey); } catch { return 'denied'; } }

export default function PublicAnalytics() {
  const consent = useSyncExternalStore(subscribe, snapshot, () => null);
  const [preferences, setPreferences] = useState(false);
  const initialized = useRef(false);
  function choose(value) {
    try { localStorage.setItem(preferenceKey, value); } catch { return; }
    window.dispatchEvent(new Event('gerlane-consent'));
    setPreferences(false);
    if (value !== 'granted') {
      window['ga-disable-' + id] = true;
      // Remove GA cookies on the current site when permission is withdrawn.
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.trim().split('=')[0];
        if (!/^_ga(?:_|$)/.test(name)) continue;
        for (const domain of ['', location.hostname, '.' + location.hostname]) document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + (domain ? '; domain=' + domain : '');
      }
    }
  }
  useEffect(() => {
    if (!enabled || consent !== 'granted') return;
    window['ga-disable-' + id] = false;
    const click = event => {
      const link = event.target.closest?.('a[href]');
      if (link?.href.startsWith('https://wa.me/')) window.gtag?.('event', 'contact_click', { method: 'whatsapp' });
    };
    const submit = event => {
      if (event.target.querySelector('#contato-nome')) window.gtag?.('event', 'contact_form_prepare', { method: 'whatsapp' });
    };
    document.addEventListener('click', click);
    document.addEventListener('submit', submit);
    return () => {
      window['ga-disable-' + id] = true;
      document.removeEventListener('click', click);
      document.removeEventListener('submit', submit);
    };
  }, [consent]);
  if (!enabled) return null;
  return <>
    {consent === 'granted' && <Script id="gerlane-public-ga4" src={'https://www.googletagmanager.com/gtag/js?id=' + id} strategy="afterInteractive" onReady={() => {
      window['ga-disable-' + id] = false;
      if (initialized.current) return;
      initialized.current = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
      window.gtag('event', 'page_view', { page_location: 'https://psicanalistagerlane.com.br/', page_title: 'Dra. Gerlane Albuquerque | Psicanalista Clínica', page_referrer: '' });
    }} />}
    {(!consent || preferences) ? <aside className={styles.banner} aria-label="Preferências de privacidade"><p>Podemos usar estatísticas opcionais para melhorar esta página? Nenhum dado do formulário ou do atendimento é enviado. <Link href="/privacidade">Saiba mais sobre privacidade</Link>.</p><div><button onClick={() => choose('denied')}>Recusar</button><button onClick={() => choose('granted')}>Permitir estatísticas</button></div></aside> : <button className={styles.preferences} onClick={() => setPreferences(true)}>Preferências de privacidade</button>}
  </>;
}
