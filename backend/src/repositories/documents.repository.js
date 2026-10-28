// Repositório de documentos: metadados em memória (Map indexado por id) e
// resolução do caminho físico dos arquivos gravados em STORAGE_DIR.
//
// Nesta fase os metadados são perdidos ao reiniciar o servidor (RNF-02).

const path = require('path');
const { STORAGE_DIR } = require('../config');

const documentsById = new Map();

// Grava os metadados de um documento e o retorna.
function save(document) {
  documentsById.set(document.id, document);
  return document;
}

// Busca um documento pelo id. Retorna undefined se não existir.
function findById(id) {
  return documentsById.get(id);
}

// Lista os documentos pertencentes ao usuário informado.
function listByOwner(owner) {
  return Array.from(documentsById.values()).filter(
    (document) => document.owner === owner
  );
}

// Resolve o caminho absoluto do arquivo físico de um documento.
// Usa apenas o storedName gerado pelo servidor, evitando path traversal.
function resolveFilePath(document) {
  return path.join(STORAGE_DIR, path.basename(document.storedName));
}

module.exports = {
  save,
  findById,
  listByOwner,
  resolveFilePath,
};
