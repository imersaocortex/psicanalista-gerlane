'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './LandingSections.module.css';
import { 
  User, 
  Search, 
  MessageCircle, 
  Sparkles, 
  Handshake, 
  Baby, 
  GraduationCap, 
  Users, 
  Heart, 
  Building2, 
  Laptop, 
  ShieldCheck, 
  TrendingUp, 
  Eye, 
  Phone, 
  FileText,
  CheckCircle2,
  Quote,
  Send,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

/* Scroll Reveal hook */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    const el = ref.current;
    if (el) {
      el.querySelectorAll(`.${styles.reveal}`).forEach(child => observer.observe(child));
    }
    return () => observer.disconnect();
  }, []);
  return ref;
}

export function WhatsAppFloat() {
  return (
    <a 
      href="https://wa.me/5584998127788" 
      target="_blank" 
      rel="noopener noreferrer" 
      className={styles.whatsappFloat}
      aria-label="Falar no WhatsApp"
    >
      <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.894-5.335 11.897-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  );
}

export function About() {
  const ref = useScrollReveal();
  return (
    <section id="sobre" className={styles.section} ref={ref} suppressHydrationWarning>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.aboutGrid} suppressHydrationWarning>
          <div className={`${styles.aboutImage} ${styles.reveal}`} suppressHydrationWarning>
            <img src="/images/gerlane1.jpg" alt="Dra. Gerlane Albuquerque" className={styles.aboutImg} suppressHydrationWarning />
            <div className={styles.aboutImgGlow} suppressHydrationWarning />
          </div>
          <div className={`${styles.aboutContent} ${styles.reveal}`} suppressHydrationWarning>
            <span className={styles.sectionBadge} suppressHydrationWarning>Sobre</span>
            <h2 suppressHydrationWarning>Dra. Gerlane Albuquerque</h2>
            <div className={styles.divider} suppressHydrationWarning />
            <p>Psicanalista clínica dedicada ao acolhimento e tratamento de questões emocionais. Formada com especialização em Psicanálise, com registro CNP 20/2832 e CBO 2515.50/2002.</p>
            <p>Meu trabalho é guiado pela escuta atenta e pelo respeito ao tempo de cada paciente. Acredito que a psicanálise é um caminho de transformação profunda, onde cada pessoa pode se reconectar com sua essência e encontrar novos sentidos para a vida.</p>
            <div className={styles.aboutDetails} suppressHydrationWarning>
              <div className={styles.aboutDetail} suppressHydrationWarning><GraduationCap size={20} color="var(--color-green)" /> Especialista em Psicanálise</div>
              <div className={styles.aboutDetail} suppressHydrationWarning><FileText size={20} color="var(--color-green)" /> CNP: 20/2832</div>
              <div className={styles.aboutDetail} suppressHydrationWarning><Building2 size={20} color="var(--color-green)" /> CBO: 2515.50/2002</div>
              <div className={styles.aboutDetail} suppressHydrationWarning><ShieldCheck size={20} color="var(--color-green)" /> Registro Oficial</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Psychoanalysis() {
  const ref = useScrollReveal();
  const psyItems = [
    { icon: <Search size={32} />, title: 'Autoconhecimento', desc: 'Explore suas emoções, pensamentos e comportamentos em um ambiente seguro e sem julgamentos.' },
    { icon: <MessageCircle size={32} />, title: 'Escuta Qualificada', desc: 'Uma escuta atenta que acolhe o que você sente e ajuda a dar sentido às suas experiências.' },
    { icon: <Sparkles size={32} />, title: 'Transformação', desc: 'Ressignifique suas vivências e construa novas possibilidades de ser e estar no mundo.' },
    { icon: <Handshake size={32} />, title: 'Vínculo Terapêutico', desc: 'Uma relação de confiança entre analista e paciente, base fundamental do processo analítico.' },
  ];

  return (
    <section id="psicanalise" className={`${styles.section} ${styles.bgAlt}`} ref={ref} suppressHydrationWarning>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.reveal} suppressHydrationWarning>
          <span className={styles.sectionBadge}>Entenda</span>
          <h2 className={styles.centered}>O que é Psicanálise?</h2>
          <div className={styles.dividerCenter} suppressHydrationWarning />
          <p className={styles.sectionSub}>A psicanálise é um método de investigação do inconsciente que permite compreender as raízes mais profundas do sofrimento psíquico e transformar padrões que se repetem.</p>
        </div>
        <div className={styles.psyGrid} suppressHydrationWarning>
          {psyItems.map((item, i) => (
            <div key={i} className={`${styles.psyCard} ${styles.reveal}`} style={{ animationDelay: `${i * 0.1}s` }} suppressHydrationWarning>
              <span className={styles.psyIcon}>{item.icon}</span>
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AreasOfPractice() {
  const ref = useScrollReveal();
  const areas = [
    { icon: <Baby size={40} />, title: 'Crianças', desc: 'Atendimento lúdico e sensível para questões emocionais, comportamentais e de desenvolvimento infantil.' },
    { icon: <GraduationCap size={40} />, title: 'Adolescentes', desc: 'Suporte para os desafios da adolescência: identidade, pressão social, sexualidade e autonomia.' },
    { icon: <User size={40} />, title: 'Adultos', desc: 'Acompanhamento para ansiedade, depressão, relacionamentos, autoestima e crises existenciais.' },
    { icon: <Heart size={40} />, title: 'Casais', desc: 'Espaço para compreender os conflitos conjugais e fortalecer a comunicação e o vínculo afetivo.' },
  ];

  return (
    <section id="areas" className={styles.section} ref={ref} suppressHydrationWarning>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.reveal} suppressHydrationWarning>
          <span className={styles.sectionBadge}>Especialidades</span>
          <h2 className={styles.centered}>Áreas de Atuação</h2>
          <div className={styles.dividerCenter} suppressHydrationWarning />
        </div>
        <div className={styles.areasGrid} suppressHydrationWarning>
          {areas.map((area, i) => (
            <div key={i} className={`${styles.areaCard} ${styles.reveal}`} style={{ animationDelay: `${i * 0.12}s` }} suppressHydrationWarning>
              <span className={styles.areaEmoji}>{area.icon}</span>
              <h4>{area.title}</h4>
              <p>{area.desc}</p>
              <div className={styles.cardGlow} suppressHydrationWarning />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Modalities() {
  const ref = useScrollReveal();
  return (
    <section className={`${styles.section} ${styles.bgAlt}`} ref={ref} suppressHydrationWarning>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.reveal} suppressHydrationWarning>
          <span className={styles.sectionBadge}>Modalidades</span>
          <h2 className={styles.centered}>Como posso te atender</h2>
          <div className={styles.dividerCenter} suppressHydrationWarning />
        </div>
        <div className={styles.modalitiesGrid} suppressHydrationWarning>
          <div className={`${styles.modalityCard} ${styles.reveal}`} suppressHydrationWarning>
            <span className={styles.modalityIcon}><Building2 size={48} /></span>
            <h3>Presencial</h3>
            <p>Atendimento no consultório em ambiente confortável e preparado para seu acolhimento.</p>
            <ul className={styles.modalityList}>
              <li><CheckCircle2 size={16} /> Ambiente climatizado e silencioso</li>
              <li><CheckCircle2 size={16} /> Localização acessível</li>
              <li><CheckCircle2 size={16} /> Total privacidade</li>
            </ul>
          </div>
          <div className={`${styles.modalityCard} ${styles.reveal}`} suppressHydrationWarning>
            <span className={styles.modalityIcon}><Laptop size={48} /></span>
            <h3>Online</h3>
            <p>Sessões por videoconferência com a mesma qualidade e sigilo do atendimento presencial.</p>
            <ul className={styles.modalityList}>
              <li><CheckCircle2 size={16} /> Plataforma segura e criptografada</li>
              <li><CheckCircle2 size={16} /> Flexibilidade de horários</li>
              <li><CheckCircle2 size={16} /> Atendimento em todo o Brasil</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhoIsItFor() {
  const ref = useScrollReveal();
  const situations = [
    'Ansiedade e crises de pânico', 'Depressão e tristeza persistente',
    'Dificuldades nos relacionamentos', 'Luto e perdas significativas',
    'Baixa autoestima e insegurança', 'Estresse e burnout profissional',
    'Conflitos familiares', 'Fases de transição e mudanças',
    'Dificuldades com a maternidade/paternidade', 'Busca por autoconhecimento',
  ];

  return (
    <section className={styles.section} ref={ref} suppressHydrationWarning>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.reveal} suppressHydrationWarning>
          <span className={styles.sectionBadge}>Indicações</span>
          <h2 className={styles.centered}>Para quem é indicado?</h2>
          <div className={styles.dividerCenter} suppressHydrationWarning />
          <p className={styles.sectionSub}>A psicanálise é para todas as pessoas que desejam compreender melhor a si mesmas.</p>
        </div>
        <div className={styles.situationsGrid} suppressHydrationWarning>
          {situations.map((s, i) => (
            <div key={i} className={`${styles.situationItem} ${styles.reveal}`} style={{ animationDelay: `${i * 0.05}s` }} suppressHydrationWarning>
              <span className={styles.situationDot} />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Differentials() {
  const ref = useScrollReveal();
  const diffs = [
    { icon: <Heart size={40} />, title: 'Acolhimento genuíno', text: 'Cada paciente é único. O tratamento é personalizado e respeita seu ritmo.' },
    { icon: <ShieldCheck size={40} />, title: 'Sigilo absoluto', text: 'Tudo o que é compartilhado nas sessões é protegido pelo sigilo profissional.' },
    { icon: <TrendingUp size={40} />, title: 'Crescimento contínuo', text: 'Invisto constantemente em formação para oferecer o melhor cuidado.' },
    { icon: <Eye size={40} />, title: 'Olhar integral', text: 'Considero todas as dimensões da vida do paciente.' },
  ];

  return (
    <section className={`${styles.section} ${styles.bgDark}`} ref={ref} suppressHydrationWarning>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.reveal} suppressHydrationWarning>
          <span className={styles.sectionBadgeDark}>Diferenciais</span>
          <h2 className={`${styles.centered} ${styles.textLight}`}>Por que escolher meu consultório?</h2>
          <div className={styles.dividerCenter} suppressHydrationWarning />
        </div>
        <div className={styles.diffsGrid} suppressHydrationWarning>
          {diffs.map((d, i) => (
            <div key={i} className={`${styles.diffCard} ${styles.reveal}`} style={{ animationDelay: `${i * 0.1}s` }} suppressHydrationWarning>
              <span className={styles.diffIcon}>{d.icon}</span>
              <h4>{d.title}</h4>
              <p>{d.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const ref = useScrollReveal();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const testimonials = [
    { name: 'A.M.', text: 'A terapia com a Dra. Gerlane transformou minha relação comigo mesma. Aprendi a me escutar e a respeitar meus limites. Sou eternamente grata.', time: 'Paciente há 2 anos', theme: 'Geral' },
    { name: 'R.S.', text: 'Depois de perder meu pai, achei que nunca mais seria o mesmo. O trabalho analítico me ajudou a encontrar um novo caminho.', time: 'Paciente há 1 ano', theme: 'Luto' },
    { name: 'J.M.', text: 'A terapia de casal nos salvou. Aprendemos a nos ouvir de verdade e a reconstruir a confiança. Recomendo de olhos fechados.', time: 'Pacientes há 8 meses', theme: 'Casal' },
    { name: 'M.L.', text: 'Vivia em um quarto escuro emocional devido à depressão. A psicanálise me ajudou a abrir as janelas e redescobrir a cor da vida.', time: 'Paciente há 6 meses', theme: 'Depressão' },
    { name: 'P.H.', text: 'Minha mente era um turbilhão constante pela ansiedade. Hoje, consigo respirar e entender os sinais do meu corpo sem pânico.', time: 'Paciente há 1.5 anos', theme: 'Ansiedade' },
    { name: 'C.T.', text: 'O Burnout tinha me consumido. Recuperar minha identidade e estabelecer limites saudáveis no trabalho foi o maior ganho desse processo.', time: 'Paciente há 10 meses', theme: 'Burnout' },
    { name: 'L.F.', text: 'Viver nos extremos do Borderline era exaustivo. Encontrei aqui um porto seguro para regular minhas tempestades internas e encontrar equilíbrio.', time: 'Paciente há 2 anos', theme: 'Borderline' },
    { name: 'S.R.', text: 'Achei que o término do meu relacionamento seria o meu fim. Mas foi o começo de uma nova relação, muito mais saudável, comigo mesma.', time: 'Paciente há 7 meses', theme: 'Relacionamento' },
    { name: 'D.G.', text: 'Vim em busca de aptidão emocional para minha carreira e vida pessoal. Minha inteligência emocional hoje é meu maior diferencial estratégico.', time: 'Paciente há 1 ano', theme: 'Aptidão Emocional' },
  ];

  // Número de posições possíveis (exibindo 3 cards por vez em telas grandes)
  const maxSlides = testimonials.length - 2;

  const nextSlide = () => setActiveSlide((prev) => (prev + 1) % testimonials.length);
  const prevSlide = () => setActiveSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Ajuste do offset baseado na largura da tela
  const getTranslateX = () => {
    if (!mounted) return '0%';
    if (window.innerWidth <= 1024) {
      return `-${activeSlide * 100}%`;
    }
    const limitedSlide = activeSlide > maxSlides ? 0 : activeSlide;
    return `-${limitedSlide * 33.333}%`;
  };

  return (
    <section className={styles.section} ref={ref} suppressHydrationWarning>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.reveal} suppressHydrationWarning>
          <span className={styles.sectionBadge}>Depoimentos</span>
          <h2 className={styles.centered}>Relatos de Transformação</h2>
          <div className={styles.dividerCenter} suppressHydrationWarning />
        </div>

        <div 
          className={`${styles.testimonialCarousel} ${styles.reveal}`}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          suppressHydrationWarning
        >
          <div className={styles.carouselTrack} style={{ transform: mounted ? `translateX(${getTranslateX()})` : 'none' }} suppressHydrationWarning>
            {testimonials.map((t, i) => (
              <div key={i} className={styles.carouselSlideThree} suppressHydrationWarning>
                <div className={styles.testimonialCardMini} suppressHydrationWarning>
                  <div className={styles.testimonialThemeBadge} suppressHydrationWarning>{t.theme}</div>
                  <div className={styles.testimonialQuote} suppressHydrationWarning><Quote size={30} /></div>
                  <p className={styles.testimonialTextMini}>{t.text}</p>
                  <div className={styles.testimonialAuthorMini} suppressHydrationWarning>
                    <div className={styles.testimonialAvatarSmall} suppressHydrationWarning>{t.name.charAt(0)}</div>
                    <div className={styles.authorInfo} suppressHydrationWarning>
                      <span className={styles.authorName}>{t.name}</span>
                      <span className={styles.testimonialTime}>{t.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className={`${styles.carouselBtn} ${styles.prev}`} onClick={prevSlide}><ChevronLeft size={24} /></button>
          <button className={`${styles.carouselBtn} ${styles.next}`} onClick={nextSlide}><ChevronRight size={24} /></button>

          <div className={styles.carouselDots} suppressHydrationWarning>
            {testimonials.map((_, i) => (
              <button 
                key={i} 
                className={`${styles.dot} ${activeSlide === i ? styles.dotActive : ''}`} 
                onClick={() => setActiveSlide(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className={styles.ctaSection} suppressHydrationWarning>
      <div className={styles.ctaMesh} suppressHydrationWarning>
        <div className={styles.ctaOrb1} suppressHydrationWarning />
        <div className={styles.ctaOrb2} suppressHydrationWarning />
      </div>
      <div className={styles.container} style={{position:'relative', zIndex: 1}} suppressHydrationWarning>
        <div className={styles.ctaContent} suppressHydrationWarning>
          <h2>Você não precisa enfrentar isso sozinho(a).</h2>
          <p>O primeiro passo para a transformação é permitir-se ser escutado. Estou aqui para caminhar ao seu lado nessa jornada.</p>
          <a href="https://wa.me/5584998127788" target="_blank" rel="noopener noreferrer" className={styles.ctaBigBtn}>
            Agende sua primeira sessão →
          </a>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const ref = useScrollReveal();
  return (
    <section id="contato" className={styles.section} ref={ref} suppressHydrationWarning>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.reveal} suppressHydrationWarning>
          <span className={styles.sectionBadge}>Contato</span>
          <h2 className={styles.centered}>Fale comigo</h2>
          <div className={styles.dividerCenter} suppressHydrationWarning />
        </div>
        
        <div className={styles.contactWrapper} suppressHydrationWarning>
          <div className={`${styles.contactSidebar} ${styles.reveal}`} suppressHydrationWarning>
            <div className={styles.contactCard} suppressHydrationWarning>
              <div className={styles.contactCardIcon} style={{background: '#25D366'}} suppressHydrationWarning>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.894-5.335 11.897-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className={styles.contactCardInfo} suppressHydrationWarning>
                <h4>WhatsApp</h4>
                <a href="https://wa.me/5584998127788" target="_blank" rel="noopener noreferrer">(84) 99812-7788</a>
              </div>
            </div>

            <div className={styles.contactCard} suppressHydrationWarning>
              <div className={styles.contactCardIcon} style={{background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'}} suppressHydrationWarning>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058-1.646-.07 4.85-.07M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </div>
              <div className={styles.contactCardInfo} suppressHydrationWarning>
                <h4>Instagram</h4>
                <a href="https://instagram.com/psicanalista_gerlane" target="_blank" rel="noopener noreferrer">@psicanalista_gerlane</a>
              </div>
            </div>

            <div className={styles.contactCard} suppressHydrationWarning>
              <div className={styles.contactCardIcon} style={{background: 'black'}} suppressHydrationWarning>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
                </svg>
              </div>
              <div className={styles.contactCardInfo} suppressHydrationWarning>
                <h4>TikTok</h4>
                <a href="https://tiktok.com/@dragerlane.psican" target="_blank" rel="noopener noreferrer">@dragerlane.psican</a>
              </div>
            </div>

            <a 
              href="https://conselhopsicanalise.com.br/psicanalistas/?busca=Gerlane+Silva+de+Albuquerque" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.contactCard}
              style={{textDecoration: 'none'}}
              suppressHydrationWarning
            >
              <div className={styles.contactCardIcon} style={{background: 'var(--color-green)'}} suppressHydrationWarning>
                <FileText size={20} color="white" />
              </div>
              <div className={styles.contactCardInfo} suppressHydrationWarning>
                <h4>Registro Oficial</h4>
                <p>CNP: 20/2832 · CBO: 2515.50/2002</p>
                <span style={{fontSize: '10px', color: 'var(--color-gold)', fontWeight: '700', textTransform: 'uppercase', marginTop: '4px', display: 'block'}}>Clique para verificar →</span>
              </div>
            </a>

          </div>

          <form className={`${styles.contactForm} ${styles.reveal}`} onSubmit={e => e.preventDefault()}>
            <div className={styles.formGroup} suppressHydrationWarning>
              <label>Nome Completo</label>
              <input type="text" placeholder="Como deseja ser chamado(a)?" />
            </div>
            <div className={styles.formGroup} suppressHydrationWarning>
              <label>WhatsApp / Telefone</label>
              <input type="tel" placeholder="(84) 99812-7788" />
            </div>
            <div className={styles.formGroup} suppressHydrationWarning>
              <label>Mensagem</label>
              <textarea rows={4} placeholder="Como posso te ajudar hoje?" />
            </div>
            <button type="submit" className={styles.submitBtn}>
              Enviar mensagem <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer} suppressHydrationWarning>
      <div className={styles.container} suppressHydrationWarning>
        <div className={styles.footerContent} suppressHydrationWarning>
          <div className={styles.footerBrand} suppressHydrationWarning>
            <img src="/images/logo-footer.png" alt="Logo Footer" className={styles.footerLogo} />
            <div className={styles.footerInfo} suppressHydrationWarning>
              <h4 className={styles.highlightText}>Dra. Gerlane Albuquerque</h4>
              <p className={styles.highlightText}>Psicanalista Clínica | CNP: 20/2832</p>
              <p className={styles.footerDesc}>Acolhimento e transformação através da escuta psicanalítica.</p>
            </div>
          </div>
          
          <div className={styles.footerNav} suppressHydrationWarning>
            <div className={styles.footerLinksCol} suppressHydrationWarning>
              <h4 className={styles.highlightText}>Navegação</h4>
              <a href="#sobre">Sobre</a>
              <a href="#psicanalise">Psicanálise</a>
              <a href="#areas">Áreas de Atuação</a>
              <a href="#contato">Contato</a>
            </div>
            
            <div className={styles.footerLinksCol} suppressHydrationWarning>
              <h4 className={styles.highlightText}>Redes Sociais</h4>
              <div className={styles.socialRow} suppressHydrationWarning>
                <a href="https://instagram.com/psicanalista_gerlane" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058-1.646-.07 4.85-.07M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  Instagram
                </a>
                <a href="https://tiktok.com/@dragerlane.psican" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
                  </svg>
                  TikTok
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.footerBottom} suppressHydrationWarning>
          <p>© 2025 Dra. Gerlane Albuquerque. Todos os direitos reservados.</p>
          <div className={styles.footerLegal} suppressHydrationWarning>
            <span>Psicanalista Clínica | CNP 20/2832</span>
            <span className={styles.devBy}>
              Desenvolvimento By: <a href="https://imersaocortex.com.br" target="_blank" rel="noopener noreferrer">Imersão Córtex</a>
            </span>
          </div>
        </div>
      </div>
      <WhatsAppFloat />
    </footer>
  );
}
