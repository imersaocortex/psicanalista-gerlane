import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
export async function updateSession(request) {
  let response = NextResponse.next({ request });
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const redirect = path => {
    const next = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach(cookie => next.cookies.set(cookie));
    next.headers.set('Cache-Control', 'private, no-store');
    return next;
  };
  try {
    const { data: { user }, error } = await db.auth.getUser();
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (error) return redirect('/login?erro=conexao');
      if (!user) return redirect('/login');
      const { data: profile } = await db.from('profiles').select('tipo').eq('id', user.id).single();
      if (!['admin', 'paciente'].includes(profile?.tipo)) return redirect('/login?erro=perfil');
      const expected = profile.tipo === 'admin' ? '/dashboard/admin' : '/dashboard/paciente';
      if (!request.nextUrl.pathname.startsWith(expected + '/') && request.nextUrl.pathname !== expected) return redirect(expected);
    }
  } catch {
    if (request.nextUrl.pathname.startsWith('/dashboard')) return redirect('/login?erro=conexao');
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
