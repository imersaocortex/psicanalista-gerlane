import 'server-only';
import { serviceClient, systemConfig } from '@/lib/server/security';
export function normalizePhone(value) {
  let phone = String(value || '').replace(/\D/g, '');
  if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
  return /^55\d{10,11}$/.test(phone) ? phone : null;
}
export async function sendWhatsAppMessage(userId, message, { db } = {}) {
  try {
    const supabase = db || serviceClient();
    const config = await systemConfig(supabase, ['evolution_api_url', 'evolution_api_instance', 'evolution_api_apikey']);
    const base = String(config.evolution_api_url || '').trim();
    const instance = String(config.evolution_api_instance || '').trim();
    const key = String(config.evolution_api_apikey || '').trim();
    if (!base || !instance || !key) return { success: false, error: 'Integração não configurada.' };
    const url = new URL(base);
    if (url.protocol !== 'https:' || url.username || url.password || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname)) return { success: false, error: 'URL da integração inválida.' };
    const { data: patient, error } = await supabase.from('pacientes').select('telefone').eq('user_id', userId).single();
    const phone = normalizePhone(patient?.telefone);
    if (error || !phone) return { success: false, error: 'Telefone indisponível.' };
    const response = await fetch(url.toString().replace(/\/+$/, '') + '/message/sendText/' + encodeURIComponent(instance), {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({ number: phone, text: message }), signal: AbortSignal.timeout(15000), redirect: 'error',
    });
    if (!response.ok) return { success: false, error: 'Falha no serviço de mensagens.' };
    return { success: true };
  } catch { return { success: false, error: 'Serviço de mensagens indisponível.' }; }
}
