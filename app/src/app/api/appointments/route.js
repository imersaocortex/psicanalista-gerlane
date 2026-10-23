import { NextResponse } from 'next/server';
import { apiError, HttpError, readBody, requireUser, rateLimit } from '@/lib/server/security';
import { clinicSlot } from '@/lib/billing.mjs';

export async function POST(request) {
  try {
    const { user, supabase } = await requireUser();
    const { date, time, modality } = await readBody(request);
    if (typeof date !== 'string' || typeof time !== 'string' || !['online', 'presencial'].includes(modality)) throw new HttpError(400, 'Informe data, horário e modalidade.');
    let slot;
    try { slot = clinicSlot(date, time); } catch { throw new HttpError(400, 'Data ou horário inválido.'); }
    if (new Date(slot).getTime() <= Date.now()) throw new HttpError(400, 'Escolha um horário futuro.');
    rateLimit('appointment:' + user.id, 10, 60000);
    const { data, error } = await supabase.rpc('acolher_book_session', { p_date: slot, p_modality: modality });
    if (error) {
      if (['22023', '42501'].includes(error.code)) throw new HttpError(409, error.message);
      throw new HttpError(503, 'Agendamento indisponível. A clínica precisa verificar a configuração da agenda e dos pagamentos.');
    }
    return NextResponse.json({ sessionId: data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
