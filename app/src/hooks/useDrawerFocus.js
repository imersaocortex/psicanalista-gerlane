'use client';
import { useEffect } from 'react';

// Keep keyboard navigation inside an open mobile drawer and restore the trigger.
export function useDrawerFocus(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia('(max-width: 1024px)');
    if (!media.matches) return;
    const drawer = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')].filter(el => el.getClientRects().length);
    const focusFrame = requestAnimationFrame(() => focusable()[0]?.focus({ preventScroll: true }));
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const targets = focusable();
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (!media.matches) onClose(); };
    document.addEventListener('keydown', keydown);
    media.addEventListener('change', resize);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', keydown);
      media.removeEventListener('change', resize);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [ref, open, onClose]);
}
