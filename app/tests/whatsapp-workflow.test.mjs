import test from 'node:test';
import assert from 'node:assert/strict';
import { clinicMessage, incomingMessage, deliverOnce, deliveryKey } from '../src/lib/whatsapp-workflow.mjs';

function mockDb() {
  const claims = new Map();
  return { claims, from() { return {
    async insert(row) {
      if (claims.has(row.id)) return { error: { code: '23505' } };
      claims.set(row.id, row.status); return { error: null };
    },
    update(row) { return { async eq(_, id) { claims.set(id, row.status); return { error: null }; } }; }
  }; } };
}
const event = () => ({ event: 'messages.upsert', instance: 'clinic', data: { key: { fromMe: false, id: 'message-1', remoteJid: '5584999999999@s.whatsapp.net' }, message: { conversation: 'Olá' } } });

test('signature contains real clinic identity, contact and website, replaces legacy placeholders', () => {
  const text = clinicMessage('Aviso', 'Atualização.');
  for (const expected of ['Dra. Gerlane Albuquerque', '(84) 99812-7788', 'https://psicanalistagerlane.com.br']) assert.ok(text.includes(expected));
  const legacy = clinicMessage('Aviso', 'Atenciosamente,\n[Nome da Empresa]\n[Informações de Contato]\n[Website da Empresa]');
  assert.ok(!legacy.includes('['));
  assert.equal(legacy.match(/Atenciosamente,/g).length, 1);
});

test('outgoing echoes, missing direction, wrong instances, status, groups and batches are ignored', () => {
  for (const mutate of [
    e => { e.data.key.fromMe = true; }, e => { delete e.data.key.fromMe; },
    e => { e.instance = 'other'; }, e => { e.event = 'messages.update'; },
    e => { e.data.key.remoteJid = 'status@broadcast'; }, e => { e.data.key.remoteJid = 'group@g.us'; },
    e => { e.data = [e.data]; }, e => { delete e.data.message; }
  ]) { const e = event(); mutate(e); assert.equal(incomingMessage(e, 'clinic'), null); }
  assert.ok(incomingMessage(event(), 'clinic'));
  const lid = event(); lid.data.key.remoteJid = '123@lid'; assert.ok(incomingMessage(lid, 'clinic'));
});

test('same message id is stable across redeliveries, distinct ids and revisions remain separate', () => {
  const a = event(), b = event(); b.date_time = 'later';
  assert.equal(incomingMessage(a, 'clinic'), incomingMessage(b, 'clinic'));
  b.data.key.id = 'message-2'; assert.notEqual(incomingMessage(a, 'clinic'), incomingMessage(b, 'clinic'));
  assert.notEqual(deliveryKey('anamnese', 'id', 'revision1'), deliveryKey('anamnese', 'id', 'revision2'));
});

test('20 concurrent requests send once, even when the sender is slow', async () => {
  const db = mockDb(); let sends = 0;
  const send = async () => { sends++; await new Promise(r => setTimeout(r, 10)); return { success: true }; };
  const results = await Promise.all(Array.from({ length: 20 }, () => deliverOnce(db, 'same', send)));
  assert.equal(sends, 1); assert.equal(results.filter(r => r.duplicate).length, 19);
  assert.equal(db.claims.get('same'), 'sent');
});

test('ambiguous failure is retained and retries never send again', async () => {
  const db = mockDb(); let sends = 0;
  await assert.rejects(deliverOnce(db, 'failed', async () => { sends++; throw Error('timeout'); }));
  assert.equal(db.claims.get('failed'), 'failed');
  assert.equal((await deliverOnce(db, 'failed', async () => { sends++; return { success: true }; })).duplicate, true);
  assert.equal(sends, 1);
});

test('database claim failure prevents any external request', async () => {
  let sends = 0;
  const db = { from() { return { async insert() { return { error: new Error('unavailable') }; } }; } };
  await assert.rejects(deliverOnce(db, 'id', async () => { sends++; })); assert.equal(sends, 0);
});

