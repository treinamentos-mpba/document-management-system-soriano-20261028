# Especificação - Document Management System

> Especificação gerada a partir de [spec-template.md](./spec-template.md) para
> orientar o desenvolvimento guiado por especificação (Spec Driven Development).

## 1. Objetivo

Disponibilizar um sistema web simples que permita a cada usuário enviar,
listar e baixar seus próprios documentos, com arquivos gravados no filesystem
local da aplicação e metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário (cada usuário vê e baixa apenas seus documentos)

### Fora do escopo

- Armazenamento externo ou em nuvem
- Versionamento de documentos
- Autenticação/autorização reais (a identidade é informada por header, sem
  verificação nesta fase)
- Exclusão e edição de documentos
- Persistência de metadados em banco de dados

## 3. Requisitos funcionais

| ID    | Requisito                                                                                   |
| ----- | ------------------------------------------------------------------------------------------- |
| RF-01 | O usuário pode enviar um documento via `multipart/form-data` (campo `file`)                 |
| RF-02 | O usuário pode listar os documentos enviados por ele (filtrados pelo seu identificador)     |
| RF-03 | O usuário pode baixar um documento pelo identificador, desde que seja o dono do documento   |
| RF-04 | Todo documento é associado ao usuário informado no header `x-user-id` (padrão `anonymous`)  |
| RF-05 | O sistema rejeita uploads de tipos de arquivo não permitidos (ver RNF e contratos de API)   |
| RF-06 | O sistema rejeita uploads que excedam o tamanho máximo configurado                          |

## 4. Requisitos não funcionais

| ID     | Requisito                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Arquivos gravados no filesystem local da aplicação (`backend/storage`) via `multer` com `diskStorage`           |
| RNF-02 | Metadados dos documentos mantidos em memória nesta fase (perdidos ao reiniciar o servidor)                      |
| RNF-03 | Configuração via variáveis de ambiente (12-Factor): `PORT`, `STORAGE_DIR`, `MAX_FILE_SIZE_MB`                   |
| RNF-04 | Backend em Clean Architecture simples: `routes -> controllers -> services -> repositories`                      |
| RNF-05 | Erros tratados nos limites do sistema (entrada HTTP, leitura/escrita de arquivos) com respostas JSON padronizadas |
| RNF-06 | Nome do arquivo em disco gerado pelo servidor (id único + extensão), evitando colisões e path traversal         |

### Variáveis de ambiente

| Variável           | Padrão            | Descrição                               |
| ------------------ | ----------------- | ---------------------------------------- |
| `PORT`             | `3000`            | Porta HTTP do backend                    |
| `STORAGE_DIR`      | `backend/storage` | Diretório de gravação dos arquivos       |
| `MAX_FILE_SIZE_MB` | `10`              | Tamanho máximo de upload, em megabytes   |

### Tipos de arquivo permitidos

