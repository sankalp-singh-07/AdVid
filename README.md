# IntellectRAG

**Enterprise AI Document Assistant** — upload company documents, build knowledge bases, and chat with them using Retrieval-Augmented Generation (RAG).

Built with **FastAPI**, **React**, **LangChain**, **Ollama**, **Qdrant**, and **PostgreSQL**.

---

## Features

- **Multi-document Knowledge Bases** — chat across all docs in a workspace by default
- **Document upload & ingestion** — PDF, DOCX, PPTX, TXT, Markdown, CSV, Excel
- **Semantic RAG** — embeddings + Qdrant vector search with citations
- **Streaming chat** — SSE responses with stop generation, regenerate, and export
- **Conversation export** — Markdown, TXT, and PDF
- **JWT authentication** — access tokens + HttpOnly refresh cookies
- **Credits system** — upload (3 credits) · AI replies (5–10 credits, usage-based)
- **Provider abstractions** — swap storage (Cloudinary / S3 / local) and LLM (Ollama / OpenAI-compatible / vLLM) via config
- **Production-minded** — rate limiting, upload validation, deep health checks, Alembic migrations

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion, Axios |
| Backend | FastAPI, SQLAlchemy (async), Alembic, Pydantic |
| AI / RAG | LangChain, Ollama (`llama3` + `nomic-embed-text`) |
| Vectors | Qdrant |
| Database | PostgreSQL |
| Cache | Redis / Upstash (optional) |
| Storage | Cloudinary (default), S3, or local disk |
| Auth | JWT (python-jose), bcrypt |

---

## Project structure

```
AdVid/
├── Backend/                 # FastAPI API
│   ├── app/                 # App entry, config, DB
│   ├── routes/              # HTTP routes
│   ├── services/            # Business logic (RAG, chat, docs, credits)
│   ├── providers/           # LLM / embedding / storage adapters
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── alembic/             # Migrations
│   ├── requirements.txt
│   └── .env.example
├── Frontend/                # React SPA
│   ├── src/
│   │   ├── pages/           # Assistant, Documents, KB, Settings
│   │   ├── components/
│   │   ├── context/
│   │   └── utils/
│   └── package.json
├── DOCUMENTATION.md         # Full architecture & deployment guide
├── PRODUCTION_NOTES.md      # Hardening changelog
└── README.md
```

---

## Prerequisites

- **Python** 3.11+
- **Node.js** 18+
- **PostgreSQL** (local or hosted, e.g. Neon)
- **[Ollama](https://ollama.com)** with models:
  ```bash
  ollama pull llama3
  ollama pull nomic-embed-text
  ```
- **Qdrant** (local Docker or [Qdrant Cloud](https://cloud.qdrant.io))
- **Redis** (optional — app runs without cache)

### Local Qdrant (recommended for dev)

```bash
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
```

---

## Quick start

### 1. Backend

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # edit secrets, DB, Ollama, Qdrant
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs  
Health: http://localhost:8000/health

### 2. Frontend

```bash
cd Frontend
npm install
npm run dev
```

App: http://localhost:5173

Optional env:

```env
# Frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## Environment configuration

Copy `Backend/.env.example` → `Backend/.env`. Minimum required:

```env
DB_URL=postgresql+asyncpg://user:pass@host:5432/dbname
JWT_SECRET_KEY=change-me-min-32-chars
JWT_REFRESH_SECRET_KEY=change-me-refresh-min-32-chars
FRONTEND_URLS=["http://localhost:5173"]

LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama3

EMBEDDING_MODEL=nomic-embed-text
QDRANT_URL=http://localhost:6333
QDRANT_VECTOR_SIZE=768

STORAGE_PROVIDER=cloudinary        # or local | s3
# Cloudinary / S3 credentials as needed
```

| Variable | Purpose |
|----------|---------|
| `LLM_PROVIDER` | `ollama` \| `openai_compatible` \| `vllm` |
| `STORAGE_PROVIDER` | `cloudinary` \| `s3` \| `local` |
| `CREDIT_COST_UPLOAD` | Credits per upload (default `3`) |
| `CREDIT_COST_CHAT_MIN` / `MAX` | Chat billing range (default `5`–`10`) |

---

## How it works

```
Upload → extract text → chunk → embed (Ollama) → Qdrant
                                                      ↓
User question → embed → vector search (KB-scoped) → LLM → cited answer
```

1. Documents belong to a **Knowledge Base**.
2. Chat retrieves from **all ready documents** in the active KB (optional single-doc filter).
3. Answers include **source citations** (filename, page, score).

---

## Main API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Current user + credits |
| `GET/POST` | `/api/knowledge-bases` | List / create KBs |
| `POST` | `/api/documents/upload` | Upload document |
| `GET` | `/api/documents` | List / search documents |
| `POST` | `/api/chat` | Non-streaming chat |
| `POST` | `/api/chat/stream` | Streaming chat (SSE) |
| `POST` | `/api/chat/export/{id}` | Export conversation |
| `GET` | `/health` | Dependency health check |

Interactive OpenAPI docs: `/docs`

---

## Credits

| Action | Cost |
|--------|------|
| Document upload | **3** credits |
| AI chat / regenerate | **5–10** credits (answer length + sources) |

New users receive a starting credit balance (default **100**).

---

## Scripts

### Backend

```bash
uvicorn app.main:app --reload --port 8000
alembic upgrade head
alembic revision --autogenerate -m "description"
```

### Frontend

```bash
npm run dev       # development
npm run build     # production build
npm run preview   # preview build
```

---

## Deployment

See **[DOCUMENTATION.md](./DOCUMENTATION.md)** for:

- Docker / docker-compose examples  
- AWS (ECS, RDS, S3, GPU for Ollama/vLLM)  
- Offline / air-gapped Ollama setup  
- Security checklist and scaling notes  

Also see **[PRODUCTION_NOTES.md](./PRODUCTION_NOTES.md)** for production hardening details.

### High-level production checklist

- [ ] Strong JWT secrets  
- [ ] `ENVIRONMENT=production`  
- [ ] HTTPS + locked CORS origins  
- [ ] Managed Postgres + Qdrant  
- [ ] `alembic upgrade head` on deploy  
- [ ] GPU or remote Ollama / vLLM for inference  
- [ ] `STORAGE_PROVIDER=s3` for durable files  

---

## Security notes

- Do **not** commit `.env` files or real API keys  
- Use `.env.example` as a template only  
- Rotate secrets if they were ever committed historically  

Suggested `.gitignore` entries:

```gitignore
.env
.env.local
**/__pycache__/
*.pyc
.venv/
node_modules/
Frontend/dist/
Backend/temp_uploads/
Backend/uploads/
*.log
```

---

## Documentation

| File | Contents |
|------|----------|
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Full system design, APIs, deploy, offline AI |
| [PRODUCTION_NOTES.md](./PRODUCTION_NOTES.md) | What changed for production readiness |
| [Backend/README.md](./Backend/README.md) | Backend-focused notes |

---

## License

Private / academic project — update this section if you open-source under a specific license.

---

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/)
- [LangChain](https://python.langchain.com/)
- [Ollama](https://ollama.com/)
- [Qdrant](https://qdrant.tech/)
- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
