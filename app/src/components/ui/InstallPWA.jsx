'use client';
import { useState, useEffect } from 'react';
import { Download, Info } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) return null;
  if (!isInstallable && !isIOS) return null;

  return (
    <div style={{ marginTop: '24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {isInstallable && (
        <button 
          onClick={handleInstallClick}
          type="button"
          style={{ 
            width: '100%', padding: '14px', background: 'var(--color-gold)', 
            color: 'var(--color-green-dark)', borderRadius: '8px', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', gap: '8px', border: 'none', 
            fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(197, 165, 90, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          <Download size={18} /> Instalar App no Celular
        </button>
      )}
      
      {isIOS && !isInstallable && (
        <div style={{ 
          padding: '16px', background: 'rgba(255, 255, 255, 0.05)', 
          border: '1px solid rgba(197, 165, 90, 0.3)', borderRadius: '12px', 
          fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px', color: 'var(--color-gold)' }}>
            <Info size={16} /> <strong style={{color: 'var(--color-gold)'}}>Instale o App no iPhone</strong>
          </div>
          <p style={{margin:0, lineHeight: '1.5'}}>
            Toque em <strong>Compartilhar</strong> <span style={{fontSize:'1.2rem', margin: '0 4px'}}>⍐</span> <br/> e depois em <strong>Adicionar à Tela de Início</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
