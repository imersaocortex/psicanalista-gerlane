import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error('Execute estes testes somente contra um servidor local.');
const request = (path, options = {}) => fetch(base + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(30000) });
const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('app identity is Acolher; the public site keeps the professional identity', async () => {
 const manifest = await (await request('/manifest.json')).json();
 assert.equal(manifest.name, 'Acolher'); assert.equal(manifest.description, 'Seu bem-estar em um só lugar');
 const home = await (await request('/')).text();
 assert.match(home, /<title>Dra\. Gerlane Albuquerque/);
 assert.doesNotMatch(home, /Pacientes atendidos|Relatos de Transforma/);
 const login = await (await request('/login')).text();
 assert.match(login, /Acolher/); assert.match(login, /Seu bem-estar em um só lugar/);
});
test('anonymous requests cannot access either dashboard', async () => {
 for (const path of ['/dashboard/admin','/dashboard/paciente']) {
  const r = await request(path); assert.ok([302,303,307,308].includes(r.status)); assert.match(r.headers.get('location'), /\/login/);
 }
});
test('anonymous requests cannot send notifications, open documents or create payments', async () => {
 for (const path of ['/api/notifications','/api/payments/asaas','/api/payments/plan','/api/payments/status','/api/payments/config','/api/appointments']) {
  const r = await request(path, post({})); assert.equal(r.status,401);
 }
 assert.equal((await request('/api/documents?file=example-file')).status,401);
 assert.equal((await request('/api/payments/config')).status,401);
});
test('cron and webhook fail closed without their configured secrets', async () => {
 const cron = await request('/api/cron/reminders');
 assert.ok([401,503].includes(cron.status));
 const webhook = await request('/api/webhooks/asaas', post({ event: 'PAYMENT_RECEIVED' }));
 assert.ok([401,503].includes(webhook.status));
});
test('registration validates input before making any auth request', async () => {
 for (const body of [{},{nome:'Ana',email:'invalid',password:'abcdefgh',acceptedPrivacy:true},{nome:'Ana Silva',email:'example@example.com',password:'123',acceptedPrivacy:true},{nome:'Ana Silva',email:'example@example.com',password:'abcdefgh',acceptedPrivacy:false}]) {
  const r = await request('/api/auth/register',post(body)); assert.equal(r.status,400);
 }
});
test('registration rejects cross-origin requests and malformed JSON', async () => {
 const r = await request('/api/auth/register',{...post({}),headers:{'Content-Type':'application/json',Origin:'https://example.invalid'}}); assert.equal(r.status,403);
 const malformed = await request('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}); assert.equal(malformed.status,400);
});
test('PWA assets exist and sensitive responses are never configured for offline caching', async () => {
 for (const file of ['/images/acolher-192.png','/images/acolher-512.png','/offline.html']) assert.equal((await request(file)).status,200);
 const worker = await (await request('/sw.js')).text();
 assert.doesNotMatch(worker,/cache\.put\(/); assert.doesNotMatch(worker,/addAll\(\[\s*['"]\/login/);
});
