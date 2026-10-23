# Responsividade e SEO — Dra. Gerlane Albuquerque

Implementação em 23/10/2026, sobre a versão publicada do projeto Next.js 16.2.4.

## Diagnóstico e resultado

A lateral dos painéis não possuía área de rolagem. Além disso, a lateral era ocultada até 1024px, enquanto o botão para abri-la só aparecia até 768px; a navegação inferior também desaparecia em 1024px. Os pontos de quebra agora coincidem, a navegação interna rola, e alturas dinâmicas e áreas seguras são respeitadas. Foram ajustados formulários, grids, tabelas, calendários, modais e relatório clínico. O nome Acolher permanece no aplicativo; a landing mantém a identidade da Dra. Gerlane Albuquerque.

## SEO implementado

- Metadados específicos para início e privacidade; canonical HTTPS absoluto no domínio real, sem parâmetros. Idioma pt-BR e viewport sem restrição de zoom.
- Robots meta e X-Robots-Tag noindex para acesso, recuperação de senha, autenticação, API e painéis. Autenticação e permissões existentes foram preservadas. O robots.txt permite renderizar CSS, JavaScript e imagens; páginas com noindex podem ser rastreadas para que essa diretiva seja lida.
- Sitemap com somente início e privacidade; sem rotas privadas, dados pessoais ou timestamps artificiais.
- Open Graph completo, locale pt_BR e Twitter summary_large_image. Imagem real gerada pelo Next.js em /opengraph-image, PNG de 1200 × 630, com a fotografia existente.
- JSON-LD: Organization, Person, WebSite, WebPage e Service. Sem avaliações, preços ou endereço inventados. Não foi usado SoftwareApplication, pois a landing apresenta o atendimento clínico. Sem LocalBusiness por falta de endereço público completo confirmado. Não foi criado breadcrumb artificial para uma página única.
- H1 único com psicanálise e saúde emocional; títulos de cartões H3 sob suas seções H2, navegação acessível, link para pular ao conteúdo, alt descritivo e link institucional de privacidade.
- 404 real com status 404 e noindex, sem redirecionar endereços inexistentes para a página inicial. Os parâmetros não alteram o canonical.
- Favicon derivado do ícone profissional já existente. Ícones de lótus do aplicativo preservados.

## Conteúdo e intenção de busca

Intenção principal comercial: conhecer a profissional e entrar em contato para atendimento em psicanálise. Termo principal: psicanalista clínica. Termos relacionados usados naturalmente: psicanálise, atendimento online e presencial, saúde emocional, autoconhecimento, escuta e acolhimento. Não foram presumidos volumes de pesquisa nem inseridas localidades sem confirmação. A estrutura pública pode receber futuras páginas com conteúdo próprio; elas só devem entrar no sitemap depois de existirem e serem revisadas.

## Performance

- Hero e seções estáticas passaram a componentes de servidor. O formulário interativo foi separado em Contact.jsx, reduzindo JavaScript no navegador.
- Conteúdo principal visível no HTML e sem depender de IntersectionObserver para deixar de estar transparente.
- Imagens usam dimensões reais, sizes responsivo e otimização AVIF/WebP do Next.js. Hero com carregamento imediato e prioridade alta; imagem abaixo da dobra com lazy loading.
- Foto original: 40.987 bytes JPEG. Resposta otimizada medida localmente em 384px: 8.109 bytes AVIF, aproximadamente 80% menor, cache de 14.400s. O resultado varia por resolução e formato negociado.
- Fontes mantidas, com display=swap, preconnect e descoberta da folha de fontes diretamente no HTML, eliminando o encadeamento pelo @import do CSS.
- Animações respeitam prefers-reduced-motion; ouvinte de rolagem passivo; nenhum script de Analytics é carregado na configuração atual, sem ID e sem consentimento.

## Testes executados

| Verificação | Resultado |
| --- | --- |
| Build Next.js de produção | Passou; 47 páginas geradas |
| ESLint | Passou, zero erros e avisos |
| Regressão de cobrança | 11/11 testes passaram |
| Segurança HTTP | 7/7 testes passaram |
| SEO HTTP no build de produção | 5/5 testes passaram |
| Login administrativo e do paciente | Ambos acessaram os respectivos painéis no ambiente local |
| Painéis em 320, 390, 768, 900, 1024 e 1280px | Sem rolagem horizontal de página nos painéis iniciais; botão disponível até 1024px |
| Menu em tela baixa de 400px | Rolagem interna disponível; último item alcançável e retorno por Tab; Escape fecha |
| Admin em 320px: agenda, financeiro, planos, configurações, novo agendamento e novo paciente | Conteúdo carregado, sem overflow da página; financeiro com rolagem própria da tabela |
| Paciente em 320px: agenda, planos, pagamentos, anamnese, perfil e FAQ | Conteúdo carregado sem overflow da página |
| Landing em celular, tablet e desktop, de 320 a 1280px | Sem overflow horizontal da página |
| Links locais e imagens do HTML da landing | Respostas 200; âncoras existentes |
| Imagem social | Resposta 200 image/png; cabeçalho PNG confirma 1200 × 630 |
| JSON-LD | JSON parseável, referências @id consistentes, URLs das seções existentes |
| Rotas privadas sem sessão | Redirecionam ao login; APIs protegidas continuam rejeitando acesso anônimo |

