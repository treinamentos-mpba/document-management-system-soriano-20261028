// Configuração central do backend (12-Factor: valores vêm de variáveis de
// ambiente, com padrões adequados ao desenvolvimento local).

const path = require('path');

// Diretório de gravação dos arquivos enviados (padrão: backend/storage).
const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, '..', 'storage');

// Tamanho máximo de upload em bytes (padrão: 10 MB).
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Tipos de arquivo permitidos: extensão -> MIME types aceitos.
const ALLOWED_FILE_TYPES = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  '.txt': ['text/plain'],
  '.csv': ['text/csv'],
};

module.exports = {
  STORAGE_DIR,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES,
};
