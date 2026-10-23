import { updateSession } from './utils/supabase/middleware';
export async function proxy(request) { return updateSession(request); }
export const config = { matcher: ['/dashboard/:path*', '/login', '/cadastro', '/recuperar-senha', '/redefinir-senha'] };
