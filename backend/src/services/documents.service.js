// Regras de negócio do recurso de documentos: criação dos metadados,
// listagem filtrada por dono e verificação de posse no download.

const path = require('path');
const documentsRepository = require('../repositories/documents.repository');

// Cria um erro de domínio com código padronizado para a camada HTTP mapear.
function createDomainError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Remove o campo interno storedName antes de expor os metadados na API.
function toPublicDocument(document) {
  const { storedName, ...publicDocument } = document;
  return publicDocument;
}

// Registra os metadados de um arquivo recém-enviado, associado ao owner.
// O id do documento é o nome base do arquivo gerado pelo servidor (UUID).
function createDocument(file, owner) {
  const document = documentsRepository.save({
    id: path.parse(file.filename).name,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
  });

  return toPublicDocument(document);
}

// Lista os documentos pertencentes ao usuário informado.
function listDocuments(owner) {
  return documentsRepository.listByOwner(owner).map(toPublicDocument);
}

// Localiza um documento para download, garantindo que o solicitante é o dono.
// Documentos inexistentes ou de outros usuários resultam em DOCUMENT_NOT_FOUND
// (404), para não revelar a existência de documentos alheios.
function getDocumentForDownload(id, owner) {
  const document = documentsRepository.findById(id);

  if (!document || document.owner !== owner) {
    throw createDomainError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return {
    document: toPublicDocument(document),
    filePath: documentsRepository.resolveFilePath(document),
  };
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentForDownload,
};
