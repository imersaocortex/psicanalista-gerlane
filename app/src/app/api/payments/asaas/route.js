import { NextResponse } from 'next/server';
import { assertNoActiveSubscription } from '@/lib/server/subscriptions';
import { apiError, HttpError, isUuid, rateLimit, readBody, requireUser, serviceClient, systemConfig } from '@/lib/server/security';
export async function POST(request) {
  try {
    const { user, profile } = await requireUser();
    const { paymentId } = await readBody(request);
    if (!isUuid(paymentId)) throw new HttpError(400, 'Cobrança inválida.');
    rateLimit('checkout:' + user.id, 10, 60000);
    const db = serviceClient();
    const { data: payment, error } = await db.from('pagamentos').select('*, pacientes(id, user_id, cpf, telefone, asaas_customer_id, profiles:user_id(nome, email))').eq('id', paymentId).single();
    if (error || !payment || (profile.tipo !== 'admin' && payment.pacientes?.user_id !== user.id)) throw new HttpError(404, 'Cobrança não encontrada.');
    if (payment.status === 'pago') throw new HttpError(409, 'Esta cobrança já foi paga.');
    if (!Number.isFinite(Number(payment.valor)) || Number(payment.valor) <= 0) throw new HttpError(400, 'Valor de cobrança inválido.');
    const config = await systemConfig(db, ['asaas_api_key', 'asaas_environment']);
    const key = String(config.asaas_api_key || '').trim();
    if (!key || !['sandbox', 'production'].includes(config.asaas_environment)) throw new HttpError(503, 'Configure o ambiente e a chave do Asaas.');
    const base = config.asaas_environment === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
    async function asaas(path, body) {
      const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', access_token: key }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000), cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || data.errors) throw new HttpError(502, 'O serviço de pagamentos não concluiu a solicitação. Entre em contato com a clínica antes de tentar novamente.');
      return data;
    }
    const checkout = async gatewayId => {
      if (gatewayId.startsWith('sub_')) {
        const charges = await asaas('/payments?subscription=' + encodeURIComponent(gatewayId));
        const outstanding = charges.data?.find(charge => ['PENDING', 'OVERDUE'].includes(charge.status));
        if (!outstanding?.invoiceUrl) throw new HttpError(409, 'Não há cobrança disponível para pagamento. Consulte novamente em instantes.');
        return outstanding;
      }
      return asaas('/payments/' + encodeURIComponent(gatewayId));
    };
    if (payment.gateway_id) {
      const charge = await checkout(payment.gateway_id);
      return NextResponse.json({ invoiceUrl: charge.invoiceUrl, bankSlipUrl: charge.bankSlipUrl });
    }
    if (!payment.pacientes?.asaas_customer_id && !payment.pacientes?.cpf) throw new HttpError(400, 'Complete seu CPF no perfil antes de pagar.');
    if (['mensal', 'trimestral', 'semestral', 'anual'].includes(payment.tipo_plano)) await assertNoActiveSubscription(db, payment.paciente_id, base, key);
    const { error: lockError } = await db.from('payment_checkout_locks').insert({ pagamento_id: payment.id });
    if (lockError) {
      if (lockError.code === '23505') throw new HttpError(409, 'Esta cobrança já está sendo preparada. Atualize a página ou fale com a clínica.');
      throw lockError;
    }
    // A lock remains after any uncertain external response: never retry creating a charge blindly.
    const patient = payment.pacientes;
    let customerId = patient.asaas_customer_id;
    if (!customerId) {
      if (!patient.cpf) throw new HttpError(400, 'Complete seu CPF no perfil antes de pagar.');
      const customers = await asaas('/customers?cpfCnpj=' + encodeURIComponent(patient.cpf.replace(/\D/g, '')));
      customerId = customers.data?.[0]?.id;
      if (!customerId) {
        const customer = await asaas('/customers', { name: patient.profiles.nome, email: patient.profiles.email, cpfCnpj: patient.cpf.replace(/\D/g, ''), mobilePhone: patient.telefone?.replace(/\D/g, ''), notificationDisabled: true });
        customerId = customer.id;
      }
      if (!customerId) throw new HttpError(502, 'Não foi possível preparar o cadastro financeiro.');
      const { error: customerError } = await db.from('pacientes').update({ asaas_customer_id: customerId }).eq('id', patient.id);
      if (customerError) throw customerError;
    }
    const cycles = { mensal: 'MONTHLY', trimestral: 'QUARTERLY', semestral: 'SEMIANNUALLY', anual: 'YEARLY' };
    const recurring = !!cycles[payment.tipo_plano];
    const dueDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const chargeBody = { customer: customerId, billingType: 'UNDEFINED', value: Number(payment.valor), externalReference: payment.id, description: 'Acolher - ' + payment.tipo_plano, ...(recurring ? { nextDueDate: dueDate, cycle: cycles[payment.tipo_plano] } : { dueDate }) };
    const charge = await asaas(recurring ? '/subscriptions' : '/payments', chargeBody);
    if (!charge.id) throw new HttpError(502, 'Resposta inválida do serviço de pagamentos.');
    const { error: saveError } = await db.from('pagamentos').update({ gateway_id: charge.id, status: 'processando' }).eq('id', payment.id);
    if (saveError) throw saveError;
    const result = recurring ? await checkout(charge.id) : charge;
    return NextResponse.json({ invoiceUrl: result.invoiceUrl, bankSlipUrl: result.bankSlipUrl });
  } catch (error) { return apiError(error); }
}
