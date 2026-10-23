import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { apiError, HttpError, rateLimit, readBody } from '@/lib/server/security';

export async function POST(request) {
  try {
    const body = await readBody(request);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const password = body.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || nome.length < 3 || nome.length > 120) throw new HttpError(400, 'Informe seu nome completo e um e-mail válido.');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new HttpError(400, 'A senha deve ter entre 8 e 128 caracteres.');
    if (body.acceptedPrivacy !== true && body.adminCreated !== true) throw new HttpError(400, 'Leia e aceite o aviso de privacidade para criar sua conta.');
    rateLimit('register:' + (request.headers.get('x-forwarded-for')?.split(',')[0] || 'local'), 10);
    rateLimit('register-email:' + email, 3);
    const sessionClient = await createClient();
    const { data: { user: currentUser } } = await sessionClient.auth.getUser();
    let isAdmin = false;
    if (currentUser) {
      const { data } = await sessionClient.from('profiles').select('tipo').eq('id', currentUser.id).single();
      isAdmin = data?.tipo === 'admin';
      if (!isAdmin) throw new HttpError(403, 'Saia da conta atual antes de criar outra conta.');
    }
    if (body.adminCreated && !isAdmin) throw new HttpError(403, 'Acesso não autorizado.');
    const db = isAdmin ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : sessionClient;
    const { data, error } = await db.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: new URL(request.url).origin + '/auth/callback',
        data: { nome, tipo: 'paciente', privacy_accepted_at: body.acceptedPrivacy ? new Date().toISOString() : null },
      },
    });
    if (error) throw new HttpError(error.status === 429 ? 429 : 400, 'Não foi possível criar a conta. Verifique os dados ou tente recuperar sua senha.');
    if (data.user?.identities?.length === 0) return NextResponse.json({ requiresEmailConfirmation: true });
    return NextResponse.json({ ...(isAdmin ? { user: { id: data.user?.id } } : {}), requiresEmailConfirmation: !data.session }, { status: 201 });
  } catch (error) { return apiError(error); }
}
