import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '@/utils/whatsapp';

export async function GET(request) {
  try {
    // 1. Verificação de Segurança (Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('Tentativa de acesso não autorizada ao Cron Job');
      // Em produção real, você pode descomentar a linha abaixo para bloquear acessos externos:
      // return new Response('Unauthorized', { status: 401 });
    }

    // Usar a chave de serviço para bypassar RLS e permitir que o robô leia todas as agendas
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 2. Definir o intervalo de "Amanhã" (00:00:00 até 23:59:59)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Configurar para pegar o início e o fim do dia de amanhã
    const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0).toISOString();
    const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59).toISOString();

    console.log(`[Cron Reminders] Buscando sessões entre ${startOfTomorrow} e ${endOfTomorrow}`);

    // 3. Buscar todas as sessões marcadas para amanhã que não estejam canceladas/concluídas
    const { data: sessoes, error: sessoesError } = await supabase
      .from('sessoes')
      .select(`
        id,
        data,
        status,
        pacientes (
          telefone,
          user_id,
          profiles (nome)
        )
      `)
      .gte('data', startOfTomorrow)
      .lte('data', endOfTomorrow)
      .not('status', 'in', '("cancelada","concluida")');

    if (sessoesError) {
      throw sessoesError;
    }

    console.log(`[Cron Reminders] Encontradas ${sessoes?.length || 0} sessões para amanhã.`);

    let notificationsSent = 0;

    // 4. Disparar notificações via WhatsApp
    for (const sessao of sessoes || []) {
      const paciente = sessao.pacientes;
      if (!paciente || !paciente.telefone) continue;

      const pacienteNome = paciente.profiles?.nome?.split(' ')[0] || 'Paciente';
      const sessionDate = new Date(sessao.data);
      const timeStr = sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const message = `Olá ${pacienteNome}! 👋\n\nPassando para lembrar que nossa sessão de terapia está confirmada para amanhã às *${timeStr}*.\n\nSe precisar reagendar, por favor, avise com antecedência pelo Portal ou por aqui. Até amanhã!`;

      try {
        await sendWhatsAppMessage(paciente.user_id, message, paciente.telefone);
        notificationsSent++;

        // Também salva a notificação dentro do portal (no sininho)
        if (paciente.user_id) {
          await supabase.from('notificacoes').insert({
            user_id: paciente.user_id,
            titulo: 'Lembrete de Consulta ⏰',
            mensagem: `Sua sessão está confirmada para amanhã às ${timeStr}.`,
            lida: false,
            link: '/dashboard/paciente/agenda'
          });
        }
      } catch (err) {
        console.error(`Erro ao enviar lembrete para a sessão ${sessao.id}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cron de Lembretes executado com sucesso',
      sessoesEncontradas: sessoes?.length || 0,
      notificacoesEnviadas: notificationsSent
    });

  } catch (error) {
    console.error('Erro geral no Cron Job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
