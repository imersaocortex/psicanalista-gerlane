import { NextResponse } from 'next/server';
import { apiError, HttpError, serviceClient, systemConfig, verifySecret } from '@/lib/server/security';
import { AUTOMATION_TARGET, deliverOnce, incomingMessage } from '@/lib/whatsapp-workflow.mjs';

export async function POST(request) {
  try {
    const db = serviceClient();
    const config = await systemConfig(db, ['evolution_api_instance', 'evolution_api_apikey']);
    verifySecret(request.headers.get('x-acolher-webhook-token'), config.evolution_api_apikey);
    const raw = await request.text();
    if (raw.length > 4 * 1024 * 1024) throw new HttpError(413, 'Evento muito grande.');
    const payload = JSON.parse(raw);
    const id = incomingMessage(payload, config.evolution_api_instance);
    if (!id) return NextResponse.json({ success: true, ignored: true });
    const result = await deliverOnce(db, id, async () => {
      try {
        // Preserve the original automation payload, including its destination field.
        const response = await fetch(AUTOMATION_TARGET, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, destination: AUTOMATION_TARGET }),
          redirect: 'error', signal: AbortSignal.timeout(15000),
        });
        return { success: response.ok };
      } catch { return { success: false }; }
    });
    // Do not ask Evolution to replay an event after an ambiguous downstream timeout.
    return NextResponse.json({ success: result.success || result.duplicate, duplicate: result.duplicate });
  } catch (error) { return apiError(error); }
}
