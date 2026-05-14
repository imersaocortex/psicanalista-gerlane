# 🚀 Guia de Deploy — psicanalistagerlane.com.br

> Deploy automático do projeto Next.js na **Vercel** com domínio registrado na **Hostinger**.  
> Toda alteração feita localmente será publicada automaticamente ao fazer `git push`.

---

## 📋 Índice

1. [Por que Vercel + Hostinger?](#1--por-que-vercel--hostinger)
2. [Criar conta no GitHub](#2--criar-conta-no-github)
3. [Criar o repositório e enviar o código](#3--criar-o-repositório-e-enviar-o-código)
4. [Criar conta na Vercel](#4--criar-conta-na-vercel)
5. [Importar o projeto na Vercel](#5--importar-o-projeto-na-vercel)
6. [Configurar variáveis de ambiente](#6--configurar-variáveis-de-ambiente)
7. [Conectar o domínio da Hostinger](#7--conectar-o-domínio-da-hostinger)
8. [Fluxo de deploy automático](#8--fluxo-de-deploy-automático)
9. [Atualizar o projeto (dia a dia)](#9--atualizar-o-projeto-dia-a-dia)
10. [Configurações pós-deploy](#10--configurações-pós-deploy)
11. [Solução de problemas](#11--solução-de-problemas)

---

## 1. 💡 Por que Vercel + Hostinger?

| Aspecto | Explicação |
|---------|------------|
| **Next.js + Vercel** | A Vercel é a criadora do Next.js. É a plataforma ideal para deploy com SSR, API Routes e Edge Functions |
| **Hostinger** | Continua sendo seu registrador de domínio. Apenas o DNS será apontado para a Vercel |
| **Custo** | Vercel é **gratuita** para projetos pessoais/profissionais (Hobby Plan) |
| **Deploy automático** | Cada `git push` dispara um novo deploy automaticamente |
| **SSL grátis** | Certificado HTTPS gerado automaticamente |

> [!IMPORTANT]
> A Hostinger **não suporta** aplicações Next.js com SSR em seus planos de hospedagem compartilhada. Projetos Next.js com API routes, autenticação server-side e SSR precisam de um ambiente Node.js dedicado. A Vercel oferece isso gratuitamente.

---

## 2. 🐙 Criar conta no GitHub

Se você já tem uma conta no GitHub, pule para a etapa 3.

1. Acesse: **[https://github.com](https://github.com)**
2. Clique em **"Sign up"**
3. Preencha e-mail, senha e nome de usuário
4. Confirme o e-mail
5. Escolha o plano **Free** (suficiente)

---

## 3. 📦 Criar o repositório e enviar o código

### 3.1 — Instalar o Git (se necessário)

Verifique se o Git está instalado:
```powershell
git --version
```

Se não estiver, baixe em: [https://git-scm.com/downloads](https://git-scm.com/downloads)

### 3.2 — Criar o repositório no GitHub

1. Acesse: [https://github.com/new](https://github.com/new)
2. Configure:
   - **Repository name:** `psicanalista-gerlane`
   - **Visibility:** `Private` (recomendado — código privado)
   - **NÃO** marque "Add a README file"
3. Clique em **"Create repository"**
4. Copie a URL do repositório (será algo como `https://github.com/SEU-USUARIO/psicanalista-gerlane.git`)

### 3.3 — Preparar o .gitignore na raiz

O projeto tem o `.gitignore` dentro da pasta `/app`. Precisamos de um na raiz também. Crie o arquivo `Projeto Site/.gitignore`:

```gitignore
# Node
node_modules/
.next/
out/
build/

# Env (NUNCA subir credenciais!)
.env
.env.local
.env.production.local

# OS
.DS_Store
Thumbs.db

# Vercel
.vercel

# Misc
*.pem
npm-debug.log*
```

### 3.4 — Inicializar e enviar o código

Abra o **PowerShell** na pasta do projeto (`Projeto Site`) e execute:

```powershell
# 1. Inicializar o repositório Git
git init

# 2. Configurar seu nome e e-mail (apenas na primeira vez)
git config user.name "Seu Nome"
git config user.email "seu-email@exemplo.com"

# 3. Adicionar todos os arquivos
git add .

# 4. Criar o primeiro commit
git commit -m "Deploy inicial - Sistema Clínico Psicanalista Gerlane"

# 5. Conectar ao repositório remoto
git remote add origin https://github.com/SEU-USUARIO/psicanalista-gerlane.git

# 6. Renomear a branch para 'main'
git branch -M main

# 7. Enviar o código
git push -u origin main
```

> [!NOTE]
> Na primeira vez, o Git pode pedir suas credenciais do GitHub. Se usar Windows, aceite o popup do "Git Credential Manager" para fazer login no navegador.

---

## 4. ☁️ Criar conta na Vercel

1. Acesse: **[https://vercel.com](https://vercel.com)**
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"** (recomendado — conecta direto)
4. Autorize o acesso ao GitHub
5. Escolha o plano **Hobby** (gratuito)

---

## 5. 🔗 Importar o projeto na Vercel

1. No dashboard da Vercel, clique em **"Add New... → Project"**
2. Na lista de repositórios, encontre **`psicanalista-gerlane`** e clique em **"Import"**
3. Configure o projeto:

| Campo | Valor |
|-------|-------|
| **Project Name** | `psicanalista-gerlane` |
| **Framework Preset** | `Next.js` (detectado automaticamente) |
| **Root Directory** | Clique em **"Edit"** e selecione: **`app`** |
| **Build Command** | `next build` (padrão) |
| **Output Directory** | `.next` (padrão) |

> [!WARNING]
> **O "Root Directory" é ESSENCIAL!** O projeto Next.js está dentro da pasta `/app`, não na raiz. Se não configurar isso, o build vai falhar.

4. **NÃO clique em "Deploy" ainda** — primeiro configure as variáveis de ambiente (próxima etapa)

---

## 6. 🔐 Configurar variáveis de ambiente

Na tela de importação (ou depois em **Settings → Environment Variables**), adicione:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bfjhxbuhxyppzrtvtrqz.supabase.co` | URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Chave anon do Supabase |
| `NEXT_PUBLIC_SITE_URL` | `https://psicanalistagerlane.com.br` | URL do site em produção |

### Como adicionar:

1. Em cada linha, preencha **Name** e **Value**
2. Mantenha o checkbox **Production**, **Preview** e **Development** marcados
3. Clique em **"Add"** para cada variável

> [!CAUTION]
> A variável `NEXT_PUBLIC_SITE_URL` é usada para os callbacks de pagamento do ASAAS. Se estiver incorreta, o paciente não será redirecionado após pagar.

Após adicionar todas, clique em **"Deploy"**.

---

## 7. 🌐 Conectar o domínio da Hostinger

### 7.1 — Adicionar o domínio na Vercel

1. No painel da Vercel, vá em **Settings → Domains**
2. Digite: `psicanalistagerlane.com.br`
3. Clique em **"Add"**
4. A Vercel vai sugerir a configuração DNS. Anote os registros que ela mostrar (geralmente):

| Tipo | Nome | Valor |
|------|------|-------|
| **A** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

> [!NOTE]
> Os IPs/valores exatos podem variar. **Use os valores que a Vercel mostrar na tela**, não os desta tabela.

### 7.2 — Configurar o DNS na Hostinger

1. Acesse o painel da **Hostinger**: [https://hpanel.hostinger.com.br](https://hpanel.hostinger.com.br)
2. Clique no domínio `psicanalistagerlane.com.br`
3. Vá em **DNS / Nameservers → Zona DNS** (ou "DNS Zone Editor")
4. **Apague** os registros A e CNAME existentes que apontem para a Hostinger (se houver)
5. **Adicione** os registros da Vercel:

#### Registro A (domínio principal):
```
Tipo:  A
Nome:  @
Valor: 76.76.21.21
TTL:   Automático
```

#### Registro CNAME (www):
```
Tipo:  CNAME
Nome:  www
Valor: cname.vercel-dns.com
TTL:   Automático
```

6. Salve as alterações

### 7.3 — Aguardar propagação DNS

- A propagação pode levar de **15 minutos até 48 horas**
- Use [https://dnschecker.org](https://dnschecker.org) para verificar se o DNS já propagou
- Quando propagar, a Vercel emitirá automaticamente o **certificado SSL (HTTPS)**

### 7.4 — Verificar na Vercel

1. Volte em **Settings → Domains** na Vercel
2. Os domínios devem mostrar ✅ **Valid Configuration**
3. Acesse `https://psicanalistagerlane.com.br` para confirmar

---

## 8. 🔄 Fluxo de deploy automático

Após a configuração, o fluxo funciona assim:

```
┌──────────────────────────────────────────────────────────┐
│               FLUXO DE DEPLOY AUTOMÁTICO                 │
└──────────────────────────────────────────────────────────┘

  1. Você faz alterações localmente (via Antigravity ou editor)
                         │
                         ▼
  2. Executa no terminal:
     git add .
     git commit -m "descrição da alteração"
     git push
                         │
                         ▼
  3. GitHub recebe o código atualizado
                         │
                         ▼
  4. Vercel detecta o push automaticamente
                         │
                         ▼
  5. Vercel faz o build (next build) e deploy
     ⏱ ~1-2 minutos
                         │
                         ▼
  6. Site atualizado em psicanalistagerlane.com.br ✅
```

---

## 9. 📝 Atualizar o projeto (dia a dia)

Após fazer qualquer alteração no código, basta executar estes 3 comandos no terminal:

```powershell
# 1. Adicionar as alterações
git add .

# 2. Registrar a alteração com uma descrição
git commit -m "Descrição do que foi alterado"

# 3. Enviar para o GitHub (dispara o deploy automático)
git push
```

### Exemplos de commits:

```powershell
git commit -m "Corrigido bug na página de pagamentos"
git commit -m "Novo layout da dashboard do paciente"
git commit -m "Atualizado valor do plano mensal"
```

> [!TIP]
> **Atalho rápido** — Depois de fazer alterações, execute tudo em uma linha:
> ```powershell
> git add . && git commit -m "Atualização do sistema" && git push
> ```

---

## 10. ⚙️ Configurações pós-deploy

### 10.1 — Atualizar o Webhook do ASAAS

No painel do ASAAS (produção), atualize a URL do webhook:

```
https://psicanalistagerlane.com.br/api/webhooks/asaas
```

### 10.2 — Atualizar URLs no Supabase

No painel do Supabase → **Authentication → URL Configuration**:

| Campo | Valor |
|-------|-------|
| **Site URL** | `https://psicanalistagerlane.com.br` |
| **Redirect URLs** | `https://psicanalistagerlane.com.br/**` |

### 10.3 — Verificar a NEXT_PUBLIC_SITE_URL

Certifique-se de que a variável `NEXT_PUBLIC_SITE_URL` na Vercel está como:
```
https://psicanalistagerlane.com.br
```

---

## 11. 🛠️ Solução de problemas

### ❌ Build falhou na Vercel
- **Causa comum:** O "Root Directory" não foi configurado como `app`
- **Solução:** Vá em Settings → General → Root Directory e defina como `app`
- Verifique os logs de build em **Deployments → clique no deploy → Build Logs**

### ❌ Erro 404 ao acessar o domínio
- **Causa:** DNS ainda não propagou
- **Solução:** Aguarde até 48h. Verifique em [https://dnschecker.org](https://dnschecker.org)

### ❌ "Invalid Environment Variables"
- **Causa:** Variáveis de ambiente não configuradas na Vercel
- **Solução:** Vá em Settings → Environment Variables e adicione todas as variáveis do `.env.local`

### ❌ "NEXT_PUBLIC_SITE_URL" retornando localhost
- **Causa:** A variável `NEXT_PUBLIC_SITE_URL` não foi definida ou está como `http://localhost:3000`
- **Solução:** Atualize para `https://psicanalistagerlane.com.br` em Settings → Environment Variables e faça um **Redeploy**

### ❌ ASAAS não funciona em produção
- **Causa:** Webhook do ASAAS ainda aponta para ngrok/localhost
- **Solução:** Atualize a URL do webhook no painel ASAAS para:
  `https://psicanalistagerlane.com.br/api/webhooks/asaas`

### ❌ Login/cadastro não funciona
- **Causa:** URLs de redirecionamento no Supabase não incluem o domínio de produção
- **Solução:** No Supabase → Authentication → URL Configuration, adicione `https://psicanalistagerlane.com.br/**` nos Redirect URLs

### ❌ Como forçar um novo deploy sem alterar código?
1. Acesse a Vercel → **Deployments**
2. Clique nos 3 pontinhos do último deploy → **"Redeploy"**

---

## 📊 Resumo dos serviços

| Serviço | Função | URL do Painel |
|---------|--------|---------------|
| **GitHub** | Repositório do código | [github.com](https://github.com) |
| **Vercel** | Hospedagem e deploy | [vercel.com](https://vercel.com) |
| **Hostinger** | Registro do domínio | [hpanel.hostinger.com.br](https://hpanel.hostinger.com.br) |
| **Supabase** | Banco de dados e autenticação | [supabase.com](https://supabase.com) |
| **ASAAS** | Gateway de pagamentos | [asaas.com](https://asaas.com) |

---

## 🔐 Checklist final antes de ir ao ar

- [ ] Código enviado para o GitHub
- [ ] Projeto importado na Vercel com Root Directory = `app`
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Domínio adicionado na Vercel
- [ ] DNS configurado na Hostinger (registros A e CNAME)
- [ ] SSL ativo (HTTPS funcionando)
- [ ] Site URL atualizada no Supabase
- [ ] Redirect URLs configuradas no Supabase
- [ ] Webhook do ASAAS apontando para o domínio de produção
- [ ] ASAAS em modo **Produção** (quando pronto)
- [ ] Testado login, agendamento e pagamento em produção

---

> **Última atualização:** Maio/2026  
> **Stack:** Next.js 16.2.4 + Supabase + Vercel + Hostinger (DNS)
