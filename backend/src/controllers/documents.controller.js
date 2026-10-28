// Controller do recurso de documentos: trata entrada/saída HTTP, validação
// básica e mapeamento de erros para o formato JSON padronizado da API.

const documentsService = require('../services/documents.service');

const DEFAULT_OWNER = 'anonymous';

// Extrai o identificador do usuário do header x-user-id (padrão: anonymous).
function resolveOwner(req) {
  const userId = req.headers['x-user-id'];
  return typeof userId === 'string' && userId.trim() !== ''
    ? userId.trim()
    : DEFAULT_OWNER;
}

// Monta a resposta de erro padronizada da API.
function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

// POST /upload - recebe o arquivo (campo "file") e registra os metadados.
function uploadDocument(req, res) {
  if (!req.file) {
    return sendError(
      res,
      400,
      'FILE_REQUIRED',
      'Nenhum arquivo enviado. Utilize o campo "file".'
    );
  }

  const document = documentsService.createDocument(req.file, resolveOwner(req));
  res.status(201).json(document);
}

// GET /documents - lista os documentos do usuário da requisição.
function listDocuments(req, res) {
  res.json(documentsService.listDocuments(resolveOwner(req)));
}

// GET /documents/:id/download - envia o conteúdo binário do documento.
function downloadDocument(req, res) {
  const { document, filePath } = documentsService.getDocumentForDownload(
    req.params.id,
    resolveOwner(req)
  );

  const safeFileName = document.originalName.replace(/"/g, "'");

  res.sendFile(
    filePath,
    {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
      },
    },
    (err) => {
      if (err && !res.headersSent) {
        // Arquivo ausente no disco: trata como documento não encontrado.
        sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      }
    }
  );
}

// Middleware de erro das rotas de documentos: converte erros do multer e do
// domínio em respostas JSON padronizadas.
function handleError(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(
      res,
      413,
      'FILE_TOO_LARGE',
      'O arquivo excede o tamanho máximo permitido.'
    );
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return sendError(res, 400, 'INVALID_FILE_TYPE', err.message);
  }

  if (err.code === 'DOCUMENT_NOT_FOUND') {
    return sendError(res, 404, 'DOCUMENT_NOT_FOUND', err.message);
  }

  console.error('Erro inesperado ao processar a requisição:', err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno do servidor.');
}

module.exports = {
  uploadDocument,
  listDocuments,
  downloadDocument,
  handleError,
};
