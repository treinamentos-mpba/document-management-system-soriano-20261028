// Rotas do recurso de documentos: definem os endpoints, configuram o multer
// (diskStorage em STORAGE_DIR) e delegam o processamento ao controller.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const documentsController = require('../controllers/documents.controller');
const {
  STORAGE_DIR,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES,
} = require('../config');

// Garante a existência do diretório de armazenamento local.
fs.mkdirSync(STORAGE_DIR, { recursive: true });

// Nome físico gerado pelo servidor (UUID + extensão original), evitando
// colisões e path traversal a partir do nome enviado pelo usuário.
const storage = multer.diskStorage({
  destination: STORAGE_DIR,
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

// Aceita apenas os tipos de arquivo permitidos (extensão + MIME type).
function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = ALLOWED_FILE_TYPES[extension];

  if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error('Tipo de arquivo não permitido.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

const router = express.Router();

router.post('/upload', upload.single('file'), documentsController.uploadDocument);
router.get('/documents', documentsController.listDocuments);
router.get('/documents/:id/download', documentsController.downloadDocument);

// Mapeia erros do multer e do domínio para respostas JSON padronizadas.
router.use(documentsController.handleError);

module.exports = router;
