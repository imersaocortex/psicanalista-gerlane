'use client';
import { useState } from 'react';
import { FileText, Send } from 'lucide-react';
import styles from './LandingSections.module.css';

export default function Contact() {
  const [contactReady, setContactReady] = useState(false);
  function handleContact(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = 'Olá! Sou ' + String(data.get('nome')).trim() + '. Meu contato: ' + String(data.get('telefone')).trim() + '. ' + String(data.get('mensagem')).trim();
    window.open('https://wa.me/5584998127788?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
    setContactReady(true);
  }
  return (
    <section id="contato" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.reveal}>
          <span className={styles.sectionBadge}>Contato</span>
          <h2 className={styles.centered}>Fale comigo</h2>
          <div className={styles.dividerCenter} />
        </div>

        <div className={styles.contactWrapper}>
          <div className={`${styles.contactSidebar} ${styles.reveal}`}>
            <div className={styles.contactCard}>
              <div className={styles.contactCardIcon} style={{background: '#25D366'}}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.894-5.335 11.897-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className={styles.contactCardInfo}>
                <h3>WhatsApp</h3>
                <a href="https://wa.me/5584998127788" target="_blank" rel="noopener noreferrer">(84) 99812-7788</a>
              </div>
            </div>

            <div className={styles.contactCard}>
              <div className={styles.contactCardIcon} style={{background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'}}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058-1.646-.07 4.85-.07M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </div>
              <div className={styles.contactCardInfo}>
                <h3>Instagram</h3>
                <a href="https://instagram.com/psicanalista_gerlane" target="_blank" rel="noopener noreferrer">@psicanalista_gerlane</a>
              </div>
            </div>

            <div className={styles.contactCard}>
              <div className={styles.contactCardIcon} style={{background: 'black'}}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
                </svg>
              </div>
              <div className={styles.contactCardInfo}>
                <h3>TikTok</h3>
                <a href="https://tiktok.com/@dragerlane.psican" target="_blank" rel="noopener noreferrer">@dragerlane.psican</a>
              </div>
            </div>

            <a
              href="https://conselhopsicanalise.com.br/psicanalistas/?busca=Gerlane+Silva+de+Albuquerque"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactCard}
              style={{textDecoration: 'none'}}
            >
              <div className={styles.contactCardIcon} style={{background: 'var(--color-green)'}}>
                <FileText size={20} color="white" />
              </div>
              <div className={styles.contactCardInfo}>
                <h3>Registro Oficial</h3>
                <p>CNP: 20/2832 · CBO: 2515.50/2002</p>
                <span style={{fontSize: '10px', color: 'var(--color-gold)', fontWeight: '700', textTransform: 'uppercase', marginTop: '4px', display: 'block'}}>Clique para verificar →</span>
              </div>
            </a>

          </div>

          <form className={`${styles.contactForm} ${styles.reveal}`} onSubmit={handleContact}>
            <div className={styles.formGroup}>
              <label htmlFor="contato-nome">Nome Completo</label>
              <input id="contato-nome" name="nome" type="text" autoComplete="name" minLength={3} maxLength={120} required placeholder="Como deseja ser chamado(a)?" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="contato-telefone">WhatsApp / Telefone</label>
              <input id="contato-telefone" name="telefone" type="tel" autoComplete="tel" maxLength={20} required placeholder="Seu telefone com DDD" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="contato-mensagem">Mensagem</label>
              <textarea id="contato-mensagem" name="mensagem" required maxLength={1000} rows={4} placeholder="Como posso te ajudar hoje?" />
            </div>
            <button type="submit" className={styles.submitBtn}>
              Continuar no WhatsApp <Send size={18} />
            </button>
          <p>Você poderá revisar a mensagem no WhatsApp antes de enviá-la. Evite incluir informações clínicas neste formulário.</p>{contactReady && <p role="status">Mensagem preparada. Conclua o envio no WhatsApp.</p>}
          </form>
        </div>
      </div>
    </section>
  );
}

