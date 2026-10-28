// Cliente da API de documentos: concentra toda a comunicação com o backend
// via fetch, usando o prefixo /api (proxy configurado no Vite).

const API_PREFIX = '/api';

// Monta os headers comuns das requisições, incluindo o identificador do
// usuário (x-user-id) quando informado.
function buildHeaders(userId) {
  const headers = {};
  if (typeof userId === 'string' && userId.trim() !== '') {
    headers['x-user-id'] = userId.trim();
  }
  return headers;
}

// Extrai a mensagem de erro padronizada da API ({ error: { message } }) e a
// converte em um Error com mensagem amigável.
async function toApiError(response) {
  let message = 'Erro ao comunicar com o servidor.';
  try {
    const body = await response.json();
    if (body?.error?.message) {
      message = body.error.message;
    }
  } catch {
    // Resposta sem corpo JSON: mantém a mensagem padrão.
  }
  return new Error(message);
}

// Envia um documento (POST /api/upload) e retorna os metadados criados.
export async function uploadDocument(file, userId) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    headers: buildHeaders(userId),
    body: formData,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response.json();
}

// Lista os documentos do usuário (GET /api/documents).
export async function listDocuments(userId) {
  const response = await fetch(`${API_PREFIX}/documents`, {
    headers: buildHeaders(userId),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response.json();
}

// Extrai o nome do arquivo do header Content-Disposition, com fallback.
function parseFileName(response, fallbackName) {
  const contentDisposition = response.headers.get('Content-Disposition') || '';
  const match = contentDisposition.match(/filename="([^"]+)"/);
  return match ? match[1] : fallbackName;
}

// Baixa o conteúdo de um documento (GET /api/documents/:id/download) e
// retorna { blob, fileName } para o chamador disparar o download.
export async function downloadDocument(id, userId, fallbackName = 'documento') {
  const response = await fetch(
    `${API_PREFIX}/documents/${encodeURIComponent(id)}/download`,
    { headers: buildHeaders(userId) }
  );

  if (!response.ok) {
    throw await toApiError(response);
  }

  return {
    blob: await response.blob(),
    fileName: parseFileName(response, fallbackName),
  };
}
