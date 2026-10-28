const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const storageDir = require('node:fs').mkdtempSync(
  path.join(os.tmpdir(), 'dms-api-test-')
);
process.env.STORAGE_DIR = storageDir;

const app = require('../src/app');

const ownerId = 'integration-user';
const fileContents = 'Conteúdo de teste do documento.';
let server;
let baseUrl;
let uploadedDocument;

describe('endpoints de documentos', () => {
  before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await fs.rm(storageDir, { recursive: true, force: true });
  });

  test('POST /upload armazena o arquivo e retorna seus metadados', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([fileContents], { type: 'text/plain' }),
      'documento.txt'
    );

    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'x-user-id': ownerId },
      body: formData,
    });

    assert.equal(response.status, 201);
    uploadedDocument = await response.json();

    assert.match(uploadedDocument.id, /^[0-9a-f-]{36}$/);
    assert.equal(uploadedDocument.originalName, 'documento.txt');
    assert.equal(uploadedDocument.size, Buffer.byteLength(fileContents));
    assert.equal(uploadedDocument.mimeType, 'text/plain');
    assert.equal(uploadedDocument.owner, ownerId);
    assert.ok(uploadedDocument.uploadedAt);
    assert.equal('storedName' in uploadedDocument, false);
  });

  test('GET /documents lista somente os documentos do usuário', async () => {
    const response = await fetch(`${baseUrl}/documents`, {
      headers: { 'x-user-id': ownerId },
    });

    assert.equal(response.status, 200);
    const documents = await response.json();
    assert.deepEqual(
      documents.map((document) => document.id),
      [uploadedDocument.id]
    );

    const otherOwnerResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'x-user-id': 'outro-usuario' },
    });
    assert.deepEqual(await otherOwnerResponse.json(), []);
  });

  test('GET /documents/:id/download retorna o arquivo enviado', async () => {
    const response = await fetch(
      `${baseUrl}/documents/${uploadedDocument.id}/download`,
      { headers: { 'x-user-id': ownerId } }
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain');
    assert.match(
      response.headers.get('content-disposition'),
      /attachment; filename="documento\.txt"/
    );
    assert.equal(await response.text(), fileContents);
  });
});
