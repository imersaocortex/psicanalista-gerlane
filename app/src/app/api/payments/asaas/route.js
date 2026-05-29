import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { paymentId } = await request.json();

    // 1. Buscar detalhes do pagamento e do paciente
    const { data: payment, error: paymentError } = await supabase
      .from('pagamentos')
      .select(`
        *,
        pacientes (
          id,
          cpf,
          telefone,
          asaas_customer_id,
          profiles:user_id (
            nome,
            email
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // 2. Buscar Configurações do Asaas do Admin
    // Como é um sistema clínico, assumimos que o admin é o dono do sistema.
    // Em um sistema multi-tenant, buscaríamos pelo admin_id vinculado ao paciente.
    const { data: configs } = await supabase
      .from('configuracoes_sistema')
      .select('chave, valor');
    
    const configMap = {};
    configs?.forEach(c => {
      let val = c.valor;
      try {
        if (typeof val === 'string' && (val.startsWith('"') || val.startsWith('{') || val.startsWith('['))) {
          val = JSON.parse(val);
        }
      } catch (e) {}
      configMap[c.chave] = val;
    });

    const asaasKey = String(configMap.asaas_api_key || '').trim();
    const isSandbox = configMap.asaas_environment === 'sandbox';
    const asaasUrl = isSandbox 
      ? 'https://sandbox.asaas.com/api/v3' 
      : 'https://api.asaas.com/v3';

    if (!asaasKey || asaasKey === '') {
      return NextResponse.json({ error: 'Configuração do Asaas ausente' }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': asaasKey
    };

    let customerId = payment.pacientes.asaas_customer_id;
    console.log('[Asaas] Patient data:', {
      name: payment.pacientes.profiles?.nome,
      email: payment.pacientes.profiles?.email,
      cpf: payment.pacientes.cpf,
      existingCustomerId: customerId
    });

    if (!customerId) {
      // Tentar buscar pelo email no Asaas
      const customerSearchResponse = await fetch(`${asaasUrl}/customers?email=${payment.pacientes.profiles.email}`, { headers });
      const customers = await customerSearchResponse.json();

      if (customers.data && customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('[Asaas] Found existing customer:', customerId);
      } else {
        // Criar novo cliente no Asaas
        const customerBody = {
          name: payment.pacientes.profiles.nome,
          email: payment.pacientes.profiles.email,
          phone: payment.pacientes.telefone,
          cpfCnpj: payment.pacientes.cpf || '',
          notificationDisabled: false
        };
        console.log('[Asaas] Creating customer with body:', JSON.stringify(customerBody, null, 2));
        
        const newCustomerResponse = await fetch(`${asaasUrl}/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify(customerBody)
        });
        const newCustomer = await newCustomerResponse.json();
        console.log('[Asaas] Customer creation response:', JSON.stringify(newCustomer, null, 2));
        
        if (newCustomer.errors) {
          const errorMsg = newCustomer.errors.map(e => e.description).join('; ');
          return NextResponse.json({ error: errorMsg || 'Erro ao criar cliente no Asaas', details: newCustomer.errors }, { status: 400 });
        }
        customerId = newCustomer.id;
      }

      // Salvar o customerId no banco para futuras cobranças
      await supabase
        .from('pacientes')
        .update({ asaas_customer_id: customerId })
        .eq('id', payment.pacientes.id);
    }

    // Sempre atualizar os dados do cliente no ASAAS (garante que CPF e demais dados estejam sincronizados)
    if (payment.pacientes.cpf) {
      console.log('[Asaas] Updating customer CPF on ASAAS:', customerId);
      const updateResponse = await fetch(`${asaasUrl}/customers/${customerId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: payment.pacientes.profiles.nome,
          cpfCnpj: payment.pacientes.cpf,
          phone: payment.pacientes.telefone
        })
      });
      const updateResult = await updateResponse.json();
      console.log('[Asaas] Customer update response:', JSON.stringify(updateResult, null, 2));
    }

    // 4. Decidir se cria Cobrança Única ou Assinatura Recorrente
    const isPlanRecurring = ['mensal', 'trimestral', 'semestral', 'anual'].includes(payment.tipo_plano);
    
    let asaasPayment;
    const dueDateStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // 1 dia de vencimento

    if (isPlanRecurring) {
      const cycleMap = {
        mensal: 'MONTHLY',
        trimestral: 'QUARTERLY',
        semestral: 'SEMIANNUALLY',
        anual: 'YEARLY'
      };

      const subscriptionBody = {
        customer: customerId,
        billingType: 'UNDEFINED', // Permite escolher Pix/Cartão/Boleto no checkout
        value: payment.valor,
        nextDueDate: dueDateStr,
        cycle: cycleMap[payment.tipo_plano] || 'MONTHLY',
        description: `Assinatura Recorrente (${payment.tipo_plano}) - Clínica Psicanálise`,
        externalReference: payment.id,
        callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/paciente/pagamentos?success=true`,
      };

      console.log('[Asaas] Creating subscription with body:', JSON.stringify(subscriptionBody, null, 2));

      const subscriptionResponse = await fetch(`${asaasUrl}/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(subscriptionBody)
      });

      asaasPayment = await subscriptionResponse.json();
    } else {
      const paymentBody = {
        customer: customerId,
        billingType: 'UNDEFINED',
        value: payment.valor,
        dueDate: dueDateStr,
        description: `Pagamento ${payment.tipo_plano} - Clínica Psicanálise`,
        externalReference: payment.id,
        callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/paciente/pagamentos?success=true`,
      };

      console.log('[Asaas] Creating single payment with body:', JSON.stringify(paymentBody, null, 2));

      const paymentResponse = await fetch(`${asaasUrl}/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentBody)
      });

      asaasPayment = await paymentResponse.json();
    }

    console.log('[Asaas] Response:', JSON.stringify(asaasPayment, null, 2));

    if (asaasPayment.errors) {
      console.error('[Asaas] Creation error:', JSON.stringify(asaasPayment.errors, null, 2));
      const errorMsg = asaasPayment.errors.map(e => e.description).join('; ');
      return NextResponse.json({ error: errorMsg || 'Erro ao gerar cobrança', details: asaasPayment.errors }, { status: 400 });
    }

    // 5. Atualizar o pagamento no Supabase com o ID do Asaas
    await supabase
      .from('pagamentos')
      .update({ 
        gateway_id: asaasPayment.id,
        status: 'processando'
      })
      .eq('id', payment.id);

    return NextResponse.json({ 
      invoiceUrl: asaasPayment.invoiceUrl,
      bankSlipUrl: asaasPayment.bankSlipUrl,
      pixQrCode: asaasPayment.pixQrCode
    });

  } catch (error) {
    console.error('Asaas API Error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
