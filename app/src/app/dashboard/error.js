'use client';

import { useEffect } from 'react';

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    // Log the error for debugging
    console.error('Dashboard Error Boundary Caught:', error);
    
    // Se for um erro comum de transição de deploy ou chunk (que causa a tela branca)
    // nós forçamos o recarregamento da página para limpar o cache da Vercel no navegador
    const errorMsg = error?.message?.toLowerCase() || '';
    if (
      errorMsg.includes('chunk') || 
      errorMsg.includes('hydration') ||
      errorMsg.includes('failed to fetch') ||
      errorMsg.includes('fetch failed')
    ) {
      // Pequeno atraso para evitar reload infinito caso o erro persista
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-primary, #f8f9fa)',
      color: 'var(--text-primary, #1e293b)',
      fontFamily: 'var(--font-sans, sans-serif)',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h2 style={{ marginBottom: '1rem', color: 'var(--color-error, #e74c3c)' }}>
        Ops! Algo deu errado.
      </h2>
      <p style={{ marginBottom: '2rem', maxWidth: '400px', lineHeight: '1.5' }}>
        Ocorreu uma falha inesperada no carregamento da interface. Isso geralmente acontece quando o sistema recebe uma nova atualização enquanto você navega.
      </p>
      <button 
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 24px',
          backgroundColor: 'var(--color-green, #749f82)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '1rem',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        Recarregar Sistema
      </button>
    </div>
  );
}