// Execute the production routes with isolated service mocks; never contact a real patient.
async function routeWithMocks(file, dependencies) {
  const { readFile } = await import('node:fs/promises');
  let source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
  const registry = globalThis.__whatsappTestModules ||= {};
  for (const [specifier, value] of Object.entries(dependencies)) {
    const id = crypto.randomUUID(); registry[id] = value;
    const mock = `const value=globalThis.__whatsappTestModules[${JSON.stringify(id)}];\n` + Object.keys(value).map(name => `export const ${name}=value.${name};`).join('\n');
    source = source.replaceAll(`'${specifier}'`, JSON.stringify('data:text/javascript;base64,' + Buffer.from(mock).toString('base64')));
  }
  assert.doesNotMatch(source, /from ['"]@\//);
  return import('data:text/javascript;base64,' + Buffer.from(source + '\n//' + crypto.randomUUID()).toString('base64'));
}
const nextMock = { NextResponse: { json: (...args) => Response.json(...args) } };
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const errorMock = error => Response.json({ error: error.message }, { status: error.status || 500 });
const helpers = { clinicMessage, deliveryKey, deliverOnce };

test('anamnesis route derives the recipient from DB and sends once without a second inbox entry', async () => {
  const db = mockDb(); let inbox = 0, sent = 0;
  const supabase = { from(table) {
    if (table === 'notificacoes') { inbox++; throw Error('duplicate inbox writer'); }
    return { select() { return this; }, eq() { return this; }, async single() {
      return { data: table === 'anamneses' ? { id: 'record', paciente_id: 'patient', notification_revision: 'revision1' } : { user_id: 'real-patient' } };
    } };
  } };
  const route = await routeWithMocks('src/app/api/notifications/route.js', {
    'next/server': nextMock, '@/lib/whatsapp-workflow.mjs': helpers,
    '@/utils/whatsapp': { async sendWhatsAppMessage(user, text) { assert.equal(user, 'real-patient'); assert.ok(text.includes('Dra. Gerlane Albuquerque')); sent++; return { success: true }; } },
    '@/lib/server/security': { HttpError, apiError: errorMock, async requireUser(admin) { assert.equal(admin, true); return { supabase, user: { id: 'admin' } }; }, readBody: r => r.json(), isUuid: () => true, rateLimit() {}, serviceClient: () => db }
  });
  const responses = await Promise.all(Array.from({ length: 20 }, () => route.POST(new Request('https://clinic/api/notifications', { method: 'POST', body: JSON.stringify({ anamneseId: 'record', userId: 'spoofed-recipient' }) }))));
  assert.ok(responses.every(r => r.status === 200)); assert.equal(sent, 1); assert.equal(inbox, 0);
});

test('notification route denies unauthorized users before delivery', async () => {
  let sent = false;
  const route = await routeWithMocks('src/app/api/notifications/route.js', {
    'next/server': nextMock, '@/lib/whatsapp-workflow.mjs': helpers,
    '@/utils/whatsapp': { sendWhatsAppMessage() { sent = true; } },
    '@/lib/server/security': { HttpError, apiError: errorMock, async requireUser() { throw new HttpError(403, 'Forbidden'); }, readBody() {}, isUuid() {}, rateLimit() {}, serviceClient() {} }
  });
  assert.equal((await route.POST(new Request('https://clinic/api', { method: 'POST' }))).status, 403); assert.equal(sent, false);
});

test('webhook authenticates before processing and never relays an outgoing echo', async () => {
  const route = await routeWithMocks('src/app/api/webhooks/whatsapp/route.js', {
    'next/server': nextMock,
    '@/lib/whatsapp-workflow.mjs': { AUTOMATION_TARGET: 'https://example.invalid', incomingMessage, deliverOnce() { throw Error('Outgoing message must not be claimed or forwarded'); } },
    '@/lib/server/security': { HttpError, apiError: errorMock, serviceClient() { return {}; }, async systemConfig() { return { evolution_api_instance: 'clinic', evolution_api_apikey: 'test-secret' }; }, verifySecret(a, b) { if (a !== b) throw new HttpError(401, 'Unauthorized'); } }
  });
  const e = event(); e.data.key.fromMe = true;
  const request = headers => new Request('https://clinic/api/webhooks/whatsapp', { method: 'POST', headers, body: JSON.stringify(e) });
  assert.equal((await route.POST(request({}))).status, 401);
  const response = await route.POST(request({ 'x-acolher-webhook-token': 'test-secret' }));
  assert.equal(response.status, 200); assert.equal((await response.json()).ignored, true);
});
