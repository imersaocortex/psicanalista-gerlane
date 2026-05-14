'use client';
import { useState } from 'react';
import styles from './faq.module.css';
import { HelpCircle, ChevronDown, Search } from 'lucide-react';

const faqData = [
  {
    category: "Sobre a Psicanálise",
    questions: [
      { q: "O que é a psicanálise?", a: "A psicanálise é um método terapêutico criado por Sigmund Freud que investiga o inconsciente. Através da fala livre, buscamos compreender a origem de sofrimentos, desejos e padrões de comportamento que influenciam nossa vida sem que percebamos." },
      { q: "Como funciona a primeira sessão?", a: "A primeira sessão é um momento de acolhimento. Não há roteiro rígido; você terá espaço para falar sobre o que te trouxe à terapia, suas expectativas e dúvidas. É um tempo para nos conhecermos e estabelecermos o início do vínculo terapêutico." },
      { q: "Qual a duração de cada sessão?", a: "As sessões individuais têm duração média de 50 minutos. Esse tempo é reservado exclusivamente para você, garantindo um ambiente de escuta profunda e ininterrupta." },
      { q: "Com que frequência devo fazer as sessões?", a: "O padrão clínico é de uma sessão por semana. Em alguns casos, dependendo da demanda e do momento do paciente, podemos acordar frequências maiores, mas a regularidade semanal é fundamental para o progresso do trabalho." },
      { q: "Quanto tempo dura o tratamento completo?", a: "Diferente de abordagens focadas em metas rápidas, a psicanálise não tem um tempo pré-determinado. O processo respeita o tempo subjetivo de cada indivíduo para elaborar suas questões e promover mudanças profundas." },
      { q: "Qual a diferença entre psicanalista, psicólogo e psiquiatra?", a: "O psicanalista foca no inconsciente. O psicólogo pode atuar com diversas abordagens (como TCC). O psiquiatra é um médico que avalia a parte biológica e pode prescrever medicação. Muitos pacientes fazem análise e acompanhamento psiquiátrico simultaneamente." },
      { q: "A psicanálise pode me ajudar com ansiedade?", a: "Sim. Mais do que apenas silenciar os sintomas da ansiedade, a psicanálise busca entender o que essa ansiedade está tentando 'dizer' e quais conflitos internos ela sinaliza." },
      { q: "E se eu não tiver nada para falar na sessão?", a: "O silêncio é uma parte valiosa da análise. Muitas vezes, é no silêncio ou na dificuldade de falar que surgem os conteúdos mais importantes. Estaremos aqui para acolher esse tempo também." },
      { q: "Posso fazer terapia se não estiver em crise?", a: "Com certeza. A análise é uma ferramenta poderosa de autoconhecimento e prevenção, permitindo que você lide melhor com a vida antes mesmo de grandes crises surgirem." },
      { q: "O que é o 'inconsciente' no processo analítico?", a: "É o conjunto de processos mentais, memórias e desejos que não estão acessíveis à nossa consciência imediata, mas que determinam grande parte das nossas escolhas e sentimentos." }
    ]
  },
  {
    category: "Logística e Agendamentos",
    questions: [
      { q: "Como faço para desmarcar uma sessão?", a: "Você pode desmarcar diretamente pela aba de 'Mensagens' aqui no Dashboard ou pelo WhatsApp oficial do consultório." },
      { q: "Qual o prazo para cancelamento sem custo?", a: "Pedimos que cancelamentos ou remarcações sejam feitos com no mínimo 24 horas de antecedência. Avisos feitos após esse prazo podem acarretar a cobrança integral do horário reservado." },
      { q: "E se eu chegar atrasado(a)?", a: "A sessão terminará no horário previsto originalmente. O tempo de atraso infelizmente não poderá ser compensado para não prejudicar o atendimento do paciente seguinte." },
      { q: "Posso alternar entre sessões presenciais e online?", a: "Sim, é possível. Basta avisar com antecedência mínima de 24h para que possamos organizar o consultório ou preparar a sala virtual." },
      { q: "Como funcionam as sessões online (sigilo e plataforma)?", a: "As sessões online ocorrem por videoconferência em plataformas seguras. É fundamental que o paciente esteja em um ambiente privado e silencioso para garantir o sigilo." },
      { q: "O que acontece se a conexão de internet cair?", a: "Caso a queda persista, tentaremos retomar a sessão por chamada de voz comum para garantir que o tempo de atendimento seja cumprido." },
      { q: "O consultório funciona em feriados?", a: "Geralmente não há atendimento em feriados nacionais, mas exceções podem ser acordadas previamente entre o analista e o paciente." }
    ]
  },
  {
    category: "Pagamentos e Planos",
    questions: [
      { q: "Quais as formas de pagamento aceitas?", a: "Aceitamos PIX, transferência bancária e cartões de crédito (via link de pagamento)." },
      { q: "Vocês aceitam convênios médicos?", a: "Trabalhamos exclusivamente com atendimento particular. No entanto, fornecemos recibos e documentação necessária para que você solicite o reembolso ao seu convênio." },
      { q: "Como funciona o reembolso pelo plano de saúde?", a: "Você realiza o pagamento da sessão/mês, nós emitimos o recibo e você o envia ao seu plano de saúde para receber o valor conforme a sua apólice." },
      { q: "Quando devo realizar o pagamento das sessões?", a: "Isso depende do plano escolhido: sessões avulsas são pagas no dia, enquanto pacotes mensais são pagos antecipadamente no início do mês." },
      { q: "Existem planos mensais ou pacotes?", a: "Sim, oferecemos opções de planos mensais com valores diferenciados em relação à sessão avulsa. Consulte a aba 'Pagamentos'." },
      { q: "Como recebo meus recibos para declaração de IR?", a: "Todos os recibos são emitidos digitalmente e enviados para você via e-mail ou mensagens aqui no portal." }
    ]
  },
  {
    category: "Privacidade e Ética",
    questions: [
      { q: "O que eu falo na sessão é realmente sigiloso?", a: "Sim, o sigilo absoluto é a base da psicanálise. Tudo o que é dito em sessão está protegido pelo código de ética profissional." },
      { q: "A Dra. Gerlane pode falar com minha família?", a: "Não. O sigilo é mantido integralmente, inclusive em relação a familiares, exceto em situações extremas de risco iminente à vida." },
      { q: "As sessões são gravadas?", a: "Jamais. As sessões não são gravadas nem por áudio nem por vídeo, visando a total liberdade e segurança do paciente." },
      { q: "Posso encontrar a psicanalista fora do consultório?", a: "Caso ocorram encontros casuais em locais públicos, a psicanalista manterá a discrição para preservar o seu setting e a sua privacidade." },
      { q: "Como funciona o sigilo em terapias de casal?", a: "Na terapia de casal, o sigilo é mantido em relação a terceiros. Informações trazidas individualmente podem ser trabalhadas no setting de casal conforme a necessidade terapêutica." }
    ]
  },
  {
    category: "Dúvidas Diversas",
    questions: [
      { q: "A psicanálise prescreve medicação?", a: "Não. Psicanalistas não prescrevem remédios. Se identificarmos a necessidade de suporte medicamentoso, encaminharemos você para uma avaliação psiquiátrica parceira." },
      { q: "Posso fazer terapia e acompanhamento psiquiátrico ao mesmo tempo?", a: "Sim, e essa combinação é frequentemente muito eficaz, unindo o tratamento biológico dos sintomas à elaboração psíquica das causas." }
    ]
  }
];

export default function FAQPage() {
  const [activeItem, setActiveItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleItem = (id) => {
    setActiveItem(activeItem === id ? null : id);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1><HelpCircle size={32} /> Dúvidas Frequentes</h1>
        <p className={styles.subtitle}>Encontre respostas para as perguntas mais comuns sobre o processo terapêutico.</p>
      </div>

      <div className={styles.faqContainer}>
        {faqData.map((category, catIndex) => (
          <div key={catIndex} className={styles.categorySection}>
            <h3 className={styles.categoryTitle}>{category.category}</h3>
            <div className={styles.accordion}>
              {category.questions.map((item, qIndex) => {
                const itemId = `${catIndex}-${qIndex}`;
                const isActive = activeItem === itemId;
                
                return (
                  <div key={qIndex} className={`${styles.faqItem} ${isActive ? styles.active : ''}`}>
                    <button className={styles.question} onClick={() => toggleItem(itemId)}>
                      <h4>{item.q}</h4>
                      <ChevronDown size={18} className={styles.icon} />
                    </button>
                    <div className={styles.answer}>
                      <div className={styles.answerContent}>
                        <p>{item.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
