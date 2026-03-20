# High-Level Implementation Plan

> **Important:** Keep this project clean. No over-engineering, no cruft, no legacy-compatibility features. Solve the current problem with the simplest approach that works. If something isn't needed yet, don't build it. We'll add focused plan docs for individual phases as we get to them.

---

## Phase 1: Foundation
- Initialize Node.js/TypeScript project (backend)
- Scaffold React/TypeScript app (frontend via Vite)
- Install all dependencies (langchain, anthropic, openai, tavily, classic, mathjs, zod, pino, etc.)
- Set up `.env.example` with required API keys
- Configure TypeScript, ESLint basics
- Verify API keys work (quick smoke test for Claude, OpenAI embeddings, Tavily)
- **Commit**: project scaffold with working dev environment

## Phase 2: Document Corpus
- Write 5-7 Manchester United markdown documents
- Structure stat-heavy docs with consistent formatting (tables, clear sections)
- Ensure each doc has clear metadata potential (document name, sections)
- Focus on content quality — retrieval quality depends on it
- **Commit**: curated document corpus

## Phase 3: Core Tools (Calculator + Web Search)
- Build calculator tool wrapping math.js `evaluate()`
- Build web search tool using TavilySearch from `@langchain/tavily`
- Error handling on both — catch, never throw
- Test each tool independently
- Add pino structured logging for tool calls
- **Commit**: working calculator and web search tools

## Phase 4: RAG Pipeline
- Load documents with DirectoryLoader/TextLoader
- Split with RecursiveCharacterTextSplitter (markdown-aware, ~1000 chars, 200 overlap)
- Embed with OpenAI `text-embedding-3-small`
- Store in MemoryVectorStore
- Build RAG tool with source attribution in output
- Test retrieval quality with known questions
- **Commit**: working RAG pipeline with source citations

## Phase 5: Agent
- Wire all 3 tools into `createAgent` with system prompt
- Add conversation memory (messageHistory array approach)
- Set up Express API endpoint (`POST /api/chat`)
- Structured logging for full agent reasoning chain
- Test multi-tool queries (RAG → Calculator chains)
- Test follow-up questions (pronoun resolution)
- **Commit**: working agent with memory and logging

## Phase 6: Web UI
- Build React chat interface (message input, response display)
- Connect to backend API
- Render markdown in responses
- Display source citations from RAG results
- Basic styling — clean and functional, not fancy
- **Commit**: functional chat UI with source display

## Phase 7: Streaming (P1 Stretch)
- Add SSE endpoint to Express backend
- Stream agent events (tool calls, reasoning, tokens) to frontend
- Build frontend stream handler (fetch + ReadableStream, not EventSource)
- Show tool call indicators in UI during agent reasoning
- **Commit**: streaming agent reasoning in UI

## Phase 8: Polish & Stretch Goals (P1)
- 4th tool: Football Data API (football-data.org, team ID 66)
- Persistent vector store (ChromaDB) so docs survive restarts
- Error handling edge cases
- Final README update
- Verify 5+ meaningful commits in git history
- **Commit(s)**: stretch features and final polish

---

## Ordering Rationale
- Phases 1-2 are setup with no code complexity
- Phase 3 builds tools in isolation — easy to test
- Phase 4 is the hardest piece (RAG quality) — tackle before agent wiring
- Phase 5 brings everything together
- Phase 6 adds the UI on top of a working backend
- Phases 7-8 are stretch goals layered onto a complete MVP
