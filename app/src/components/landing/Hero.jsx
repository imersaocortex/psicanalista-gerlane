'use client';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero} suppressHydrationWarning>
      <div className={styles.meshBg} suppressHydrationWarning>
        <div className={styles.meshOrb1} suppressHydrationWarning />
        <div className={styles.meshOrb2} suppressHydrationWarning />
        <div className={styles.meshOrb3} suppressHydrationWarning />
        <div className={styles.meshOrb4} suppressHydrationWarning />
      </div>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.content} suppressHydrationWarning>
          <span className={styles.badge}>✦ Psicanálise Clínica</span>
          <h1 className={styles.title}>
            Cuidar da sua saúde emocional é um ato de{' '}
            <span className={styles.highlight}>coragem</span> e{' '}
            <span className={styles.highlight}>transformação</span>.
          </h1>
          <p className={styles.subtitle}>
            Um espaço seguro e acolhedor para você se reconectar consigo mesmo, 
            compreender suas emoções e trilhar o caminho do autoconhecimento.
          </p>
          <div className={styles.actions} suppressHydrationWarning>
            <a href="https://wa.me/5584998127788" target="_blank" rel="noopener noreferrer" className={styles.ctaPrimary}>
              <span className={styles.ctaGlow} />
              Agende sua sessão
              <span className={styles.ctaArrow}>→</span>
            </a>
            <a href="#sobre" className={styles.ctaSecondary}>
              Conheça mais
            </a>
          </div>
          <div className={styles.stats} suppressHydrationWarning>
            <div className={styles.stat} suppressHydrationWarning>
              <span className={styles.statNum}>+500</span>
              <span className={styles.statLabel}>Pacientes atendidos</span>
            </div>
            <div className={styles.statDivider} suppressHydrationWarning />
            <div className={styles.stat} suppressHydrationWarning>
              <span className={styles.statNum}>CNP</span>
              <span className={styles.statLabel}>20/2832</span>
            </div>
            <div className={styles.statDivider} suppressHydrationWarning />
            <div className={styles.stat} suppressHydrationWarning>
              <span className={styles.statNum}>CBO</span>
              <span className={styles.statLabel}>2515.50/2002</span>
            </div>
          </div>
        </div>
        <div className={styles.visual} suppressHydrationWarning>
          <div className={styles.imageFrame} suppressHydrationWarning>
            <img src="/images/gerlane.jpg" alt="Dra. Gerlane Albuquerque" className={styles.heroImage} suppressHydrationWarning />
            <div className={styles.imageGlow} suppressHydrationWarning />
          </div>
          <div className={styles.floatingCard1} suppressHydrationWarning>
            <span>💛</span>
            <span>Atendimento humanizado</span>
          </div>
          <div className={styles.floatingCard2} suppressHydrationWarning>
            <span>🕊️</span>
            <span>Online e presencial</span>
          </div>
        </div>
      </div>
    </section>
  );
}
