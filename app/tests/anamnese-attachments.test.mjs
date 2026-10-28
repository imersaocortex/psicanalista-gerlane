import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { attachmentErrorMessage, validateDocument, uploadAnamneseAttachment, MAX_DOCUMENT_SIZE } from '../src/lib/anamnese-attachments.mjs';
const patient = 'b0959c5d-9567-4286-b61f-7a0ff84b31f1';
const document = 'cf9e6df9-9b6d-498f-bc9e-06d31fd08608';
const pdf = (type = '') => new File(['%PDF-1.7\nTest fixture, no clinical information'], 'exame.PDF', { type });
const signatures = { png: [137,80,78,71,13,10,26,10], jpeg: [255,216,255,224] };

test('valid PDF without MIME and generic JPEG MIME are accepted with canonical content types', async () => {
  for (const mime of ['', 'application/octet-stream', 'application/pdf']) assert.deepEqual(await validateDocument(pdf(mime)), { contentType: 'application/pdf', extension: 'pdf' });
  assert.deepEqual(await validateDocument(new File([new Uint8Array(signatures.jpeg)], 'foto.JPEG', { type: 'application/octet-stream' })), { contentType: 'image/jpeg', extension: 'jpg' });
  assert.deepEqual(await validateDocument(new File([new Uint8Array(signatures.png)], 'foto.png')), { contentType: 'image/png', extension: 'png' });
});
test('invalid content, empty files, unsupported formats and oversized files are rejected', async () => {
  for (const file of [new File([], 'empty.pdf'), new File(['not a pdf'], 'renamed.pdf', { type: 'application/pdf' }), new File(['%PDF-1.7'], 'exame.docx'), { size: MAX_DOCUMENT_SIZE + 1 }]) await assert.rejects(validateDocument(file));
});
test('exact 10 MB limit remains supported', async () => {
  const file = { size: MAX_DOCUMENT_SIZE, name: 'exame.pdf', slice: () => pdf().slice(0,8) };
  assert.equal((await validateDocument(file)).contentType, 'application/pdf');
});
test('upload stays private, uses patient folder and canonical MIME with no overwrite', async () => {
  const calls = [];
  const storage = { from(bucket) { assert.equal(bucket, 'clinica_documentos'); return { async upload(...args) { calls.push(args); return { error: null }; } }; } };
  const file = pdf();
  const result = await uploadAnamneseAttachment(storage, patient, file, () => document);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], `${patient}/${document}.pdf`);
  assert.equal(calls[0][1].type, 'application/pdf');
  assert.equal(await calls[0][1].text(), await file.text());
  assert.deepEqual(calls[0][2], { contentType: 'application/pdf', upsert: false });
  assert.equal(result.path, `${patient}/${document}.pdf`);
  assert.equal(result.id, document);
  assert.equal(result.name, file.name);
  assert.equal(result.type, 'application/pdf');
  assert.equal(result.bucket, 'clinica_documentos');
  assert.equal(result.url, undefined);
});
test('invalid patient or invalid document never reaches storage', async () => {
  const storage = { from() { assert.fail('Invalid upload reached storage'); } };
  await assert.rejects(uploadAnamneseAttachment(storage, '../another-patient', pdf()));
  await assert.rejects(uploadAnamneseAttachment(storage, patient, new File(['text'], 'bad.pdf')));
});
test('failed upload does not report successful attachment and can be retried', async () => {
  let attempts = 0;
  const error = { statusCode: '403', message: 'new row violates row-level security policy' };
  const storage = { from() { return { async upload() { return { error: ++attempts === 1 ? error : null }; } }; } };
  await assert.rejects(uploadAnamneseAttachment(storage, patient, pdf()), e => e === error);
  const retry = await uploadAnamneseAttachment(storage, patient, pdf(), () => document);
  assert.equal(retry.id, document);
  assert.equal(attempts, 2);
});
test('errors explain private bucket, permissions, expiry, limits, types and network failures without exposing paths', () => {
  for (const [error, expected] of [
    [{ message: 'Bucket not found' }, /armazenamento privado/],
    [{ statusCode: '403', message: 'private/path-secret.pdf' }, /permissões/],
    [{ message: 'new row violates row-level security policy' }, /permissões/],
    [{ statusCode: 401 }, /sessão expirou/],
    [{ statusCode: 413 }, /limite/],
    [{ message: 'mime type is not supported' }, /formato/],
    [new TypeError('Failed to fetch'), /conexão/],
    [new Error('Sensitive backend details'), /Não foi possível/],
  ]) { const message = attachmentErrorMessage(error); assert.match(message, expected); assert.doesNotMatch(message, /path-secret|Sensitive backend/); }
});

test('actual Supabase SDK sends canonical MIME in the multipart body, including empty/generic browser MIME', async () => {
  for (const browserMime of ['', 'application/octet-stream', 'application/pdf']) {
    let requests = 0;
    const client = createClient('https://storage-test.invalid', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (url, init) => {
        requests++;
        assert.equal(new URL(url).pathname, `/storage/v1/object/clinica_documentos/${patient}/${document}.pdf`);
        assert.equal(new Headers(init.headers).get('x-upsert'), 'false');
        assert.ok(init.body instanceof FormData);
        assert.equal(init.body.get('').type, 'application/pdf');
        assert.equal(await init.body.get('').text(), await pdf().text());
        return Response.json({ Id: document, Key: `clinica_documentos/${patient}/${document}.pdf` });
      } },
    });
    try {
      const result = await uploadAnamneseAttachment(client.storage, patient, pdf(browserMime), () => document);
      assert.equal(result.type, 'application/pdf');
      assert.equal(requests, 1);
    } finally { await client.auth.stopAutoRefresh(); }
  }
});
