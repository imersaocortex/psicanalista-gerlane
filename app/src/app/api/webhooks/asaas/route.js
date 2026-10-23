import { NextResponse } from 'next/server';
import { asaasClient, reconcileCharge } from '@/lib/server/asaas';
import { apiError, HttpError, serviceClient, verifySecret, isUuid } from '@/lib/server/security';
export async function POST(request) {
  try {
    verifySecret(request.headers.get('asaas-access-token'), process.env.ASAAS_WEBHOOK_TOKEN);
    const body = await request.json();
    if (!body || typeof body.event !== 'string' || typeof body.id !== 'string') throw new HttpError(400, 'Evento inválido.');
    if (!body.event.startsWith('PAYMENT_')) return NextResponse.json({ ignored: true });
    const payment = body.payment;
    if (!payment || !isUuid(payment.externalReference) || typeof payment.id !== 'string') throw new HttpError(400, 'Pagamento inválido.');
    const db = serviceClient();
    const asaas = await asaasClient(db);
    // Reconcile current provider state, including refunds, instead of replaying stale events.
    await reconcileCharge(db, asaas, payment.id);
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
