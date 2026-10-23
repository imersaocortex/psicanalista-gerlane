import { NextResponse } from 'next/server';
import { apiError, serviceClient, verifySecret } from '@/lib/server/security';
import { sendWhatsAppMessage } from '@/utils/whatsapp';
export async function GET(request) {
  try {
    verifySecret(request.headers.get('authorization'), process.env.CRON_SECRET ? 'Bearer ' + process.env.CRON_SECRET : undefined);
    const db = serviceClient();
    const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const next = new Date(localDate + 'T12:00:00-03:00');
    next.setUTCDate(next.getUTCDate() + 1);
    const day = next.toISOString().slice(0, 10);
    const start = new Date(day + 'T00:00:00-03:00');
    const end = new Date(start.getTime() + 86400000);
    const { data: sessions, error } = await db.from('sessoes').select('id, data, pacientes(user_id)').gte('data', start.toISOString()).lt('data', end.toISOString()).eq('status', 'confirmada');
    if (error) throw error;
    let sent = 0, failed = 0;
    for (const session of sessions || []) {
      if (!session.pacientes?.user_id) continue;
      const key = 'reminder:' + session.id + ':' + day;
      // A unique persistent claim prevents concurrent cron requests from sending twice.
      const { error: claimError } = await db.from('automation_deliveries').insert({ id: key, status: 'processing' });
      if (claimError?.code === '23505') continue;
      if (claimError) throw claimError;
      const time = new Date(session.data).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      const text = 'Acolher: seu horário está confirmado para amanhã às ' + time + '. Para reagendar, entre em contato com a clínica.';
      const result = await sendWhatsAppMessage(session.pacientes.user_id, text, { db });
      const { error: updateError } = await db.from('automation_deliveries').update({ status: result.success ? 'sent' : 'failed' }).eq('id', key);
      if (updateError) throw updateError;
      if (result.success) sent++; else failed++;
      const { error: notificationError } = await db.from('notificacoes').insert({ user_id: session.pacientes.user_id, titulo: 'Lembrete de consulta', mensagem: text, lida: false, link: '/dashboard/paciente/agenda' });
      if (notificationError) throw notificationError;
    }
    return NextResponse.json({ success: true, sent, failed });
  } catch (error) { return apiError(error); }
}
