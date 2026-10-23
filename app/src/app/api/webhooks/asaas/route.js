import { NextResponse } from 'next/server';
import { apiError, HttpError, serviceClient, verifySecret, isUuid } from '@/lib/server/security';
export async function POST(request) {
  try {
    verifySecret(request.headers.get('asaas-access-token'), process.env.ASAAS_WEBHOOK_TOKEN);
    const body = await request.json();
    if (!body || typeof body.event !== 'string' || typeof body.id !== 'string') throw new HttpError(400, 'Evento inválido.');
    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE'].includes(body.event)) return NextResponse.json({ ignored: true });
    const payment = body.payment;
    if (!payment || !isUuid(payment.externalReference) || typeof payment.id !== 'string') throw new HttpError(400, 'Pagamento inválido.');
    const db = serviceClient();
    // This transaction validates gateway IDs and amounts and records each event once.
    const { error } = await db.rpc('process_asaas_event', { event_id: body.id, event_type: body.event, payment_data: payment });
    if (error) { if (error.code === '22023') throw new HttpError(400, 'Os dados do pagamento não correspondem à cobrança.'); throw error; }
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
