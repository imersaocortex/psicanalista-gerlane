import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/utils/whatsapp';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[API Notifications] Supabase credentials missing');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { userId, title, message, link } = await request.json();

    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Inserir a notificação na tabela 'notificacoes'
    const { data: notification, error: insertError } = await supabase
      .from('notificacoes')
      .insert({
        user_id: userId,
        titulo: title,
        mensagem: message,
        link: link || null,
        lida: false
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 2. Disparar para o WhatsApp do paciente e aguardar (Vercel Serverless mata promises não aguardadas)
    const formattedMessage = `*${title}*\n\n${message}`;
    try {
      await sendWhatsAppMessage(userId, formattedMessage);
    } catch (err) {
      console.error('[API Notifications] Failed to send WhatsApp message:', err);
    }

    return NextResponse.json({ success: true, notification }, { status: 200 });

  } catch (error) {
    console.error('[API Notifications] Error creating notification:', error.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
