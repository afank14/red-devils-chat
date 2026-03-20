# Phase 8 Plan: Polish & Stretch Goals (P1)

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. Each stretch feature should be self-contained and additive. If an API key is missing, the app should still work — graceful degradation, not hard failures.

> **Roadmap:** See `2026-03-19_phase8-polish-roadmap.md` for the execution checklist.
> **High-level plan:** See `2026-03-19_high-level-plan.md` for project-wide context.

---

## What

Add a 4th tool (Football Data API), replace the in-memory vector store with persistent ChromaDB, audit error handling across all tools and endpoints, write a final README, and verify the git history has 5+ meaningful commits.

---

## How

### Football Data API Tool

Build a `DynamicStructuredTool` wrapping the football-data.org v4 REST API. This provides live Premier League data: standings, fixtures, results, squad, and top scorers.

- **API base URL**: `https://api.football-data.org/v4`
- **Auth**: `X-Auth-Token` header with API key from env var `FOOTBALL_DATA_API_KEY`
- **Man United team ID**: `66`
- **Key endpoints**:
  - `GET /competitions/PL/standings` -- current PL table
  - `GET /teams/66/matches?status=SCHEDULED` -- upcoming fixtures
  - `GET /teams/66/matches?status=FINISHED` -- recent results
  - `GET /teams/66` -- squad roster
  - `GET /competitions/PL/scorers` -- top scorers
- **Tool input schema**: Zod schema with `query_type` (enum: `"standings"`, `"fixtures"`, `"results"`, `"squad"`, `"scorers"`) and optional `limit` (number, for limiting results)
- **Output formatting**: Transform raw API JSON into readable text (e.g., standings as a formatted table, fixtures as a date-ordered list)
- **Rate limiting**: football-data.org free tier allows 10 requests/minute. Implement a simple client-side rate limiter (token bucket or sliding window) in a shared utility
- **Response caching**: Cache responses for 5 minutes to reduce API calls for repeated queries
- **System prompt update**: Guide the agent to prefer Football Data API over web search for current-season Premier League data (standings, fixtures, results, squad info). Web search remains the fallback for transfer rumors, historical cross-competition data, and non-PL content

### ChromaDB Persistent Vector Store

Replace `MemoryVectorStore` with ChromaDB so the vector store persists across server restarts.

- **Installation**: ChromaDB can run via Docker (`chromadb/chroma` image) or as a Python package with `pip install chromadb`. For Node.js, use the `chromadb` npm package as the client
- **LangChain integration**: Use `Chroma.fromDocuments(chunks, embeddings, { collectionName: "red-devils", url: "http://localhost:8000" })` to create/load the collection
- **Migration path**: Replace `MemoryVectorStore.fromDocuments(...)` with `Chroma.fromDocuments(...)` in the RAG pipeline. The rest of the pipeline (loader, splitter, embeddings) stays the same
- **Collection management**: On startup, check if the collection already exists and has documents. If so, skip re-embedding. If not (first run or after clearing), run the full pipeline
- **Fallback**: If ChromaDB is unavailable (no Docker, no server running), fall back to `MemoryVectorStore` with a warning log. The app should always work

### Error Handling Audit

Review and harden error handling across all tools and API endpoints.

- **Tools**: Every tool should catch errors internally and return a descriptive error string rather than throwing. The agent can then reason about the failure and try an alternative approach
- **API endpoint**: The chat endpoint should catch unhandled errors from the agent and return a proper error response (or `error` SSE event for the streaming endpoint)
- **External API failures**: Tavily, Football Data API, and OpenAI embeddings can all fail. Each should have try/catch with meaningful error messages
- **Missing API keys**: If an API key is missing, the corresponding tool should be excluded from the agent's tool list (or return a clear "not configured" message). The agent should still work with the remaining tools

### Final README

Update the README with complete setup and run instructions.

- Project description and what it does
- Prerequisites (Node.js, API keys, optional Docker for ChromaDB)
- Environment setup (`.env` file with all required and optional keys)
- How to install dependencies and start the app
- Available features and tools
- Project structure overview

### Git History Verification

Verify that the git log contains at least 5 meaningful commits tracking the project's development across phases. Each commit should represent a logical milestone, not just small fixes.

---

## Technical Considerations

- **Football Data API precedence**: The system prompt must clearly instruct the agent to prefer the Football Data API for current-season PL questions. Without this guidance, the agent may default to web search. The prompt should specify which query types map to which tool
- **ChromaDB Docker vs local**: Docker is the cleanest option (single `docker run` command) but adds a dependency. Document both options in the README. The fallback to MemoryVectorStore ensures the app works regardless
- **Rate limiting on football-data.org**: The free tier is 10 requests/minute. The rate limiter should queue or reject excess requests with a clear error. Caching helps reduce the number of actual API calls
- **Graceful degradation**: The app must work even if `FOOTBALL_DATA_API_KEY` is not set (no football data tool, but everything else works) or if ChromaDB is not running (falls back to in-memory). Never hard-fail on missing optional dependencies
