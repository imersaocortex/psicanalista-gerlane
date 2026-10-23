import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
export async function GET(request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') === '/redefinir-senha' ? '/redefinir-senha' : '/dashboard/paciente';
  let error = true;
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && ['signup', 'recovery', 'email'].includes(type)) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  return NextResponse.redirect(new URL(error ? '/login?erro=link' : type === 'recovery' ? '/redefinir-senha' : next, url.origin));
}
