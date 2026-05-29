import { createClient } from '@supabase/supabase-js';

/**
 * Envia uma mensagem via Evolution API para o paciente
 * @param {string} userId - ID do usuário (auth.uid) no Supabase
 * @param {string} message - Texto da mensagem
 */
export async function sendWhatsAppMessage(userId, message, overridePhone = null) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[WhatsApp Service] Supabase credentials missing');
      return { success: false, error: 'Credentials missing' };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Obter configurações da Evolution API
    const { data: configs, error: configError } = await supabase
      .from('configuracoes_sistema')
      .select('chave, valor')
      .in('chave', ['evolution_api_url', 'evolution_api_instance', 'evolution_api_apikey']);

    if (configError || !configs) {
      console.error('[WhatsApp Service] Error fetching configurations:', configError);
      return { success: false, error: 'Configs not found' };
    }

    const configMap = {};
    configs.forEach(c => {
      try {
        configMap[c.chave] = JSON.parse(c.valor);
      } catch (e) {
        configMap[c.chave] = c.valor;
      }
    });

    const apiUrl = String(configMap['evolution_api_url'] || '').trim().replace(/\/+$/, '');
    const instance = String(configMap['evolution_api_instance'] || '').trim();
    const apiKey = String(configMap['evolution_api_apikey'] || '').trim();

    if (!apiUrl || !instance || !apiKey) {
      console.log('[WhatsApp Service] Evolution API is not fully configured. Skipping send.');
      return { success: false, error: 'Not configured' };
    }

    let phone = overridePhone;

    // Se o telefone não veio da tela, buscar no banco (o que falha se não houver Chave Mestra)
    if (!phone) {
      const { data: patient, error: patientError } = await supabase
        .from('pacientes')
        .select('telefone')
        .eq('user_id', userId)
        .maybeSingle();

      if (patientError || !patient || !patient.telefone) {
        console.log(`[WhatsApp Service] Patient phone number not found for user ${userId}. Skipping.`);
        return { success: false, error: 'Phone number not found' };
      }
      
      phone = patient.telefone;
    }

    // 3. Formatar o número de telefone (remover caracteres especiais e garantir código do país)
    phone = phone.replace(/\D/g, ''); // Apenas números
    
    if (phone.length === 0) {
      console.log('[WhatsApp Service] Formatted phone number is empty.');
      return { success: false, error: 'Invalid phone number' };
    }

    // Se o número não começar com o DDI do Brasil (55), adiciona se tiver 10 ou 11 dígitos
    if (!phone.startsWith('55') && (phone.length === 10 || phone.length === 11)) {
      phone = '55' + phone;
    }

    console.log(`[WhatsApp Service] Sending message to ${phone}...`);

    // 4. Disparar a mensagem para a Evolution API
    const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'GlobalApiKey': apiKey
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`[HTTP ${response.status}] ${result ? JSON.stringify(result) : 'Sem resposta da API'}`);
    }

    console.log(`[WhatsApp Service] Message successfully sent to ${phone}`);
    return { success: true, data: result };

  } catch (error) {
    console.error('[WhatsApp Service] Error sending WhatsApp:', error.message || error);
    return { success: false, error: error.message || error };
  }
}
