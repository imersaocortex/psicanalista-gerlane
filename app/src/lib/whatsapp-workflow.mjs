import { createHash } from 'node:crypto';

export const AUTOMATION_TARGET = 'https://webhook.innave.space/webhook/psicanalista-gerlane';
export const CLINIC_SIGNATURE = 'Atenciosamente,\nDra. Gerlane Albuquerque\nWhatsApp: (84) 99812-7788\nhttps://psicanalistagerlane.com.br';

export function clinicMessage(title, message) {
  // Only substitute known legacy placeholders; never invent business details.
  const replacements = {
    'Nome da Empresa': 'Dra. Gerlane Albuquerque',
    'Informações de Contato': 'WhatsApp: (84) 99812-7788',
    'Website da Empresa': 'https://psicanalistagerlane.com.br',
  };
  const body = message.replace(/\[(Nome da Empresa|Informações de Contato|Website da Empresa)\]/g, (_, key) => replacements[key]);
  return '*' + title.trim() + '*\n\n' + body.trim() + (/Atenciosamente,/i.test(body) ? '' : '\n\n' + CLINIC_SIGNATURE);
}

export function deliveryKey(...parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

export function incomingMessage(payload, instance) {
  if (payload?.instance !== instance || !['messages.upsert', 'MESSAGES_UPSERT'].includes(payload?.event)) return null;
  const data = payload.data;
  // Fail closed: missing flags, batches, status broadcasts and outgoing echoes never reach the bot.
  if (!data || Array.isArray(data) || data.key?.fromMe !== false || typeof data.key?.id !== 'string' || !data.key.id || !data.message) return null;
  const jid = data.key.remoteJid;
  if (typeof jid !== 'string' || !/@(?:s\.whatsapp\.net|lid)$/.test(jid)) return null;
  return deliveryKey('incoming', instance, jid, data.key.id);
}

export async function deliverOnce(db, id, send) {
  const { error } = await db.from('whatsapp_deliveries').insert({ id, status: 'processing' });
  if (error?.code === '23505') return { duplicate: true, success: false };
  if (error) throw error; // Never send if the durable claim failed.
  let success = false;
  try { success = (await send())?.success === true; }
  finally {
    // Keep the claim even on a timeout: the provider may have accepted the request.
    const { error: updateError } = await db.from('whatsapp_deliveries').update({ status: success ? 'sent' : 'failed' }).eq('id', id);
    if (updateError) throw updateError;
  }
  return { duplicate: false, success };
}
