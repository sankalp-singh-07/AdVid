# Production Hardening Notes

This document explains major changes applied to move IntellectRAG toward production quality **without** rewriting the product as an agent framework.

## Why these changes

The codebase already had the right high-level shape (FastAPI services, Qdrant, Ollama, JWT). Production gaps were:

1. Broken frontend↔backend contracts (chat answers empty, citations missing)
2. Single-document chat mental model
3. Basic dense-only RAG
4. Hard-coupled Cloudinary + Ollama
5. Stub streaming / export / regenerate
6. Weak upload validation and rate limiting
7. Spinner-heavy UI and large monolithic pages

## Architecture (preserved + improved)

```
React SPA
  → JWT + refresh cookie
FastAPI routes (thin)
  → domain services
  → providers/ (storage, llm, embedding)
  → Postgres + Qdrant + Redis
```

### StorageProvider

- `CloudinaryStorage` (current default)
- `S3Storage` (ready when `STORAGE_PROVIDER=s3` + boto3)
- `LocalStorage` (dev/offline)

**Benefit:** S3 migration is config + credentials, not a document-service rewrite.  
**Tradeoff:** Existing Cloudinary URLs stay on Cloudinary until re-uploaded.

### LLMProvider / EmbeddingProvider

- Default: Ollama chat + `nomic-embed-text`
- OpenAI-compatible path for vLLM / hosted APIs

**Why keep nomic-embed-text:** strong local quality, 768-d matches current Qdrant collection, no full reindex required. Retrieval quality gains come from hybrid boost, thresholds, dedupe, diversity, and prompts—not a blind model swap.

## Knowledge bases

Documents belong to a `knowledge_bases` row. Chat retrieval defaults to **all ready docs in the active KB**. Optional `document_id` is a filter only.

**Migration:** `alembic upgrade head` creates tables/columns. On first list, each user gets a default KB; new uploads attach automatically.

## RAG pipeline improvements

| Feature | Implementation |
|---------|----------------|
| Multi-doc default | `knowledge_base_id` filter on Qdrant |
| Over-fetch + filter | `RAG_TOP_K` → threshold → dedupe → `RAG_FINAL_K` |
| Hybrid-ish boost | Keyword boost on filename/content |
| Diversity | Prefer different documents when scores are close |
| Prompts | Structured Markdown, Sources, Confidence |
| Injection defense | Pattern filter on user query + untrusted doc text instruction |

## Chat / export

- Real SSE streaming at `/api/chat/stream`
- Credits deducted **after** successful generation
- Export: Markdown, TXT, PDF (reportlab when installed)
- Regenerate hits the real API

## Background ingestion

Still uses FastAPI `BackgroundTasks` (no Celery requirement yet), but now with:

- Progress % + stage labels
- Retry / cancel endpoints
- Batched embeddings
- Clearer failure status

**Future:** swap to ARQ/RQ/Celery workers without changing the document API surface much.

## Security

- Upload extension + size + magic-byte checks
- Rate limits on auth / chat / upload
- Reset codes no longer returned unless `EXPOSE_RESET_CODES=true` in development
- Sentry PII disabled in production
- Deep `/health` endpoint

## Frontend

- Fixed `answer` / `citations` / `sources` normalization
- Streaming chat with stop generation
- KB picker, multi-doc default
- Skeleton loaders (docs, chat, stats)
- Export menu, regenerate, server search params
- Working Quick Actions → assistant with KB context
- Knowledge Base + Settings pages
- Fixed Sidebar `LogOut` import; branding unified to IntellectRAG

## Deploy checklist

1. Set strong `JWT_SECRET_KEY` / `JWT_REFRESH_SECRET_KEY`
2. `alembic upgrade head`
3. Confirm Ollama has `llama3` (or your `LLM_MODEL`) and `nomic-embed-text`
4. Confirm Qdrant collection dim = 768
5. Set `STORAGE_PROVIDER` and credentials
6. Set `FRONTEND_URLS` and `VITE_API_BASE_URL`
7. `RATE_LIMIT_ENABLED=true` in production
8. `EXPOSE_RESET_CODES=false`

## Intentionally not added

- LangGraph / multi-agent orchestration
- Full org multi-tenancy (hooks only via user_id isolation)
- Distributed job queue (progress/retry prepared first)

## Suggested next steps

1. Durable job queue (ARQ) for multi-instance ingest
2. Optional cross-encoder re-ranker when GPU available
3. Org/RBAC tables when multi-team is required
4. Re-embed job tooling if you change embedding models
