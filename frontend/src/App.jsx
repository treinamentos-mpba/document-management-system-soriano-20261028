import { useCallback, useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent';
import DocumentList from './components/DocumentList';
import { listDocuments } from './services/documentsApi';

// Componente raiz: mantém o estado central (usuário, lista de documentos,
// carregamento e erro) e integra upload, listagem e download.
export default function App() {
  const [userId, setUserId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Carrega a lista de documentos do usuário atual.
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setDocuments(await listDocuments(userId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Recarrega a lista ao montar e sempre que o usuário mudar.
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '48rem' }}>
      <h1>Document Management System</h1>

      <section>
        <label>
          Identificador do usuário:{' '}
          <input
            type="text"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="anonymous"
          />
        </label>
      </section>

      <UploadComponent userId={userId} onUploaded={loadDocuments} />

      <section>
        <h2>Documentos</h2>
        <DocumentList
          documents={documents}
          userId={userId}
          loading={loading}
          error={error}
        />
      </section>
    </main>
  );
}
