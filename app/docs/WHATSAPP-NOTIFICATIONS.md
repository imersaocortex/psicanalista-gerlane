# Aviso único de anamnese

A anamnese mantém `notification_revision` no banco, alterada apenas quando os campos clínicos ou os anexos mudam. A rota administrativa deriva o paciente e a revisão do registro salvo. Uma chave única em `whatsapp_deliveries` garante uma tentativa de envio por revisão, inclusive entre instâncias concorrentes. O gatilho existente é o único responsável pelo aviso interno; a rota não duplica esse aviso.

O webhook da Evolution passa por `/api/webhooks/whatsapp`, autenticado pelo cabeçalho `x-acolher-webhook-token` com a credencial da integração já existente. Apenas mensagens recebidas (`fromMe: false`) da instância configurada são encaminhadas para a automação original. Mensagens próprias, status, grupos, lotes e eventos sem direção explícita são descartados. O ID da mensagem impede reprocessamento do mesmo evento. Não há texto clínico, telefone ou credenciais na tabela de controle.

A assinatura dos avisos é determinística: Dra. Gerlane Albuquerque, WhatsApp (84) 99812-7788, https://psicanalistagerlane.com.br. O aviso não inclui conteúdo da ficha clínica. Variáveis legadas conhecidas são substituídas por esses dados reais.

## Implantação

1. Aplicar `supabase/fixes/whatsapp_single_delivery.sql` no projeto da clínica.
2. Publicar o aplicativo com a chave de serviço Supabase já utilizada pelas integrações de servidor.
3. Validar que o webhook público rejeita chamadas sem credencial e ignora eventos sintéticos próprios.
4. Alterar a URL do webhook da instância `psicanalistagerlane` para `https://psicanalistagerlane.com.br/api/webhooks/whatsapp`, mantendo `MESSAGES_UPSERT` e incluindo o cabeçalho autenticado. O destino anterior, preservado pelo encaminhamento, é `https://webhook.innave.space/webhook/psicanalista-gerlane`.

## Verificação

- `node --test tests/whatsapp-workflow.test.mjs`: assinatura, eventos próprios, recebidos, IDs e concorrência (20 chamadas, 1 envio), falha sem reenvio.
- `tests/whatsapp-database.sql`: revisão inicial, salvamento sem mudança, alterações clínicas/anexos, chave única e acesso exclusivo do servidor, tudo em transação com rollback.
- Build Next.js e lint dos arquivos alterados.
- Não enviar WhatsApp real nem editar ficha de paciente para testar sem autorização específica para essas ações.

## Limites operacionais

Uma falha ou timeout após o envio não libera nova tentativa automática: o provedor pode ter aceitado a mensagem. O estado fica registrado para investigação, evitando duplicidade. Isso prioriza não repetir mensagens; não representa garantia de entrega. A interface avisa quando não confirma o envio.

A automação externa continua responsável pelas respostas às mensagens recebidas. O filtro impede respostas automáticas aos avisos enviados pela clínica, mas não edita prompts internos dessa automação. Eventos com mídia em base64 estão sujeitos ao limite de requisição da Vercel; isso não afeta anexos de anamnese enviados diretamente ao Storage.

A informação do advisor “RLS Enabled No Policy” para `whatsapp_deliveries` é intencional: não existem permissões para `anon`/`authenticated`; somente o servidor acessa o controle de entrega. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
