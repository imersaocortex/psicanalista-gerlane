import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { event, payment } = body;

    console.log(`[Asaas Webhook] Event received: ${event}`, payment.id);

    // 1. Verificar se é um evento de confirmação de pagamento
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const externalReference = payment.externalReference; // Este é o ID do pagamento no nosso Supabase

      if (!externalReference) {
        return NextResponse.json({ message: 'No external reference found' }, { status: 200 });
      }

      // 2. Buscar o pagamento no Supabase
      const { data: localPayment, error: fetchError } = await supabase
        .from('pagamentos')
        .select('*, pacientes(id, plano_id)')
        .eq('id', externalReference)
        .single();

      if (fetchError || !localPayment) {
        console.error('[Asaas Webhook] Payment not found in database:', externalReference);
        return NextResponse.json({ message: 'Payment not found' }, { status: 200 });
      }

      // 3. Atualizar o status do pagamento para 'pago'
      const { error: updateError } = await supabase
        .from('pagamentos')
        .update({ status: 'pago' })
        .eq('id', externalReference);

      if (updateError) throw updateError;

      // 4. Lógica de Atualização de Plano (Upgrade/Downgrade)
      // Se o pagamento for do tipo "Plano X", atualizamos o plano do paciente
      if (localPayment.tipo_plano) {
        // Buscar o ID do plano pelo nome (ou poderíamos ter guardado o ID no pagamento)
        const { data: planData } = await supabase
          .from('planos')
          .select('id')
          .eq('nome', localPayment.tipo_plano)
          .single();

        if (planData) {
          const { error: patientUpdateError } = await supabase
            .from('pacientes')
            .update({ plano_id: planData.id, status: 'ativo' })
            .eq('id', localPayment.paciente_id);
          
          if (patientUpdateError) console.error('[Asaas Webhook] Error updating patient plan:', patientUpdateError);
        }
      }

      // 5. Criar uma notificação para o paciente
      await supabase.from('notificacoes').insert({
        user_id: localPayment.pacientes.user_id || localPayment.paciente_id, // Idealmente o user_id
        titulo: 'Pagamento Confirmado! 🎉',
        mensagem: `Seu pagamento no valor de R$ ${localPayment.valor} foi processado com sucesso. Seu plano foi atualizado.`,
        lida: false
      });

      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }

    // Outros eventos (vencimento, falha, etc)
    if (event === 'PAYMENT_OVERDUE') {
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
