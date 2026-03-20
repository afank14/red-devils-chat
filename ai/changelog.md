This is meant to be a concise list of changes to track as we build this project. Keep comments short and summarized. Always add references back to the source plan docs for each set of changes.

## 2026-03-20 — Phase 5: Agent

**Plan**: [phase5-agent-plan.md](./roadmaps/complete/2026-03-19_phase5-agent-plan.md) | **Roadmap**: [phase5-agent-roadmap.md](./roadmaps/complete/2026-03-19_phase5-agent-roadmap.md)

- Built `server/src/agent/agent.ts` — createAgent with ChatOpenAI (gpt-4o), 3 tools, conversation memory
- Built `server/src/agent/system-prompt.ts` — persona, tool routing, citation format, multi-tool chaining
- Built `server/src/agent/callbacks.ts` — ToolLoggingHandler for traceId-aware tool call logging
- Built `server/src/routes/chat.ts` — POST /api/chat with input validation and security guards
- Logger rewritten with tee stream for reliable dual output (stdout + file)
- Lazy init for ChatOpenAI/TavilySearch fixes env var load order
- Verified tool routing via log analysis: RAG, RAG+calculator, tavily_search all correct with traceId propagation

## 2026-03-20 — Phase 4: RAG Pipeline

**Plan**: [phase4-rag-pipeline-plan.md](./roadmaps/complete/2026-03-19_phase4-rag-pipeline-plan.md) | **Roadmap**: [phase4-rag-pipeline-roadmap.md](./roadmaps/complete/2026-03-19_phase4-rag-pipeline-roadmap.md)

- Built `server/src/rag/pipeline.ts` — DirectoryLoader + TextLoader, metadata enrichment, RecursiveCharacterTextSplitter (1000/200)
- Built `server/src/rag/vector-store.ts` — MemoryVectorStore with OpenAI text-embedding-3-small (299 chunks)
- Built `server/src/tools/rag-search.ts` — top-4 similarity search with `[n] Source: Document Name` citation format
- Import path fix: document loaders from `@langchain/classic` (not `langchain`)
- 10/10 tests passed: retrieval accuracy, source attribution, error handling, logging

## 2026-03-20 — Phase 3: Core Tools (Calculator + Web Search)

**Plan**: [phase3-core-tools-plan.md](./roadmaps/complete/2026-03-19_phase3-core-tools-plan.md) | **Roadmap**: [phase3-core-tools-roadmap.md](./roadmaps/complete/2026-03-19_phase3-core-tools-roadmap.md)

- Upgraded `logger.ts` with dual output (pino-pretty + JSON file), traceId/requestId helpers, ToolLogFields type
- Built `server/src/tools/calculator.ts` — mathjs sandbox, Zod schema, input length limit, 11 edge cases tested
- Built `server/src/tools/web-search.ts` — TavilySearch with sports domain filtering, query length limit, 4 tests passed
- Both tools use catch-never-throw error handling and structured pino logging

## 2026-03-20 — Phase 2: Document Corpus

**Plan**: [phase2-documents-plan.md](./roadmaps/complete/2026-03-19_phase2-documents-plan.md) | **Roadmap**: [phase2-documents-roadmap.md](./roadmaps/complete/2026-03-19_phase2-documents-roadmap.md)

- Wrote 7 curated Manchester United markdown documents in `documents/`
- club-history, player-legends, trophy-cabinet, iconic-matches, managerial-history, old-trafford, player-stats-reference
- All stats use exact numbers for calculator-friendly retrieval
- Structured with H2/H3 headers for chunk-friendly splitting (target <800 chars per section)
- Source disclaimers moved to bottom "Source Notes" sections to avoid polluting embeddings
- Verified calculator chain readiness (Rooney vs Ronaldo goals-per-game data retrievable)

## 2026-03-20 — Phase 1: Foundation

**Plan**: [phase1-foundation-plan.md](./roadmaps/complete/2026-03-19_phase1-foundation-plan.md) | **Roadmap**: [phase1-foundation-roadmap.md](./roadmaps/complete/2026-03-19_phase1-foundation-roadmap.md)

- Scaffolded `server/` with Express 5, pino logging, health endpoint, TypeScript (ES2022, strict)
- Scaffolded `frontend/` with Vite + React 19 + TypeScript
- Installed all LangChain deps (`@langchain/openai`, `langgraph`, `core`, `tavily`, `classic`, `textsplitters`)
- Created `.env.example` and `.env` with `OPENAI_API_KEY`, `TAVILY_API_KEY`, `FOOTBALL_DATA_API_KEY`, `PORT`, `LOG_LEVEL`
- Created root `package.json` with `install:all` and `dev` convenience scripts
- Created `server/src/smoke-test.ts` — verified ChatOpenAI, OpenAIEmbeddings, TavilySearch all pass
- Created `documents/` directory for Phase 2 corpus
- Switched LLM from Anthropic/Claude to OpenAI/GPT-4o (single provider for LLM + embeddings)