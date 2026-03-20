# Phase 8 Roadmap: Polish & Stretch Goals (P1)

> **Plan:** See `2026-03-19_phase8-polish-plan.md` for the detailed approach and technical reasoning.
> **High-level plan:** See `../2026-03-19_high-level-plan.md` for project-wide context.
> **Principle:** No over-engineering, no cruft, no legacy-compatibility features. Keep it simple.

---

## Tasks

### Football Data API Tool

- [x] Create API client module (`football-data-client.ts`) wrapping football-data.org v4 endpoints with `X-Auth-Token` auth
- [x] Implement rate limiter utility (10 req/min for free tier)
- [x] Implement response caching (5-minute TTL)
- [x] Build `DynamicStructuredTool` with Zod schema: `query_type` (standings/fixtures/results/squad/scorers) + optional `limit`
- [x] Format API responses into readable text (standings table, fixture list, squad roster, etc.)
- [x] Handle missing `FOOTBALL_DATA_API_KEY`: exclude tool from agent or return "not configured" message
- [x] Update system prompt to prefer Football Data API over web search for current-season PL data
- [x] Test: standings, fixtures, results, squad, and scorers queries all return formatted data

### ChromaDB Persistent Vector Store

- [x] Install `chromadb` npm client package
- [x] Replace `MemoryVectorStore.fromDocuments(...)` with `Chroma.fromDocuments(...)` in the RAG pipeline
- [x] Add collection existence check on startup: skip re-embedding if collection already has documents
- [x] Add fallback: if ChromaDB connection fails, fall back to `MemoryVectorStore` with a warning log
- [x] Test: restart the server and verify RAG queries work without re-embedding
- [x] Document ChromaDB setup (Docker command or alternative) in README

### Error Handling Audit

- [x] Audit all tools: verify each catches errors internally and returns a descriptive string instead of throwing
- [x] Audit chat endpoint: verify unhandled agent errors return proper error response (JSON or SSE `error` event)
- [x] Audit external API calls (Tavily, Football Data, OpenAI embeddings): verify try/catch with meaningful error messages
- [x] Verify graceful behavior when API keys are missing (app still starts, available tools still work)

### Final README

- [x] Write project description and feature summary
- [x] Document prerequisites (Node.js version, API keys, optional Docker for ChromaDB)
- [x] Document environment setup (`.env` file with all required and optional keys)
- [x] Document install and run instructions
- [x] Document project structure overview

### Git History Verification

- [x] Review `git log` and verify 5+ meaningful commits spanning the project phases
- [x] If needed, ensure remaining work is committed with clear messages

---

## Completion Criteria

- Football Data API returns current PL standings when asked "What's the Premier League table?"
- Football Data API returns upcoming Man United fixtures, recent results, squad, and top scorers
- Agent prefers Football Data API over web search for current-season PL stats
- Vector store persists across server restarts (ChromaDB) — RAG queries work without re-embedding
- App falls back to MemoryVectorStore if ChromaDB is unavailable
- All tools handle errors gracefully (no unhandled exceptions crash the server)
- App starts and works even if optional API keys are missing
- README has complete setup and run instructions
- `git log` shows 5+ meaningful commits

---

## Commit(s)

- [x] Commit(s): "stretch features and final polish"
