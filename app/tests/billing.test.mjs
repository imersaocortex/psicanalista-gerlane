import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { clinicDate, clinicSlot, providerEvent, checkoutUrl } from '../src/lib/billing.mjs';
import { configValue } from '../src/lib/config.mjs';

const root = new URL('../', import.meta.url);
const registry = globalThis.__billingTestModules = {};
async function moduleWithMocks(path, dependencies) {
  let source = (await readFile(new URL(path, root), 'utf8')).replace("import 'server-only';", '');
  for (const [specifier, value] of Object.entries(dependencies)) {
    const id = crypto.randomUUID(); registry[id] = value;
    const mock = `const value=globalThis.__billingTestModules[${JSON.stringify(id)}];\n` + Object.keys(value).map(name => `export const ${name}=value.${name};`).join('\n');
    source = source.replaceAll(`'${specifier}'`, JSON.stringify('data:text/javascript;base64,' + Buffer.from(mock).toString('base64')));
  }
  source = source.replaceAll("'../billing.mjs'", JSON.stringify(new URL('src/lib/billing.mjs', root).href));
  // Every production alias must be supplied explicitly; never call a real service.
  assert.doesNotMatch(source, /from ['"]@\//);
  return import('data:text/javascript;base64,' + Buffer.from(source + '\n//' + crypto.randomUUID()).toString('base64'));
}
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const apiError = error => Response.json({ error: error.message }, { status: error.status || 500 });
const id = 'b0959c5d-9567-4286-b61f-7a0ff84b31f1';
const post = body => new Request('https://app.example/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const security = (db, extra = {}) => ({ HttpError, apiError, requireUser: async () => ({ user: { id: 'owner' }, profile: { tipo: 'paciente' }, supabase: db }), readBody: r => r.json(), rateLimit() {}, isUuid: v => typeof v === 'string' && /^[\da-f-]{36}$/.test(v), serviceClient: () => db, ...extra });
const next = { NextResponse: { json: (...args) => Response.json(...args) } };

test('clinic slots use Sao Paulo even when a browser uses a different timezone', () => {
  assert.equal(clinicSlot('2026-10-28', '09:00'), '2026-10-28T12:00:00.000Z');
  assert.equal(clinicDate('2026-10-29T01:30:00Z'), '2026-10-28');
  for (const [date,time] of [['2026-02-30','09:00'],['2026-10-28','24:00'],['invalid','10:00']]) assert.throws(() => clinicSlot(date,time));
});
test('only actual payment states release booking; Pix under analysis stays blocked', () => {
  for (const status of ['PENDING','AUTHORIZED','AWAITING_RISK_ANALYSIS','CONFIRMED']) assert.equal(providerEvent({ status, billingType: 'PIX' }), 'PAYMENT_PENDING');
  assert.equal(providerEvent({ status: 'RECEIVED', billingType: 'PIX' }), 'PAYMENT_RECEIVED');
  assert.equal(providerEvent({ status: 'CONFIRMED', billingType: 'CREDIT_CARD' }), 'PAYMENT_CONFIRMED');
  for (const status of ['REFUNDED','REFUND_REQUESTED','CHARGEBACK_REQUESTED']) assert.equal(providerEvent({ status }), 'PAYMENT_REVOKED');
  assert.equal(providerEvent({ deleted: true, status: 'RECEIVED' }), 'PAYMENT_REVOKED');
  assert.equal(providerEvent({ status: 'RECEIVED', refunds:[{status:'DONE',value:50}] }), 'PAYMENT_REVOKED');
});
test('checkout redirects remain on the gateway and correct environment', () => {
  assert.equal(checkoutUrl('https://www.asaas.com/i/test','production'), 'https://www.asaas.com/i/test');
  for (const value of ['https://evil.example/i/test','javascript:alert(1)','https://asaas.com.evil.example','https://sandbox.asaas.com/i/test']) assert.equal(checkoutUrl(value,'production'), null);
});
test('legacy settings decode repeatedly without changing new values', () => {
  for (const value of ['production',250,['09:00'],{ a: 1 }]) {
    assert.deepEqual(configValue(value),value);
    assert.deepEqual(configValue(JSON.stringify(JSON.stringify(value))),value);
  }
});

async function appointmentRoute(rpc) {
  return moduleWithMocks('src/app/api/appointments/route.js', { 'next/server': next, '@/lib/server/security': security({ rpc }), '@/lib/billing.mjs': { clinicSlot } });
}
test('booking sends only the authenticated patient request to the atomic database operation', async () => {
  const calls=[]; const route = await appointmentRoute(async (...args) => { calls.push(args); return { data: 'session-id' }; });
  const response = await route.POST(post({ date: '2099-10-28',time:'09:00',modality:'online',paciente_id:'victim',status:'confirmada',paymentStatus:'pago' }));
  assert.equal(response.status,201); assert.equal(calls.length,1);
  assert.deepEqual(calls[0],['acolher_book_session',{ p_date: clinicSlot('2099-10-28','09:00'), p_modality:'online' }]);
});
test('no paid balance, occupied slot and missing migration fail closed', async () => {
  for (const [code,expected] of [['22023',409],['42501',409],['PGRST202',503]]) {
    const route = await appointmentRoute(async () => ({ error: { code,message:'Booking blocked' } }));
    assert.equal((await route.POST(post({ date:'2099-10-28',time:'09:00',modality:'online' }))).status,expected);
  }
});
test('invalid or elapsed appointment never reaches the database', async () => {
  const route = await appointmentRoute(async () => { assert.fail('Invalid booking reached database'); });
  for (const body of [{date:'2000-01-01',time:'09:00',modality:'online'},{date:'2099-02-30',time:'09:00',modality:'online'},{date:'2099-01-01',time:'09:00',modality:'invalid'}]) assert.equal((await route.POST(post(body))).status,400);
});

async function checkoutRoute(changes = {}) {
  const payment = { id,paciente_id:'patient',status:'processando',valor:250,sessoes_contratadas:1,gateway_id:'pay_demo',pacientes:{ user_id:'owner' },...changes };
  const calls=[];
  const query = { select(){return this;}, eq(){return this;}, single:async()=>({data:payment}) };
  const db = { from:()=>query };
  const charge = { id:'pay_demo',status:'PENDING',invoiceUrl:'https://www.asaas.com/i/demo' };
  const asaas = { environment:'production', safeUrl:v=>checkoutUrl(v,'production'), request:async(path,body)=>{calls.push({path,body}); assert.equal(body,undefined,'Existing invoice must never be created twice'); return path.endsWith('/pixQrCode') ? {payload:'pix-demo',encodedImage:'AA==',expirationDate:'2099-01-01'} : charge;} };
  const route = await moduleWithMocks('src/app/api/payments/asaas/route.js', { 'next/server':next, '@/lib/server/security':security(db), '@/lib/server/subscriptions':{assertNoActiveSubscription:()=>assert.fail('Existing invoice recreated')}, '@/lib/server/asaas':{asaasClient:async()=>asaas,reconcileCharge:async()=>({charge,event:'PAYMENT_PENDING'})}, '@/lib/billing.mjs':{ PAYABLE_STATUSES:['pendente','processando','vencido'] } });
  return {route,calls};
}
test('pending, processing and overdue invoices offer Pix and reuse the same gateway charge', async () => {
  for (const status of ['pendente','processando','vencido']) {
    const {route,calls}=await checkoutRoute({status});
    for(let attempt=0;attempt<2;attempt++) {
      const response=await route.POST(post({paymentId:id,billingType:'PIX'}));
      assert.equal(response.status,200); assert.equal((await response.json()).pix.payload,'pix-demo');
    }
    assert.equal(calls.filter(c=>c.path.endsWith('/pixQrCode')).length,2);
    assert.ok(calls.every(c=>!c.body));
  }
});
test('other patient invoices, paid/cancelled invoices and missing credit configuration are rejected', async () => {
  for (const [changes,status] of [[{pacientes:{user_id:'victim'}},404],[{status:'pago'},409],[{status:'cancelado'},409],[{sessoes_contratadas:undefined},503]]) {
    const {route,calls}=await checkoutRoute(changes);
    assert.equal((await route.POST(post({paymentId:id,billingType:'PIX'}))).status,status); assert.equal(calls.length,0);
  }
});
test('a client cannot choose an unsupported gateway operation', async () => {
  const {route,calls}=await checkoutRoute();
  assert.equal((await route.POST(post({paymentId:id,billingType:'RECEIVE_IN_CASH'}))).status,400); assert.equal(calls.length,0);
});

test('reconciliation asks the provider for current state before applying a refund', async () => {
  const { reconcileCharge } = await moduleWithMocks('src/lib/server/asaas.js', { './security':{ HttpError,systemConfig:async()=>({}) } });
  const calls=[];
  const actual = { id:'pay_demo',status:'REFUNDED',externalReference:id,value:250,billingType:'PIX' };
  await reconcileCharge({ rpc:async(...args)=>{calls.push(args);return{};} }, { request:async path=>{assert.equal(path,'/payments/pay_demo');return actual;} }, 'pay_demo');
  assert.equal(calls[0][0],'process_asaas_event');
  assert.equal(calls[0][1].event_type,'PAYMENT_REVOKED');
  assert.equal(calls[0][1].payment_data,actual);
});
