import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. Validar e usar a Chave Mestra para ignorar regras do banco de dados (RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Asaas Webhook] ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined.');
      // O ideal é retornar 500 para o Asaas tentar novamente mais tarde
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Criar cliente que ignora RLS (Segurança a Nível de Linha)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await request.json();
    const { event, payment } = body;

    console.log(`[Asaas Webhook] Event received: ${event}`, payment?.id);

    // 2. Verificar se é um evento de confirmação de pagamento
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const externalReference = payment.externalReference; // Este é o ID do pagamento no nosso Supabase

      if (!externalReference) {
        return NextResponse.json({ message: 'No external reference found' }, { status: 200 });
      }

      // 3. Buscar o pagamento no Supabase
      const { data: localPayment, error: fetchError } = await supabase
        .from('pagamentos')
        .select('*, pacientes(id, user_id, plano_id)')
        .eq('id', externalReference)
        .single();

      if (fetchError || !localPayment) {
        console.error('[Asaas Webhook] Payment not found in database:', externalReference);
        return NextResponse.json({ message: 'Payment not found' }, { status: 200 });
      }

      // 4. Atualizar o status do pagamento para 'pago'
      const { error: updateError } = await supabase
        .from('pagamentos')
        .update({ status: 'pago' })
        .eq('id', externalReference);

      if (updateError) throw updateError;

      // 5. Lógica de Atualização de Plano (Upgrade/Downgrade)
      if (localPayment.tipo_plano && localPayment.tipo_plano !== 'avulso') {
        // Buscar o ID do plano pela periodicidade
        const { data: planData } = await supabase
          .from('planos')
          .select('id')
          .eq('periodicidade', localPayment.tipo_plano)
          .limit(1)
          .maybeSingle();

        if (planData) {
          const { error: patientUpdateError } = await supabase
            .from('pacientes')
            .update({ plano_id: planData.id, status: 'ativo' })
            .eq('id', localPayment.paciente_id);
          
          if (patientUpdateError) console.error('[Asaas Webhook] Error updating patient plan:', patientUpdateError);
        }
      }

      // 6. Criar uma notificação para o paciente
      const notificationUserId = localPayment.pacientes?.user_id;
      
      if (notificationUserId) {
        const title = 'Pagamento Confirmado! 🎉';
        const msg = `Seu pagamento no valor de R$ ${localPayment.valor} foi processado com sucesso. Seu plano está ativo.`;

        await supabase.from('notificacoes').insert({
          user_id: notificationUserId,
          titulo: title,
          mensagem: msg,
          lida: false
        });

        // Enviar por WhatsApp via Evolution API
        try {
          const { sendWhatsAppMessage } = require('@/utils/whatsapp');
          await sendWhatsAppMessage(notificationUserId, `*${title}*\n\n${msg}`);
        } catch (err) {
          console.error('[Asaas Webhook] Error calling sendWhatsAppMessage:', err);
        }
      }

      console.log(`[Asaas Webhook] Payment ${externalReference} successfully updated to PAGO.`);
      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }

    // Outros eventos (vencimento, falha, etc)
    if (event === 'PAYMENT_OVERDUE') {
        if (!payment.externalReference) return NextResponse.json({ message: 'No external reference' }, { status: 200 });
        
        const { error: updateError } = await supabase
            .from('pagamentos')
            .update({ status: 'vencido' })
            .eq('id', payment.externalReference);
        
        if (updateError) console.error('[Asaas Webhook] Error updating overdue payment:', updateError);
    }

    return NextResponse.json({ message: 'Event ignored' }, { status: 200 });

  } catch (error) {
    console.error('[Asaas Webhook Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
