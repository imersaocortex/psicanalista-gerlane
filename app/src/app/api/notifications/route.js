import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/utils/whatsapp';
import { apiError, HttpError, isUuid, rateLimit, readBody, requireUser } from '@/lib/server/security';
export async function POST(request) {
  try {
    const { supabase, user } = await requireUser(true);
    const { userId, title, message, link } = await readBody(request);
    if (!isUuid(userId) || typeof title !== 'string' || !title.trim() || title.length > 120 || typeof message !== 'string' || !message.trim() || message.length > 2000) throw new HttpError(400, 'Dados de notificação inválidos.');
    if (link && (typeof link !== 'string' || !link.startsWith('/dashboard/') || link.includes('\\') || link.length > 250)) throw new HttpError(400, 'Link inválido.');
    rateLimit('notifications:' + user.id, 30, 60000);
    const { data: patient } = await supabase.from('pacientes').select('telefone').eq('user_id', userId).single();
    if (!patient) throw new HttpError(404, 'Paciente não encontrado.');
    const { error } = await supabase.from('notificacoes').insert({ user_id: userId, titulo: title.trim(), mensagem: message.trim(), link: link || null, lida: false });
    if (error) throw error;
    // Recipient phone comes from the database, never from the request body.
    const result = await sendWhatsAppMessage(userId, '*' + title.trim() + '*\n\n' + message.trim(), { db: supabase });
    return NextResponse.json({ success: true, whatsappSent: result.success, warning: result.success ? undefined : 'Notificação salva. WhatsApp indisponível.' });
  } catch (error) { return apiError(error); }
}
