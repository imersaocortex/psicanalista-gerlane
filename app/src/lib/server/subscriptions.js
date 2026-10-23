import 'server-only';
import { HttpError } from './security';

export async function assertNoActiveSubscription(db, patientId, base, key) {
  const { data, error } = await db.from('pagamentos').select('gateway_id').eq('paciente_id', patientId).like('gateway_id', 'sub_%');
  if (error) throw error;
  for (const id of new Set((data || []).map(item => item.gateway_id))) {
    const response = await fetch(base + '/subscriptions/' + encodeURIComponent(id), {
      headers: { access_token: String(key).trim() }, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new HttpError(503, 'Não foi possível verificar sua assinatura atual. Fale com a clínica.');
    const subscription = await response.json();
    if (subscription.status === 'ACTIVE') throw new HttpError(409, 'Você já possui uma assinatura recorrente ativa. Fale com a clínica para alterar o plano sem gerar cobranças duplicadas.');
  }
}