Os testes responsivos foram feitos no navegador com viewport emulado, não em aparelhos físicos. Nenhuma consulta foi agendada e nenhum pagamento ou envio de mensagem real foi realizado nesta etapa. Os testes de cobrança incluem cenários controlados e não substituem um pagamento real com o provedor.

## Configuração externa e próximos passos

1. Search Console: configurar GOOGLE_SITE_VERIFICATION com o token real ou verificar o domínio via DNS; enviar https://psicanalistagerlane.com.br/sitemap.xml e usar Inspeção de URL. Não há token inventado no projeto.
2. GA4 opcional: configurar NEXT_PUBLIC_GA_MEASUREMENT_ID com o ID real e republicar. O módulo fica apenas na landing e só carrega após permissão. Permite recusa e retirada da permissão, desliga o coletor ao sair da landing e não envia campos de formulário, dados de conta ou dados clínicos.
3. Antes de ativar GA4, desativar medição otimizada automática na propriedade, especialmente histórico de navegação, cliques de saída e interações de formulários. Manter somente os eventos explícitos e revisar privacidade com a clínica. Não instalar GTM junto para duplicar tags.
4. Eventos previstos: page_view com URL pública fixa, contact_click e contact_form_prepare. Preparar uma mensagem não equivale a enviá-la nem a concluir agendamento; não marcar esse evento como consulta paga.
5. Validar em produção pelo PageSpeed Insights, Rich Results Test e Schema Markup Validator. Esses validadores externos e Lighthouse não foram executados nesta etapa; os testes de JSON-LD são locais, não uma certificação do Google. Métricas de campo LCP, INP e CLS dependem de tráfego e acompanhamento posterior.
6. Confirmar publicamente endereço e região do atendimento presencial antes de acrescentar marcação local ou criar perfil comercial. Revisar a política com a responsável pelos dados antes de ativar novos rastreadores. Não foram criados termos jurídicos sem conteúdo fornecido pela clínica.

As melhorias técnicas não garantem posições no Google, indexação imediata ou rich results.

## Arquivos criados e modificados

- .env.example
- docs/SEO-RESPONSIVIDADE.md
- next.config.mjs
- package.json
- src/app/dashboard/admin/AdminLayout.module.css
- src/app/dashboard/admin/admin.module.css
- src/app/dashboard/admin/agenda/agendaAdmin.module.css
- src/app/dashboard/admin/agenda/novo/agendar.module.css
- src/app/dashboard/admin/configuracoes/configuracoes.module.css
- src/app/dashboard/admin/financeiro/financeiro.module.css
- src/app/dashboard/admin/layout.js
- src/app/dashboard/admin/pacientes/[id]/perfil.module.css
- src/app/dashboard/admin/pacientes/novo/novo.module.css
- src/app/dashboard/admin/pacientes/pacientes.module.css
- src/app/dashboard/admin/planos/planos.module.css
- src/app/dashboard/paciente/PacienteLayout.module.css
- src/app/dashboard/paciente/agenda/agenda.module.css
- src/app/dashboard/paciente/anamnese/anamnese.module.css
- src/app/dashboard/paciente/layout.js
- src/app/dashboard/paciente/paciente.module.css
- src/app/dashboard/paciente/pagamentos/pagamentos.module.css
- src/app/dashboard/paciente/planos/planos.module.css
- src/app/dashboard/paciente/prontuario/prontuario.module.css
- src/app/favicon.ico
- src/app/globals.css
- src/app/layout.js
- src/app/login/layout.js
- src/app/not-found.js
- src/app/opengraph-image.js
- src/app/page.js
- src/app/privacidade/page.js
- src/app/robots.js
- src/app/sitemap.js
- src/components/dashboard/AnamneseReport.module.css
- src/components/dashboard/BottomNav.jsx
- src/components/dashboard/BottomNav.module.css
- src/components/dashboard/Header.jsx
- src/components/dashboard/Header.module.css
- src/components/dashboard/Sidebar.jsx
- src/components/dashboard/Sidebar.module.css
- src/components/landing/Contact.jsx
- src/components/landing/Hero.jsx
- src/components/landing/LandingSections.jsx
- src/components/landing/LandingSections.module.css
- src/components/landing/Navbar.jsx
- src/components/landing/Navbar.module.css
- src/components/landing/PublicAnalytics.jsx
- src/components/landing/PublicAnalytics.module.css
- src/components/ui/Modal.module.css
- src/hooks/useDrawerFocus.js
- src/lib/site.js
- tests/seo.test.mjs
