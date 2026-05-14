'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div 
      suppressHydrationWarning
      style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        zIndex: 'var(--z-toast)', pointerEvents: 'none'
      }}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const colors = {
    success: { bg: '#E8F5E8', border: '#6B9B6B', text: '#2D5A2D', icon: '#6B9B6B' },
    error: { bg: '#FDE8E8', border: '#C45A5A', text: '#8B2C2C', icon: '#C45A5A' },
    warning: { bg: '#FFF4E0', border: '#D4A04A', text: '#8B6914', icon: '#D4A04A' },
    info: { bg: '#E8F0FD', border: '#5A8EC4', text: '#2C4A6B', icon: '#5A8EC4' },
  };
  const c = colors[toast.type] || colors.success;

  return (
    <div 
      suppressHydrationWarning
      style={{
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)', pointerEvents: 'auto',
        animation: 'slideInFromBottom 0.4s ease', minWidth: '300px', maxWidth: '420px'
      }}
    >
      <span style={{ fontSize: '18px', color: c.icon, fontWeight: 'bold' }}>{icons[toast.type]}</span>
      <span style={{ flex: 1, color: c.text, fontSize: '14px', fontWeight: 500 }}>{toast.message}</span>
      <button onClick={onClose} style={{ color: c.text, opacity: 0.6, fontSize: '16px', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
    </div>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
