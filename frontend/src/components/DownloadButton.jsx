import { useState } from 'react';
import { downloadDocument } from '../services/documentsApi';

// Botão de download: busca o arquivo via fetch (necessário para enviar o
// header x-user-id) e dispara o download pelo navegador.
export default function DownloadButton({ documentId, fileName, userId }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);

    try {
      const { blob, fileName: resolvedName } = await downloadDocument(
        documentId,
        userId,
        fileName
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolvedName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Falha ao baixar o documento: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button type="button" onClick={handleDownload} disabled={downloading}>
      {downloading ? 'Baixando…' : 'Baixar'}
    </button>
  );
}
