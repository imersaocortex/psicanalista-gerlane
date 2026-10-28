import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const fileId = '11111111-1111-4111-8111-111111111111';
const patientId = '22222222-2222-4222-8222-222222222222';
const file = { id: fileId, bucket: 'clinica_documentos', path: patientId + '/document.pdf', name: 'document.pdf' };
const record = { paciente_id: patientId, arquivos: [file] };
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function loadRoute(db, { denied = false } = {}) {
  let source = await readFile(new URL('../src/app/api/documents/route.js', import.meta.url), 'utf8');
  const id = crypto.randomUUID();
  const registry = globalThis.__documentRouteTests ||= {};
  registry[id] = {
    NextResponse: { redirect(url) { return new Response(null, { status: 307, headers: { Location: url } }); } },
    HttpError,
    apiError(error) { return Response.json({ error: error.message }, { status: error.status || 500 }); },
    async requireUser() {
      if (denied) throw new HttpError(401, 'Entre na sua conta para continuar.');
      return { supabase: db };
    }
  };
  source = source
    .replace("import { NextResponse } from 'next/server';", '')
    .replace("import { apiError, HttpError, requireUser } from '@/lib/server/security';",
      'const { NextResponse, apiError, HttpError, requireUser } = globalThis.__documentRouteTests[' + JSON.stringify(id) + '];');
  assert.doesNotMatch(source, /from ['"]@\//);
  return import('data:text/javascript;base64,' + Buffer.from(source + '\n//' + id).toString('base64'));
}

function database({ data = record, error = null, signError = null } = {}) {
  const calls = { queries: 0, signed: [] };
  return {
    calls,
    from(table) {
      calls.queries++;
      assert.equal(table, 'anamneses');
      return {
        select() { return this; },
        contains(column, value) {
          assert.equal(column, 'arquivos');
          assert.equal(typeof value, 'string');
          assert.deepEqual(JSON.parse(value), [{ id: fileId }]);
          return this;
        },
        async maybeSingle() { return { data, error }; }
      };
    },
    storage: { from(bucket) { return {
      async createSignedUrl(path, expiry, options) {
        calls.signed.push({ bucket, path, expiry, options });
        return { data: signError ? null : { signedUrl: 'https://storage.example/private?token=temporary' }, error: signError };
      }
    }; } }
  };
}
const request = (id = fileId) => new Request('https://clinic.example/api/documents?file=' + encodeURIComponent(id));

test('actual Supabase SDK sends JSONB array syntax and the route signs a private download', async () => {
  let requested;
  const client = createClient('https://database.example', 'test-publishable-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async url => {
      requested = new URL(url);
      return new Response(JSON.stringify([record]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } }
  });
  const storage = database();
  const db = { from: client.from.bind(client), storage: storage.storage };
  const route = await loadRoute(db);
  const response = await route.GET(request());
  assert.equal(requested.searchParams.get('arquivos'), 'cs.' + JSON.stringify([{ id: fileId }]));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('Location'), 'https://storage.example/private?token=temporary');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.deepEqual(storage.calls.signed, [{ bucket: 'clinica_documentos', path: file.path, expiry: 60, options: { download: file.name } }]);
});

test('unauthenticated download is rejected before querying or signing', async () => {
  const db = database();
  const route = await loadRoute(db, { denied: true });
  assert.equal((await route.GET(request())).status, 401);
  assert.equal(db.calls.queries, 0);
  assert.equal(db.calls.signed.length, 0);
});

test('invalid or missing file identifiers never reach the database', async () => {
  const db = database(), route = await loadRoute(db);
  for (const id of ['', '../secret', 'a'.repeat(65)]) assert.equal((await route.GET(request(id))).status, 400);
  assert.equal(db.calls.queries, 0);
});

test('missing or RLS-invisible attachment returns 404 without a storage request', async () => {
  const db = database({ data: null }), route = await loadRoute(db);
  const response = await route.GET(request());
  assert.equal(response.status, 404);
  assert.equal(db.calls.signed.length, 0);
});

test('database errors are no longer incorrectly reported as a missing document', async () => {
  const db = database({ data: null, error: { code: '22P02', message: 'private backend diagnostic' } });
  const route = await loadRoute(db), response = await route.GET(request());
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private backend diagnostic|22P02/);
  assert.equal(db.calls.signed.length, 0);
});

test('files outside the patient folder, public buckets and malformed metadata are never signed', async () => {
  for (const arquivo of [
    { ...file, bucket: 'clinica_media' },
    { ...file, path: 'other-patient/document.pdf' },
    { ...file, path: patientId + '/../document.pdf' },
    { ...file, path: null }
  ]) {
    const db = database({ data: { ...record, arquivos: [arquivo] } }), route = await loadRoute(db);
    assert.equal((await route.GET(request())).status, 409);
    assert.equal(db.calls.signed.length, 0);
  }
});

test('storage signing failure returns 503 without redirecting to an arbitrary URL', async () => {
  const db = database({ signError: { message: 'private storage diagnostic' } }), route = await loadRoute(db);
  const response = await route.GET(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Location'), null);
  assert.doesNotMatch(await response.text(), /private storage diagnostic/);
});
