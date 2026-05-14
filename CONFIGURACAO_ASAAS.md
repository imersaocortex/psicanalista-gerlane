# 💳 Guia de Configuração — Módulo de Pagamentos ASAAS

> Guia completo para integrar o gateway de pagamentos **ASAAS** ao sistema clínico de Psicanálise.  
> Suporta: **Pix, Boleto e Cartão de Crédito**.

---

## 📋 Índice

1. [Pré-requisitos](#1--pré-requisitos)
2. [Criar conta no ASAAS](#2--criar-conta-no-asaas)
3. [Obter a API Key](#3--obter-a-api-key)
4. [Configurar o Banco de Dados (Supabase)](#4--configurar-o-banco-de-dados-supabase)
5. [Configurar no Painel Administrativo](#5--configurar-no-painel-administrativo)
6. [Cadastrar Planos](#6--cadastrar-planos)
7. [Configurar Webhooks](#7--configurar-webhooks-notificações-automáticas)
8. [Configurar Variáveis de Ambiente (Produção)](#8--configurar-variáveis-de-ambiente-produção)
9. [Testar em Sandbox](#9--testar-em-sandbox)
10. [Passar para Produção](#10--passar-para-produção)
11. [Fluxo Completo do Pagamento](#11--fluxo-completo-do-pagamento)
12. [Solução de Problemas](#12--solução-de-problemas)

---

## 1. 📌 Pré-requisitos

Antes de iniciar, certifique-se de que você possui:

- ✅ **Projeto Next.js** rodando (local ou em produção)
- ✅ **Supabase** configurado e conectado (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`)
- ✅ **CNPJ ou CPF** para ativar conta no ASAAS
- ✅ As tabelas do banco de dados criadas (ver seção 4)

---

## 2. 🏦 Criar conta no ASAAS

### Ambiente de Testes (Sandbox)

1. Acesse: **[https://sandbox.asaas.com](https://sandbox.asaas.com)**
2. Clique em **"Criar conta grátis"**
3. Preencha os dados com um **CPF/CNPJ de teste** (o sandbox aceita dados fictícios)
4. Confirme o e-mail de ativação
5. Faça login no painel sandbox

### Ambiente de Produção

1. Acesse: **[https://www.asaas.com](https://www.asaas.com)**
2. Clique em **"Criar conta grátis"**
3. Preencha com os dados **reais** do profissional (CPF/CNPJ)
4. Complete a **verificação de identidade** (pode levar até 48h)
5. Ative a conta após aprovação

> [!IMPORTANT]
> Sempre comece pelo **Sandbox** para testar todo o fluxo antes de ativar em produção.

---

## 3. 🔑 Obter a API Key

1. Acesse o painel do ASAAS (sandbox ou produção)
2. Vá em: **Configurações → Integrações → API**
   - Ou acesse diretamente: `https://sandbox.asaas.com/customerApiSettings` (sandbox)
3. Clique em **"Gerar nova API Key"**
4. **Copie a chave gerada** — ela começa com `$aact_` (produção) ou similar

> [!CAUTION]
> **Nunca compartilhe ou exponha sua API Key publicamente!**  
> Ela dá acesso total à sua conta ASAAS. Trate-a como uma senha.

**Formato da chave:**
```
$aact_YTU5ZjNlZmY2NjNhZDI1ZWYzNDhiZGIwNWQ5ZWViM2Q6OjAwMDAwMDAwMDAwMDAwMDAzOTk6OiRhYWNoXzEyM2...
```

---

## 4. 🗄️ Configurar o Banco de Dados (Supabase)

O sistema utiliza as seguintes tabelas. Execute os comandos SQL no **Supabase SQL Editor** se elas ainda não existirem:

### 4.1 — Tabela `configuracoes_sistema`

Armazena as configurações do ASAAS (API Key, ambiente, etc):

```sql
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(admin_id, chave)
);

-- Habilitar RLS
ALTER TABLE configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Política: Admin lê/escreve somente as próprias configs
CREATE POLICY "admin_manage_own_config" ON configuracoes_sistema
  FOR ALL USING (auth.uid() = admin_id);
```

### 4.2 — Tabela `pagamentos`

Armazena as faturas e cobranças:

```sql
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID REFERENCES pacientes(id),
  valor DECIMAL(10,2) NOT NULL,
  tipo_plano TEXT NOT NULL CHECK (tipo_plano IN ('avulso', 'mensal', 'trimestral', 'semestral', 'anual')),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'pago', 'vencido', 'cancelado')),
  data TIMESTAMPTZ DEFAULT now(),
  gateway_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

-- Política: Admin vê todos os pagamentos
CREATE POLICY "admin_view_all_payments" ON pagamentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Política: Paciente vê somente os próprios pagamentos
CREATE POLICY "patient_view_own_payments" ON pagamentos
  FOR SELECT USING (
    paciente_id IN (SELECT id FROM pacientes WHERE user_id = auth.uid())
  );
```

### 4.3 — Coluna `asaas_customer_id` na tabela `pacientes`

O sistema salva o ID do cliente no ASAAS para reutilizar em futuras cobranças:

```sql
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
```

### 4.4 — Tabela `planos`

```sql
CREATE TABLE IF NOT EXISTS planos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  periodicidade TEXT DEFAULT 'mensal' CHECK (periodicidade IN ('avulso', 'mensal', 'trimestral', 'semestral', 'anual')),
  ativo BOOLEAN DEFAULT true,
  asaas_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

> [!NOTE]
> O campo `tipo_plano` na tabela `pagamentos` possui uma constraint (`pagamentos_tipo_plano_check`) que aceita **apenas**: `'avulso'`, `'mensal'`, `'trimestral'`, `'semestral'`, `'anual'`. Ao gerar faturas, o sistema usa o campo `periodicidade` do plano, não o `nome`.

---

## 5. ⚙️ Configurar no Painel Administrativo

1. Faça login como **administrador** no sistema
2. Navegue até: **Dashboard Admin → Financeiro → Configurações**
   - URL: `/dashboard/admin/financeiro/configuracoes`
3. Preencha os campos:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Valor da Sessão Individual** | Preço base de uma sessão avulsa | `150.00` |
| **Chave Pix** | Sua chave Pix para pagamentos manuais | `email@exemplo.com` |
| **ASAAS API Key** | A chave de API obtida na etapa 3 | `$aact_YTU5ZjN...` |
| **Ambiente** | `Homologação (Testes)` ou `Produção` | Selecione no dropdown |

4. Clique em **"Salvar Configurações"**

> [!WARNING]
> Mantenha o ambiente como **"Homologação (Testes)"** até completar todos os testes da seção 9.

---

## 6. 📦 Cadastrar Planos

1. No painel admin, vá em: **Dashboard Admin → Planos**
   - URL: `/dashboard/admin/planos`
2. Clique em **"Novo Plano"**
3. Preencha:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Nome do Plano** | Nome exibido ao paciente | `Plano Individual Mensal` |
| **Descrição** | O que o plano inclui | `4 sessões semanais por mês` |
| **Preço (R$)** | Valor da cobrança | `600.00` |
| **Periodicidade** | Frequência da cobrança | `mensal` |
| **Asaas ID** | *(Opcional)* ID do produto no ASAAS | `prod_...` |

4. Clique em **"Criar Plano"**

> [!TIP]
> Crie pelo menos um plano com cada periodicidade que pretende oferecer: `mensal`, `trimestral`, `semestral`, `avulso`.

---

## 7. 🔔 Configurar Webhooks (Notificações Automáticas)

Os webhooks permitem que o ASAAS **notifique automaticamente** o sistema quando um pagamento é confirmado, vencido, etc.

### 7.1 — No Painel do ASAAS

1. Acesse: **Configurações → Integrações → Webhooks**
2. Clique em **"Adicionar Webhook"**
3. Configure:

| Campo | Valor |
|-------|-------|
| **URL** | `https://SEU-DOMINIO.com/api/webhooks/asaas` |
| **Tipo** | `Pagamentos` |
| **Versão da API** | `v3` |
| **Status** | `Ativo` |

4. **Selecione os eventos** que deseja receber:
   - ✅ `PAYMENT_RECEIVED` — Pagamento recebido
   - ✅ `PAYMENT_CONFIRMED` — Pagamento confirmado
   - ✅ `PAYMENT_OVERDUE` — Pagamento vencido
   - *(Opcional)* `PAYMENT_DELETED`, `PAYMENT_REFUNDED`

5. Salve a configuração

### 7.2 — O que o Webhook faz no sistema

Quando o ASAAS envia uma notificação, o endpoint `/api/webhooks/asaas` executa:

| Evento | Ação no Sistema |
|--------|-----------------|
| `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` | Marca o pagamento como **"pago"**, atualiza o plano do paciente e envia uma **notificação** |
| `PAYMENT_OVERDUE` | Marca o pagamento como **"vencido"** |

> [!IMPORTANT]
> **Para testes locais**, o ASAAS não consegue acessar `localhost`.  
> Use um túnel como **[ngrok](https://ngrok.com)** para expor sua porta local:
> ```bash
> ngrok http 3000
> ```
> Depois use a URL gerada (ex: `https://abc123.ngrok.io/api/webhooks/asaas`) como URL do webhook no ASAAS.

---

## 8. 🌐 Configurar Variáveis de Ambiente (Produção)

No arquivo `.env.local` ou nas variáveis de ambiente da hospedagem (Vercel, etc):

```env
# Supabase (já configurado)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...

# URL do Site (para callback do pagamento)
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
```

> [!NOTE]
> A `NEXT_PUBLIC_SITE_URL` é usada pelo sistema para montar a URL de retorno após o paciente finalizar o pagamento no checkout do ASAAS. Em desenvolvimento, o valor padrão é `http://localhost:3000`.

---

## 9. 🧪 Testar em Sandbox

### Passo a passo para teste completo:

1. **Certifique-se** de que o ambiente está como **"Homologação"** nas configurações do sistema

2. **Cadastre um paciente** de teste com dados válidos:
   - Nome, e-mail e CPF (pode ser fictício no sandbox)

3. **Crie uma fatura** para o paciente:
   - Vá em **Pacientes → Selecione o paciente → Gerar Fatura Inicial**
   - Ou vá em **Financeiro → Nova Fatura**

4. **Simule o pagamento pelo paciente**:
   - Faça login como o paciente de teste
   - Vá em **Pagamentos** e clique em **"Pagar"**
   - O sistema abrirá o **checkout do ASAAS** em nova aba
   - No sandbox, use os dados de teste do ASAAS para simular o pagamento

5. **Verifique o webhook**:
   - O status do pagamento deve mudar automaticamente para **"pago"**
   - Uma notificação deve aparecer para o paciente

### Cartões de teste ASAAS (Sandbox):

| Cartão | Número | Resultado |
|--------|--------|-----------|
| Aprovado | `5162 3063 4797 0458` | Pagamento confirmado |
| Recusado | `5184 0800 0498 4205` | Pagamento recusado |

> **CVV:** qualquer 3 dígitos | **Validade:** qualquer data futura

---

## 10. 🚀 Passar para Produção

Quando todos os testes estiverem OK:

1. **Crie a conta de produção** no ASAAS (se ainda não criou): [https://www.asaas.com](https://www.asaas.com)
2. **Gere a API Key de produção**
3. No painel admin do sistema:
   - Substitua a API Key pela **chave de produção**
   - Mude o Ambiente para **"Produção"**
   - Salve as configurações
4. No painel ASAAS **de produção**:
   - Configure o **webhook** com a URL do seu domínio real
5. Atualize a variável `NEXT_PUBLIC_SITE_URL` para a URL de produção
6. Faça um **pagamento real de teste** com valor baixo (R$ 1,00) para confirmar

> [!CAUTION]
> Em produção, todas as cobranças são **reais**. Certifique-se de que os valores dos planos estão corretos antes de ativar.

---

## 11. 🔄 Fluxo Completo do Pagamento

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUXO DE PAGAMENTO                         │
└─────────────────────────────────────────────────────────────────┘

1. ADMIN gera fatura para o paciente
   └──→ Registro criado na tabela `pagamentos` (status: pendente)

2. PACIENTE acessa "Pagamentos" e clica em "Pagar"
   └──→ Sistema chama API interna: POST /api/payments/asaas

3. API interna:
   ├── Busca dados do pagamento e paciente no Supabase
   ├── Busca API Key do ASAAS nas configurações do admin
   ├── Cria/busca o cliente no ASAAS (asaas_customer_id)
   ├── Gera a cobrança no ASAAS (Pix/Boleto/Cartão)
   └── Retorna o link de pagamento (invoiceUrl)

4. PACIENTE é redirecionado para o checkout do ASAAS
   └──→ Realiza o pagamento (Pix, Boleto ou Cartão)

5. ASAAS confirma o pagamento
   └──→ Envia webhook POST para /api/webhooks/asaas

6. WEBHOOK processa a notificação:
   ├── Atualiza status do pagamento para "pago"
   ├── Atualiza o plano do paciente (se aplicável)
   └── Cria notificação para o paciente: "Pagamento confirmado! 🎉"
```

---

## 12. 🛠️ Solução de Problemas

### ❌ "Configuração do Asaas ausente"
- **Causa:** A API Key não foi salva nas configurações do sistema
- **Solução:** Vá em `Dashboard Admin → Financeiro → Configurações` e preencha a API Key

### ❌ "Erro ao criar cliente no Asaas"
- **Causa:** CPF inválido ou dados incompletos do paciente
- **Solução:** Certifique-se de que o paciente possui **CPF válido** cadastrado no sistema

### ❌ "violates check constraint pagamentos_tipo_plano_check"
- **Causa:** O valor de `tipo_plano` não é um dos permitidos
- **Solução:** Os valores aceitos são: `avulso`, `mensal`, `trimestral`, `semestral`, `anual`

### ❌ Webhook não funciona em localhost
- **Causa:** O ASAAS não consegue acessar `http://localhost`
- **Solução:** Use [ngrok](https://ngrok.com) para criar um túnel:
  ```bash
  ngrok http 3000
  ```

### ❌ Pagamento fica como "processando" mas nunca muda para "pago"
- **Causa:** Webhook não configurado ou URL incorreta
- **Solução:** Verifique a URL do webhook no painel ASAAS e confirme que os eventos estão selecionados

### ❌ "Erro ao gerar cobrança"
- **Causa:** Dados inválidos enviados ao ASAAS (valor zerado, cliente sem CPF, etc)
- **Solução:** Verifique os logs do console do servidor para ver os detalhes do erro

---

## 📁 Arquivos do Sistema Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `src/app/api/payments/asaas/route.js` | API que gera cobranças no ASAAS |
| `src/app/api/webhooks/asaas/route.js` | Webhook que recebe confirmações do ASAAS |
| `src/app/dashboard/admin/financeiro/configuracoes/page.js` | Tela de configuração de pagamentos |
| `src/app/dashboard/admin/planos/page.js` | Gestão de planos de assinatura |
| `src/app/dashboard/admin/financeiro/novo/page.js` | Criação de faturas manuais |
| `src/app/dashboard/paciente/pagamentos/page.js` | Tela de pagamentos do paciente |
| `src/app/dashboard/paciente/planos/page.js` | Troca de planos pelo paciente |

---

> **Última atualização:** Maio/2026  
> **Versão do Sistema:** Next.js 16.2.4 + Supabase + ASAAS API v3
