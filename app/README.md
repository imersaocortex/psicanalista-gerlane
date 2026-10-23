# Clínica Dra. Gerlane Albuquerque / Acolher

A landing page pública mantém a identidade da Dra. Gerlane Albuquerque. O aplicativo se chama **Acolher**, com o slogan **Seu bem-estar em um só lugar**.

## Desenvolvimento

Requer Node.js compatível com Next.js 16 e npm.

1. Instale as dependências com `npm ci`.
2. Copie `.env.example` para `.env.local` e configure as variáveis.
3. Execute `npm run dev`.
4. Abra `http://localhost:3000`. O aplicativo começa em `/login`; o cadastro está em `/cadastro`.

## Estrutura

- `src/app/page.js`: landing page.
- `src/app/login`, `cadastro`, `recuperar-senha`, `redefinir-senha`: acesso ao Acolher.
- `src/app/dashboard/admin` e `paciente`: painéis.
- `src/app/api`: cadastro, documentos privados, cobrança, webhook e notificações.
- `src/lib/server/security.js`: autorização e validação centralizadas.
- `schema.sql`: baseline e migração de segurança, também versionada em `supabase/migrations`.
- `public/manifest.json` e `sw.js`: PWA. Dados clínicos e autenticação não são armazenados no cache offline.

## Banco de dados e acesso

**O deploy do código não aplica SQL automaticamente.** Antes de liberar o aplicativo, revise e aplique `supabase/migrations/202610230001_acolher_security.sql` em uma cópia de homologação do banco existente, depois em produção. Faça backup antes da migração. O esquema anterior não foi fornecido; diferenças de tipos, campos e triggers precisam ser conferidas no banco real. A transação preserva registros e não converte tipos de colunas existentes.

A migração cria políticas RLS restritivas para isolar os pacientes, protege campos administrativos, valida agendamentos no banco e registra eventos de pagamento de forma transacional. Novos usuários são sempre pacientes; a função de cadastro ignora qualquer papel administrativo enviado pelo cliente. Revise triggers anteriores de `auth.users`: a migração substitui os vinculados a `handle_new_user` e `acolher_handle_new_user`, mas outras funções de provisionamento precisam ser analisadas. Os administradores existentes não são promovidos ou rebaixados pela migração.

No Supabase Auth, habilite cadastro por e-mail, configure confirmação e SMTP, o Site URL correto e as Redirect URLs de produção e desenvolvimento:
- `https://SEU-DOMINIO/auth/callback`
- `https://SEU-DOMINIO/auth/callback?next=/redefinir-senha`
- equivalentes em `http://localhost:3000` para testes locais.

O callback aceita PKCE (`code`) e tokens de confirmação (`token_hash`). Não armazene senhas nem contas de teste no repositório.

## Integrações

Configure no Vercel as variáveis server-only `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` e `ASAAS_WEBHOOK_TOKEN`. Sem elas, as respectivas rotinas retornam erro de configuração e não usam a chave pública como substituta.

No painel administrativo, configure a chave e o ambiente do Asaas (sandbox ou production) e a Evolution API com HTTPS. Pacientes não podem ler as configurações de integração com as políticas da migração. O webhook Asaas deve chamar `/api/webhooks/asaas`, enviando o token configurado em `asaas-access-token`.

Cobranças são criadas uma única vez por registro. Uma resposta externa incerta mantém o bloqueio em `payment_checkout_locks`; nesses casos, confira o Asaas antes de liberar uma nova tentativa. Não remova o bloqueio sem reconciliar as cobranças existentes. Renovações geram registros financeiros separados. Cobranças antigas sem `plano_id` precisam de conciliação administrativa para ativação automática do plano.

O cron de lembretes envia apenas sessões confirmadas, usa America/Sao_Paulo e mantém um registro persistente por sessão/dia. Falhas são marcadas em `automation_deliveries`, sem reenvio automático que possa duplicar mensagens. A limitação em memória das APIs é por instância; para proteção distribuída em produção, configure também limites no provedor/WAF.

## Documentos

Novos anexos de anamnese utilizam o bucket privado `clinica_documentos` e links assinados de 60 segundos, após validação do acesso. PDFs/JPG/PNG até 10 MB são aceitos.

**Anexos antigos em `clinica_media/anamneses` não são migrados automaticamente.** Mova-os para o bucket privado, atualize o campo `arquivos` com `bucket`, `path` e `id`, verifique o acesso e só então retire as cópias públicas. O app bloqueia links legados até a migração. As fotos de perfil permanecem no bucket de avatares existente.

## Verificações

- `npm run lint`
- `npm run build`
- Com o servidor local ativo: `npm run test:security`
- `node test_db.js`: conectividade, sem modificar o banco.

Os testes de segurança verificam bloqueios anônimos, validação de cadastro, identidade das páginas e arquivos PWA sem criar contas, cobranças ou enviar mensagens. Confirmação de e-mail, permissões do banco e cobranças precisam de homologação após aplicar a migração e configurar as integrações.

## Publicação

O repositório está associado ao Vercel. Enviar a branch configurada dispara o processo de deploy quando a integração está ativa. O SQL, as variáveis de ambiente, os redirects do Auth e a migração de anexos são etapas separadas e obrigatórias.

## Referências técnicas

- [Supabase: dados de usuários e triggers](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Asaas: autenticação e entrega de webhooks](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook)
- Next.js: guias da versão instalada em node_modules/next/dist/docs.
