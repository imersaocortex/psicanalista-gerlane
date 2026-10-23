import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function apiError(error) {
  const status = error instanceof HttpError ? error.status : error instanceof SyntaxError ? 400 : 500;
  if (status === 500) console.error('Falha no servidor:', error?.code || error?.name || 'UnknownError');
  return NextResponse.json({ error: status === 500 ? 'Não foi possível concluir a operação. Tente novamente.' : error.message }, { status });
}
export function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Origem não autorizada.');
}
export async function readBody(request) {
  assertSameOrigin(request);
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Envie os dados em JSON.');
  const text = await request.text();
  if (text.length > 16000) throw new HttpError(413, 'Solicitação muito grande.');
  const body = JSON.parse(text);
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new HttpError(400, 'Dados inválidos.');
  return body;
}
export async function requireUser(adminOnly = false) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new HttpError(401, 'Entre na sua conta para continuar.');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id, tipo, nome').eq('id', user.id).single();
  if (profileError || !['admin', 'paciente'].includes(profile?.tipo)) throw new HttpError(403, 'Seu perfil de acesso não está disponível. Entre em contato com a clínica.');
  if (adminOnly && profile.tipo !== 'admin') throw new HttpError(403, 'Acesso exclusivo da administração.');
  return { supabase, user, profile };
}
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key) throw new HttpError(503, 'Esta integração ainda não foi configurada pela clínica.');
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function verifySecret(received, expected) {
  if (!expected) throw new HttpError(503, 'Integração não configurada.');
  const a = Buffer.from(received || ''), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'Não autorizado.');
}
export function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
const attempts = new Map();
export function rateLimit(key, limit = 8, windowMs = 600000) {
  const now = Date.now();
  for (const [id, item] of attempts) if (item.until <= now) attempts.delete(id);
  const item = attempts.get(key) || { count: 0, until: now + windowMs };
  if (++item.count > limit) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  attempts.set(key, item);
}
export async function systemConfig(db, keys) {
  let query = db.from('configuracoes_sistema').select('chave, valor');
  if (keys) query = query.in('chave', keys);
  const { data, error } = await query;
  if (error) throw new HttpError(503, 'Não foi possível carregar a configuração da integração.');
  return Object.fromEntries((data || []).map(({ chave, valor }) => {
    let parsed = valor;
    try { if (typeof valor === 'string') parsed = JSON.parse(valor); } catch { /* Plain strings are supported. */ }
    return [chave, parsed];
  }));
}
