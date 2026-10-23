'use client';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { Download, Info } from 'lucide-react';
const subscribe = callback => { const media = window.matchMedia('(display-mode: standalone)'); media.addEventListener('change', callback); return () => media.removeEventListener('change', callback); };
const getSnapshot = () => window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone;
const getServerSnapshot = () => true;
const subscribeIOS = () => () => {};
export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null);
  const installed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ios = useSyncExternalStore(subscribeIOS, () => /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1, () => false);
  useEffect(() => {
    const before = event => { event.preventDefault(); setPrompt(event); };
    const done = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', before); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', before); window.removeEventListener('appinstalled', done); };
  }, []);
  if (installed || !prompt && !ios) return null;
  return <div style={{ marginTop: 24, textAlign: 'center', lineHeight: 1.6 }}>
    {prompt ? <button type="button" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }} style={{ padding: 14, borderRadius: 12, background: 'var(--color-gold)', color: 'var(--color-green-dark)', border: 0, cursor: 'pointer', width: '100%' }}><Download size={18} /> Instalar Acolher</button> :
    <p><Info size={16} /> Para instalar o Acolher no iPhone, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>}
  </div>;
}
