import { NextResponse } from 'next/server';
import { asaasClient } from '@/lib/server/asaas';
import { apiError, HttpError, rateLimit, readBody, requireUser, serviceClient, systemConfig } from '@/lib/server/security';

const events = ['PAYMENT_CREATED','PAYMENT_UPDATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED','PAYMENT_OVERDUE','PAYMENT_DELETED','PAYMENT_RESTORED','PAYMENT_REFUNDED','PAYMENT_PARTIALLY_REFUNDED','PAYMENT_REFUND_IN_PROGRESS','PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE','PAYMENT_AWAITING_CHARGEBACK_REVERSAL'];
function webhookUrl() {
  let url;
  try { url = new URL(process.env.NEXT_PUBLIC_SITE_URL); } catch { throw new HttpError(503, 'Configure o endereço público do aplicativo na Vercel.'); }
  if (url.protocol !== 'https:') throw new HttpError(503, 'O webhook precisa de um endereço público HTTPS.');
  return url.origin + '/api/webhooks/asaas';
}

export async function GET() {
  try {
    const { user } = await requireUser(true);
    rateLimit('payment-config:' + user.id, 5, 60000);
    const db = serviceClient();
    const asaas = await asaasClient(db);
    const config = await systemConfig(db, ['pix_key']);
    await asaas.request('/payments?limit=1');
    const keys = await asaas.request('/pix/addressKeys?limit=100');
    const webhooks = await asaas.request('/webhooks?limit=100');
    const matchingPix = keys.data?.some(item => item.key === config.pix_key && (!item.status || item.status === 'ACTIVE')) || false;
    const expectedUrl = webhookUrl();
    const configuredWebhook = webhooks.data?.find(item => item.url === expectedUrl && item.enabled && !item.interrupted);
    return NextResponse.json({ environment: asaas.environment, pixConfigured: !!config.pix_key, matchingPix, webhookSecretConfigured: !!process.env.ASAAS_WEBHOOK_TOKEN, webhookConfigured: !!configuredWebhook, webhookUrl: expectedUrl });
  } catch (error) { return apiError(error); }
}

export async function POST(request) {
  try {
    const { user } = await requireUser(true);
    const body = await readBody(request);
    if (body.action !== 'configureWebhook') throw new HttpError(400, 'Ação inválida.');
    rateLimit('configure-webhook:' + user.id, 3, 60000);
    if (!process.env.ASAAS_WEBHOOK_TOKEN) throw new HttpError(503, 'Configure ASAAS_WEBHOOK_TOKEN na Vercel antes de configurar o webhook.');
    const asaas = await asaasClient(serviceClient());
    const url = webhookUrl();
    const hooks = await asaas.request('/webhooks?limit=100');
    const existing = hooks.data?.find(h => h.url === url);
    const settings = { name: existing?.name || 'Acolher - pagamentos', url, email: user.email, enabled: true, interrupted: false, authToken: process.env.ASAAS_WEBHOOK_TOKEN, sendType: 'SEQUENTIALLY', events: [...new Set([...(existing?.events || []),...events])] };
    await asaas.request(existing ? '/webhooks/' + encodeURIComponent(existing.id) : '/webhooks', settings, existing ? 'PUT' : 'POST');
    return NextResponse.json({ success: true, webhookUrl: url });
  } catch (error) { return apiError(error); }
}
