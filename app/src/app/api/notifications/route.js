import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/utils/whatsapp';
import { apiError, HttpError, isUuid, rateLimit, readBody, requireUser, serviceClient } from '@/lib/server/security';
import { clinicMessage, deliveryKey, deliverOnce } from '@/lib/whatsapp-workflow.mjs';

export async function POST(request) {
  try {
    const { supabase, user } = await requireUser(true);
    const body = await readBody(request);
    rateLimit('notifications:' + user.id, 30, 60000);
    let { userId, title, message, link } = body;
    let key;
    const isAnamnesis = body.anamneseId !== undefined;
    if (isAnamnesis) {
      if (!isUuid(body.anamneseId)) throw new HttpError(400, 'Anamnese inválida.');
      const { data: record, error } = await supabase.from('anamneses').select('id, paciente_id, notification_revision').eq('id', body.anamneseId).single();
      if (error || !record) throw new HttpError(404, 'Anamnese não encontrada.');
      const { data: patient } = await supabase.from('pacientes').select('user_id').eq('id', record.paciente_id).single();
      if (!patient?.user_id) throw new HttpError(404, 'Paciente não encontrado.');
      userId = patient.user_id;
      title = 'Ficha de Anamnese Atualizada';
      message = 'Sua ficha de anamnese foi atualizada pela Dra. Gerlane Albuquerque. Acesse o aplicativo Acolher para visualizar com segurança: https://psicanalistagerlane.com.br/dashboard/paciente/anamnese';
      link = '/dashboard/paciente/anamnese';
      key = deliveryKey('anamnese', record.id, record.notification_revision);
    } else {
      if (!isUuid(userId) || typeof title !== 'string' || !title.trim() || title.length > 120 || typeof message !== 'string' || !message.trim() || message.length > 2000) throw new HttpError(400, 'Dados de notificação inválidos.');
      if (link && (typeof link !== 'string' || !link.startsWith('/dashboard/') || link.includes('\\') || link.length > 250)) throw new HttpError(400, 'Link inválido.');
      const { data: patient } = await supabase.from('pacientes').select('id').eq('user_id', userId).single();
      if (!patient) throw new HttpError(404, 'Paciente não encontrado.');
      key = deliveryKey('notification', userId, title.trim(), message.trim(), link || '', Math.floor(Date.now() / 300000));
    }
    const db = serviceClient();
    const result = await deliverOnce(db, key, async () => {
      // Anamnesis already creates its single inbox entry via the database trigger.
      if (!isAnamnesis) {
        const { error } = await supabase.from('notificacoes').insert({ user_id: userId, titulo: title.trim(), mensagem: message.trim(), link: link || null, lida: false });
        if (error) throw error;
      }
      return sendWhatsAppMessage(userId, clinicMessage(title, message), { db });
    });
    return NextResponse.json({ success: true, whatsappSent: result.success, duplicate: result.duplicate, warning: result.success || result.duplicate ? undefined : 'WhatsApp não confirmado. O aviso não será reenviado automaticamente.' });
  } catch (error) { return apiError(error); }
}
