# IntellectRAG Backend

Production-oriented FastAPI RAG service: multi-document knowledge bases, Qdrant retrieval, provider-agnostic LLM/storage, streaming chat, and conversation export.

## Stack

- FastAPI + SQLAlchemy (async) + Alembic
- LangChain + Ollama (or OpenAI-compatible) LLM
- Ollama embeddings (`nomic-embed-text`, 768-d)
- Qdrant vector store
- Redis cache (optional / Upstash)
- Storage: Cloudinary | S3 | local

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill secrets
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Provider configuration

| Concern | Env vars | Notes |
|--------|----------|--------|
| LLM | `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL` | `ollama` or `openai_compatible` / `vllm` |
| Embeddings | `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL` | Keep `nomic-embed-text` unless you reindex |
| Storage | `STORAGE_PROVIDER` | `cloudinary` \| `s3` \| `local` |
| RAG | `RAG_CHUNK_SIZE`, `RAG_TOP_K`, `RAG_FINAL_K`, `RAG_SCORE_THRESHOLD` | Tunable without code changes |

Business services only depend on facades in `services/*` and abstractions under `providers/*`.

## Key APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/documents/upload` | Upload + background ingest |
| GET | `/api/documents` | Paginated search/filter list |
| POST | `/api/documents/{id}/retry` | Retry failed ingest |
| POST | `/api/documents/{id}/cancel` | Cancel in-flight ingest |
| GET/POST | `/api/knowledge-bases` | Multi-document workspaces |
| POST | `/api/chat` | Non-streaming RAG chat |
| POST | `/api/chat/stream` | SSE streaming chat |
| POST | `/api/chat/regenerate` | Regenerate last answer |
| POST | `/api/chat/export/{id}` | Export md / txt / pdf |
| GET | `/health` | Deep dependency health |

## Architecture notes

See `../PRODUCTION_NOTES.md` for change log, tradeoffs, and migration guidance.
