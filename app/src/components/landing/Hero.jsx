import Image from 'next/image';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.meshBg}>
        <div className={styles.meshOrb1} />
        <div className={styles.meshOrb2} />
        <div className={styles.meshOrb3} />
        <div className={styles.meshOrb4} />
      </div>
      <div className={styles.container}>
        <div className={styles.content}>
          <span className={styles.badge}>✦ Psicanálise Clínica</span>
          <h1 className={styles.title}>
            Psicanálise para cuidar da sua saúde emocional com{' '}
            <span className={styles.highlight}>acolhimento</span> e{' '}
            <span className={styles.highlight}>transformação</span>.
          </h1>
          <p className={styles.subtitle}>
            Com a Dra. Gerlane Albuquerque, encontre um espaço de escuta para se reconectar consigo mesmo,
            compreender suas emoções e trilhar o caminho do autoconhecimento.
          </p>
          <div className={styles.actions}>
            <a href="https://wa.me/5584998127788" target="_blank" rel="noopener noreferrer" className={styles.ctaPrimary}>
              <span className={styles.ctaGlow} />
              Agende sua sessão
              <span className={styles.ctaArrow}>→</span>
            </a>
            <a href="#sobre" className={styles.ctaSecondary}>
              Conheça a psicanalista
            </a>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>Escuta</span>
              <span className={styles.statLabel}>Acolhimento individualizado</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>CNP</span>
              <span className={styles.statLabel}>20/2832</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>CBO</span>
              <span className={styles.statLabel}>2515.50/2002</span>
            </div>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.imageFrame}>
            <Image width={587} height={758} loading="eager" fetchPriority="high" sizes="(max-width: 480px) calc(100vw - 48px), (max-width: 768px) 300px, 380px" src="/images/gerlane.jpg" alt="Dra. Gerlane Albuquerque, psicanalista clínica" className={styles.heroImage} />
            <div className={styles.imageGlow} />
          </div>
          <div className={styles.floatingCard1}>
            <span>💛</span>
            <span>Atendimento humanizado</span>
          </div>
          <div className={styles.floatingCard2}>
            <span>🕊️</span>
            <span>Online e presencial</span>
          </div>
        </div>
      </div>
    </section>
  );
}
