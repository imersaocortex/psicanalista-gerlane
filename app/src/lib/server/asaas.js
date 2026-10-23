import 'server-only';
import { HttpError, systemConfig } from './security';
import { checkoutUrl, providerEvent } from '../billing.mjs';

export async function asaasClient(db) {
  const config = await systemConfig(db, ['asaas_api_key', 'asaas_environment']);
  const key = String(config.asaas_api_key || '').trim();
  const environment = config.asaas_environment;
  if (!key || !['sandbox', 'production'].includes(environment)) throw new HttpError(503, 'Configure o ambiente e a chave do Asaas.');
  const base = environment === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
  async function request(path, body, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', access_token: key, 'User-Agent': 'Acolher/1.0' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000), cache: 'no-store' });
    const data = await response.json();
    if ([401,403].includes(response.status)) throw new HttpError(503, 'O Asaas recusou o acesso. A clínica precisa conferir a chave de API e o ambiente configurados.');
    if (!response.ok || data.errors) throw new HttpError(502, 'O Asaas não concluiu a solicitação. Consulte a clínica antes de repetir a cobrança.');
    return data;
  }
  return { request, base, key, environment, safeUrl: value => checkoutUrl(value, environment) };
}

export async function reconcileCharge(db, asaas, chargeId) {
  const charge = await asaas.request('/payments/' + encodeURIComponent(chargeId));
  const event = providerEvent(charge);
  // Read the provider's CURRENT state, never trust redirect parameters or an old webhook.
  const { error } = await db.rpc('process_asaas_event', { event_id: `sync:${crypto.randomUUID()}`, event_type: event, payment_data: charge });
  if (error) throw error;
  return { charge, event };
}
