const fs = require('fs');
const path = require('path');
const { ALLOWED_FILE_TYPES } = require('../config');

const SIGNATURES = {
  '.pdf': Buffer.from('%PDF-'),
  '.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  '.jpg': Buffer.from([0xff, 0xd8, 0xff]),
  '.jpeg': Buffer.from([0xff, 0xd8, 0xff]),
};

function invalidFile() {
  const error = new Error('O conteúdo do arquivo não corresponde ao tipo declarado.');
  error.code = 'INVALID_FILE_CONTENT';
  return error;
}

async function validateTextFile(filePath) {
  const decoder = new TextDecoder('utf-8', { fatal: true });

  try {
    for await (const chunk of fs.createReadStream(filePath)) {
      if (chunk.includes(0)) {
        throw invalidFile();
      }
      decoder.decode(chunk, { stream: true });
    }
    decoder.decode();
  } catch (error) {
    if (error.code === 'INVALID_FILE_CONTENT') {
      throw error;
    }
    if (error instanceof TypeError) {
      throw invalidFile();
    }
    throw error;
  }
}

async function hasOfficeEntries(filePath, extension) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const { size } = await handle.stat();
    const tailLength = Math.min(size, 65_557);
    const tail = Buffer.alloc(tailLength);
    const { bytesRead } = await handle.read(tail, 0, tailLength, size - tailLength);

    let eocdOffset = -1;
    for (let index = bytesRead - 22; index >= 0; index -= 1) {
      if (tail.readUInt32LE(index) === 0x06054b50) {
        eocdOffset = index;
        break;
      }
    }
    if (eocdOffset < 0) {
      return false;
    }

    const diskNumber = tail.readUInt16LE(eocdOffset + 4);
    const centralDirectoryDisk = tail.readUInt16LE(eocdOffset + 6);
    const entriesOnDisk = tail.readUInt16LE(eocdOffset + 8);
    const entryCount = tail.readUInt16LE(eocdOffset + 10);
    const directorySize = tail.readUInt32LE(eocdOffset + 12);
    const directoryOffset = tail.readUInt32LE(eocdOffset + 16);
    const commentLength = tail.readUInt16LE(eocdOffset + 20);
    const eocdPosition = size - tailLength + eocdOffset;

    if (
      diskNumber !== 0 ||
      centralDirectoryDisk !== 0 ||
      entriesOnDisk !== entryCount ||
      entryCount === 0xffff ||
      directorySize === 0xffffffff ||
      directoryOffset === 0xffffffff ||
      eocdPosition + 22 + commentLength !== size ||
      directoryOffset + directorySize > eocdPosition
    ) {
      return false;
    }

    const directory = Buffer.alloc(directorySize);
    const result = await handle.read(directory, 0, directorySize, directoryOffset);
    if (result.bytesRead !== directorySize) {
      return false;
    }

    const names = new Set();
    let offset = 0;
    for (let entry = 0; entry < entryCount; entry += 1) {
      if (
        offset + 46 > directory.length ||
        directory.readUInt32LE(offset) !== 0x02014b50
      ) {
        return false;
      }

      const nameLength = directory.readUInt16LE(offset + 28);
      const extraLength = directory.readUInt16LE(offset + 30);
      const commentSize = directory.readUInt16LE(offset + 32);
      const entryLength = 46 + nameLength + extraLength + commentSize;
      if (offset + entryLength > directory.length) {
        return false;
      }

      names.add(directory.toString('utf8', offset + 46, offset + 46 + nameLength));
      offset += entryLength;
    }

    const requiredEntry =
      extension === '.docx' ? 'word/document.xml' : 'xl/workbook.xml';
    return (
      names.has('[Content_Types].xml') &&
      names.has(requiredEntry) &&
      offset === directory.length
    );
  } finally {
    await handle.close();
  }
}

async function validateUploadedFile(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const expectedMimeTypes = ALLOWED_FILE_TYPES[extension];
  if (!expectedMimeTypes || !expectedMimeTypes.includes(file.mimetype)) {
    throw invalidFile();
  }

  const signature = SIGNATURES[extension];
  if (signature) {
    const handle = await fs.promises.open(file.path, 'r');
    try {
      const buffer = Buffer.alloc(signature.length);
      const { bytesRead } = await handle.read(buffer, 0, signature.length, 0);
      if (bytesRead !== signature.length || !buffer.equals(signature)) {
        throw invalidFile();
      }
    } finally {
      await handle.close();
    }
    return;
  }

  if (extension === '.docx' || extension === '.xlsx') {
    if (!(await hasOfficeEntries(file.path, extension))) {
      throw invalidFile();
    }
    return;
  }

  await validateTextFile(file.path);
}

module.exports = { validateUploadedFile };
