import { NextResponse } from 'next/server';
import { asaasClient, reconcileCharge } from '@/lib/server/asaas';
import { apiError, HttpError, isUuid, rateLimit, readBody, requireUser, serviceClient } from '@/lib/server/security';

export async function POST(request) {
  try {
    const { user, profile } = await requireUser();
    const { paymentId } = await readBody(request);
    if (!isUuid(paymentId)) throw new HttpError(400, 'Cobrança inválida.');
    rateLimit('payment-status:' + user.id, 15, 60000);
    const db = serviceClient();
    const { data: payment, error } = await db.from('pagamentos').select('id,status,gateway_id,gateway_payment_id,pacientes(user_id)').eq('id', paymentId).single();
    if (error || !payment || (profile.tipo !== 'admin' && payment.pacientes?.user_id !== user.id)) throw new HttpError(404, 'Cobrança não encontrada.');
    if (payment.gateway_id) {
      const asaas = await asaasClient(db);
      let chargeId = payment.gateway_payment_id;
      if (!chargeId && !payment.gateway_id.startsWith('sub_')) chargeId = payment.gateway_id;
      if (!chargeId) {
        const charges = await asaas.request('/payments?subscription=' + encodeURIComponent(payment.gateway_id) + '&limit=100');
        const matches = charges.data?.filter(p => p.externalReference === payment.id).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
        chargeId = matches?.[0]?.id;
      }
      if (!chargeId) throw new HttpError(409, 'Aguarde a geração da fatura.');
      await reconcileCharge(db, asaas, chargeId);
    }
    const { data: refreshed, error: readError } = await db.from('pagamentos').select('status').eq('id', paymentId).single();
    if (readError) throw readError;
    return NextResponse.json({ status: refreshed.status });
  } catch (error) { return apiError(error); }
}
