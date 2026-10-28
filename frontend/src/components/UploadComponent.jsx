import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentsApi';

// Formulário de envio de documentos: seleciona um arquivo, envia para o
// backend e notifica o componente pai após o sucesso.
export default function UploadComponent({ userId, onUploaded }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(event) {
    setSelectedFile(event.target.files[0] ?? null);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError('Selecione um arquivo antes de enviar.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const document = await uploadDocument(selectedFile, userId);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploaded?.(document);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section>
      <h2>Enviar documento</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button type="submit" disabled={uploading || !selectedFile}>
          {uploading ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </section>
  );
}
