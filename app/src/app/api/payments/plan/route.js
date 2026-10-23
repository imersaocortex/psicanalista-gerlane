import { NextResponse } from 'next/server';
import { assertNoActiveSubscription } from '@/lib/server/subscriptions';
import { apiError, HttpError, isUuid, rateLimit, readBody, requireUser, serviceClient, systemConfig } from '@/lib/server/security';
export async function POST(request) {
  try {
    const { user, profile } = await requireUser();
    if (profile.tipo !== 'paciente') throw new HttpError(403, 'Entre como paciente para contratar um plano.');
    const { planId } = await readBody(request);
    if (!isUuid(planId)) throw new HttpError(400, 'Plano inválido.');
    rateLimit('plan:' + user.id, 5, 60000);
    const db = serviceClient();
    const { data: patient } = await db.from('pacientes').select('id').eq('user_id', user.id).single();
    const { data: plan } = await db.from('planos').select('id, preco, periodicidade').eq('id', planId).eq('ativo', true).single();
    if (!patient || !plan || Number(plan.preco) <= 0) throw new HttpError(400, 'Plano indisponível.');
    const { data: pending } = await db.from('pagamentos').select('id').eq('paciente_id', patient.id).eq('plano_id', plan.id).in('status', ['pendente', 'processando']).limit(1).maybeSingle();
    if (pending) return NextResponse.json({ paymentId: pending.id });
    const config = await systemConfig(db, ['asaas_api_key', 'asaas_environment']);
    if (!config.asaas_api_key || !['sandbox', 'production'].includes(config.asaas_environment)) throw new HttpError(503, 'A configuração financeira está indisponível.');
    const base = config.asaas_environment === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
    if (['mensal', 'trimestral', 'semestral', 'anual'].includes(plan.periodicidade)) await assertNoActiveSubscription(db, patient.id, base, config.asaas_api_key);
    const { data, error } = await db.from('pagamentos').insert({ paciente_id: patient.id, plano_id: plan.id, valor: plan.preco, tipo_plano: plan.periodicidade, status: 'pendente', data: new Date().toISOString() }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ paymentId: data.id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
