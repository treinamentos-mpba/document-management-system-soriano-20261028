import DownloadButton from './DownloadButton';

// Formata o tamanho do arquivo em unidade legível (B, KB ou MB).
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Formata a data de envio no padrão pt-BR.
function formatUploadDate(isoDate) {
  return new Date(isoDate).toLocaleString('pt-BR');
}

// Lista de documentos: componente de apresentação que exibe a tabela com os
// metadados e o botão de download de cada documento.
export default function DocumentList({ documents, userId, loading, error }) {
  if (loading) {
    return <p>Carregando documentos…</p>;
  }

  if (error) {
    return <p style={{ color: 'crimson' }}>{error}</p>;
  }

  if (documents.length === 0) {
    return <p>Nenhum documento enviado ainda.</p>;
  }

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th style={cellStyle}>Nome</th>
          <th style={cellStyle}>Tamanho</th>
          <th style={cellStyle}>Enviado em</th>
          <th style={cellStyle}>Ações</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id}>
            <td style={cellStyle}>{doc.originalName}</td>
            <td style={cellStyle}>{formatFileSize(doc.size)}</td>
            <td style={cellStyle}>{formatUploadDate(doc.uploadedAt)}</td>
            <td style={cellStyle}>
              <DownloadButton
                documentId={doc.id}
                fileName={doc.originalName}
                userId={userId}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const cellStyle = {
  border: '1px solid #ccc',
  padding: '0.5rem',
  textAlign: 'left',
};
