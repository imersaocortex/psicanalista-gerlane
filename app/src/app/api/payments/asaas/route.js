import { NextResponse } from 'next/server';
import { assertNoActiveSubscription } from '@/lib/server/subscriptions';
import { asaasClient, reconcileCharge } from '@/lib/server/asaas';
import { PAYABLE_STATUSES } from '@/lib/billing.mjs';
import { apiError, HttpError, isUuid, rateLimit, readBody, requireUser, serviceClient } from '@/lib/server/security';

export async function POST(request) {
  try {
    const { user, profile } = await requireUser();
    const { paymentId, billingType = 'UNDEFINED' } = await readBody(request);
    if (!isUuid(paymentId) || !['PIX', 'UNDEFINED'].includes(billingType)) throw new HttpError(400, 'Cobrança ou forma de pagamento inválida.');
    rateLimit('checkout:' + user.id, 10, 60000);
    const db = serviceClient();
    const { data: payment, error } = await db.from('pagamentos').select('*, pacientes(id, user_id, cpf, telefone, asaas_customer_id, profiles:user_id(nome, email))').eq('id', paymentId).single();
    if (error || !payment || (profile.tipo !== 'admin' && payment.pacientes?.user_id !== user.id)) throw new HttpError(404, 'Cobrança não encontrada.');
    if (!PAYABLE_STATUSES.includes(payment.status)) throw new HttpError(409, 'Esta cobrança não está disponível para pagamento.');
    if (!Number.isInteger(payment.sessoes_contratadas) || payment.sessoes_contratadas < 1) throw new HttpError(503, 'A clínica precisa conferir a quantidade de sessões desta fatura antes do pagamento.');
    if (!Number.isFinite(Number(payment.valor)) || Number(payment.valor) <= 0) throw new HttpError(400, 'Valor de cobrança inválido.');
    const asaas = await asaasClient(db);
    const checkout = async () => {
      if (payment.gateway_payment_id) return asaas.request('/payments/' + encodeURIComponent(payment.gateway_payment_id));
      if (!payment.gateway_id.startsWith('sub_')) return asaas.request('/payments/' + encodeURIComponent(payment.gateway_id));
      const charges = await asaas.request('/payments?subscription=' + encodeURIComponent(payment.gateway_id) + '&limit=100');
      const outstanding = charges.data?.filter(charge => ['PENDING', 'OVERDUE'].includes(charge.status) && charge.externalReference === payment.id).sort((a,b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (!outstanding) throw new HttpError(409, 'Não há fatura disponível. Atualize seus pagamentos ou consulte a clínica.');
      return outstanding;
    };
    const responseFor = async charge => {
      const { event, charge: currentCharge } = await reconcileCharge(db, asaas, charge.id);
      charge = currentCharge;
      if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) return NextResponse.json({ paid: true });
      if (!['PENDING', 'OVERDUE'].includes(charge.status) || charge.deleted) throw new HttpError(409, 'Esta cobrança está em análise ou indisponível. Aguarde a confirmação ou consulte a clínica.');
      const invoiceUrl = asaas.safeUrl(charge.invoiceUrl);
      if (billingType === 'PIX') {
        const pix = await asaas.request('/payments/' + encodeURIComponent(charge.id) + '/pixQrCode');
        if (!pix.payload || !pix.encodedImage) throw new HttpError(503, 'Pix indisponível nesta cobrança. Utilize o checkout ou consulte a clínica.');
        return NextResponse.json({ invoiceUrl, pix: { payload: pix.payload, encodedImage: pix.encodedImage, expirationDate: pix.expirationDate } });
      }
      if (!invoiceUrl) throw new HttpError(502, 'O checkout não está disponível. Consulte a clínica.');
      return NextResponse.json({ invoiceUrl });
    };
    if (payment.gateway_id) return await responseFor(await checkout());
    if (!payment.pacientes?.asaas_customer_id && !payment.pacientes?.cpf) throw new HttpError(400, 'Complete seu CPF no perfil antes de pagar.');
    const cycles = { mensal: 'MONTHLY', trimestral: 'QUARTERLY', semestral: 'SEMIANNUALLY', anual: 'YEARLY' };
    const recurring = !!cycles[payment.tipo_plano];
    if (recurring) await assertNoActiveSubscription(db, payment.paciente_id, asaas.base, asaas.key);
    const { error: lockError } = await db.from('payment_checkout_locks').insert({ pagamento_id: payment.id });
    if (lockError) {
      // Recover an existing charge after a lost response, without creating a second one.
      const existing = await asaas.request('/payments?externalReference=' + encodeURIComponent(payment.id) + '&limit=100');
      const ids = new Set((existing.data || []).map(c => c.subscription || c.id));
      if (lockError.code !== '23505' || ids.size !== 1) throw new HttpError(409, 'A cobrança está sendo preparada ou precisa de conferência da clínica. Nenhuma cobrança adicional foi criada.');
      payment.gateway_id = [...ids][0];
      const { error: saveError } = await db.from('pagamentos').update({ gateway_id: payment.gateway_id, status: 'processando' }).eq('id', payment.id);
      if (saveError) throw saveError;
      return await responseFor(await checkout());
    }
    // Retain the lock after uncertain gateway responses; recovery above is read-only.
    const patient = payment.pacientes;
    let customerId = patient.asaas_customer_id;
    if (!customerId) {
      const customers = await asaas.request('/customers?cpfCnpj=' + encodeURIComponent(patient.cpf.replace(/\D/g, '')));
      customerId = customers.data?.[0]?.id;
      if (!customerId) {
        const customer = await asaas.request('/customers', { name: patient.profiles.nome, email: patient.profiles.email, cpfCnpj: patient.cpf.replace(/\D/g, ''), mobilePhone: patient.telefone?.replace(/\D/g, ''), notificationDisabled: true });
        customerId = customer.id;
      }
      if (!customerId) throw new HttpError(502, 'Não foi possível preparar o cadastro financeiro.');
      const { error: customerError } = await db.from('pacientes').update({ asaas_customer_id: customerId }).eq('id', patient.id);
      if (customerError) throw customerError;
    }
    const dueDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const charge = await asaas.request(recurring ? '/subscriptions' : '/payments', { customer: customerId, billingType, value: Number(payment.valor), externalReference: payment.id, description: 'Acolher - ' + payment.tipo_plano, ...(recurring ? { nextDueDate: dueDate, cycle: cycles[payment.tipo_plano] } : { dueDate }) });
    if (!charge.id) throw new HttpError(502, 'Resposta inválida do serviço de pagamentos.');
    payment.gateway_id = charge.id;
    const { error: saveError } = await db.from('pagamentos').update({ gateway_id: charge.id, status: 'processando' }).eq('id', payment.id);
    if (saveError) throw saveError;
    return await responseFor(recurring ? await checkout() : charge);
  } catch (error) { return apiError(error); }
}