| Categoria | Extensões      | MIME types                                                                                                              |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PDF       | `.pdf`         | `application/pdf`                                                                                                        |
| Imagens   | `.png`, `.jpg`, `.jpeg` | `image/png`, `image/jpeg`                                                                                       |
| Office    | `.docx`, `.xlsx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Texto     | `.txt`, `.csv` | `text/plain`, `text/csv`                                                                                                 |

## 5. Modelo de dados (metadados do documento)

Entidade `Document`, mantida em um repositório em memória (`Map` indexado por `id`):

| Campo        | Tipo   | Descrição                                            |
| ------------ | ------ | ----------------------------------------------------- |
| id           | string | Identificador único do documento (UUID)               |
| originalName | string | Nome original do arquivo enviado                      |
| storedName   | string | Nome físico do arquivo em disco (`id` + extensão)     |
| mimeType     | string | Tipo MIME do arquivo enviado                          |
| size         | number | Tamanho em bytes                                      |
| uploadedAt   | string | Data/hora do upload (ISO 8601)                        |
| owner        | string | Identificador do usuário dono (header `x-user-id`)    |

> O campo `storedName` é detalhe interno de persistência e não é exposto nas
> respostas da API.

## 6. Contratos de API

Convenções gerais:

- **Identificação do usuário:** toda requisição pode enviar o header
  `x-user-id`. Quando ausente, o valor `anonymous` é assumido.
- **Prefixo no frontend:** o frontend consome a API via `/api` (o proxy do
  Vite reescreve `/api/upload` para `/upload` no backend).
- **Formato de erro padronizado:**

```json
{
  "error": {
    "code": "STRING_EM_CAIXA_ALTA",
    "message": "Mensagem legível em português"
  }
}
```

### POST /upload

Envia um documento.

- **Headers:** `x-user-id` (opcional, padrão `anonymous`)
- **Entrada:** `multipart/form-data` com o campo `file` (arquivo)
- **Resposta 201 (Created):**

```json
{
  "id": "4f1c2d3e-...",
  "originalName": "contrato.pdf",
  "mimeType": "application/pdf",
  "size": 348211,
  "uploadedAt": "2026-10-28T18:30:00.000Z",
  "owner": "anonymous"
}
```

- **Erros:**

| Status | `error.code`        | Quando ocorre                                   |
| ------ | ------------------- | ------------------------------------------------ |
| 400    | `FILE_REQUIRED`     | Nenhum arquivo enviado no campo `file`           |
| 400    | `INVALID_FILE_TYPE` | Tipo de arquivo não permitido                    |
| 413    | `FILE_TOO_LARGE`    | Arquivo excede `MAX_FILE_SIZE_MB`                |

### GET /documents

Lista os documentos do usuário.

- **Headers:** `x-user-id` (opcional, padrão `anonymous`)
- **Resposta 200 (OK):** array de metadados (mesmo formato do upload),
  contendo apenas documentos cujo `owner` corresponde ao usuário da requisição.

```json
[
  {
    "id": "4f1c2d3e-...",
    "originalName": "contrato.pdf",
    "mimeType": "application/pdf",
    "size": 348211,
    "uploadedAt": "2026-10-28T18:30:00.000Z",
    "owner": "anonymous"
  }
]
```

### GET /documents/:id/download

Baixa o conteúdo binário de um documento.

- **Headers:** `x-user-id` (opcional, padrão `anonymous`)
- **Resposta 200 (OK):** conteúdo binário do arquivo, com os headers
  `Content-Type` (MIME original) e
  `Content-Disposition: attachment; filename="<originalName>"`.
- **Erros:**

| Status | `error.code`         | Quando ocorre                                                     |
| ------ | -------------------- | ------------------------------------------------------------------ |
| 404    | `DOCUMENT_NOT_FOUND` | Documento inexistente **ou** pertencente a outro usuário           |

> Documentos de outros usuários retornam 404 (e não 403) para não revelar a
> existência de documentos alheios.

### GET /health

Verificação de saúde (já existente no seed).

- **Resposta 200 (OK):** `{ "status": "ok" }`

## 7. Decisões arquiteturais

### Backend — Clean Architecture simples

Camadas em `backend/src`, com fluxo de dependência
`routes -> controllers -> services -> repositories` (camadas internas não
conhecem as externas):

| Camada          | Responsabilidade                                                                  |
| --------------- | ---------------------------------------------------------------------------------- |
| `routes/`       | Definição dos endpoints e configuração do `multer`; delegam aos controllers         |
| `controllers/`  | Entrada/saída HTTP, validação básica e mapeamento de erros para respostas JSON      |
| `services/`     | Regras de negócio (associação ao owner, filtro por usuário, verificação de posse)   |
| `repositories/` | Persistência: metadados em memória (`Map`) e leitura dos arquivos em `STORAGE_DIR`  |

### Frontend — organização baseada em componentes

- Componentes funcionais com React Hooks, organizados em `components/`,
  `pages/` e `services/`.
- Comunicação com o backend via `fetch` através do prefixo `/api` (proxy do
  Vite), centralizada em um serviço único que injeta o header `x-user-id`.
- Componentes previstos: `UploadComponent`, `DocumentList`, `DownloadButton`.

### Decisões registradas

| Decisão                               | Escolha                                               | Justificativa                                                                                     |
| ------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Identificação do owner                | Header `x-user-id`, padrão `anonymous`                 | Funciona em todos os endpoints (upload e listagem); evolui naturalmente para autenticação real      |
| Limite de tamanho de upload           | 10 MB, configurável via `MAX_FILE_SIZE_MB`             | Protege o filesystem local; configurável conforme 12-Factor                                         |
| Tipos de arquivo permitidos           | PDF, imagens (png/jpg), Office (docx/xlsx), txt/csv    | Cobre os formatos usuais de documentos e reduz risco de uploads arbitrários                         |
| Nome físico do arquivo                | Gerado pelo servidor (`id` + extensão)                 | Evita colisões e path traversal a partir do nome original                                           |
| Armazenamento                         | Filesystem local (`multer` + `diskStorage`)            | Restrição do projeto; sem provedores externos                                                       |
| Metadados                             | Em memória (`Map`)                                     | Simplicidade nesta fase inicial; repositório isola a troca futura por banco                         |

## 8. Plano de execução

Etapas na ordem de implementação (Passos 2 a 4 do workshop — **não**
implementadas nesta especificação):

1. **Backend — repositório:** criar `repositories/documentRepository.js`
   (metadados em memória) e a configuração do `multer` com `diskStorage`
   gravando em `STORAGE_DIR`.
2. **Backend — service:** criar `services/documentService.js` com as regras de
   negócio (criação de metadados, listagem filtrada por owner, verificação de
   posse no download).
3. **Backend — controllers e rotas:** criar `controllers/documentController.js`
   e `routes/documentRoutes.js` com `POST /upload`, `GET /documents` e
   `GET /documents/:id/download`, registrando as rotas em `app.js` e o
   tratamento padronizado de erros.
4. **Backend — testes:** cobrir os endpoints com o runner nativo `node:test`
   usando o `app` exportado (upload, listagem por owner, download, erros 400,
   404 e 413).
5. **Frontend — serviço de API:** criar `services/api.js` com `fetch` usando o
   prefixo `/api` e injeção do header `x-user-id`.
6. **Frontend — componentes:** criar `UploadComponent`, `DocumentList` e
   `DownloadButton`, compondo-os em `App.jsx`.
7. **Integração:** executar backend e frontend juntos, validar o fluxo
   completo (upload → listagem → download) e ajustar detalhes finais.
