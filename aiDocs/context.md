# Project Context: Red Devils Chat

## What This Is
An agentic RAG-powered chatbot about Manchester United, built with LangChain.js and TypeScript for a Dev Units 7 & 8 assignment.

## Key Documents
- [PRD](./prd.md) — full product requirements, features (P0/P1/P2), user stories, risks
- [MVP](./mvp.md) — MVP scope, user flows, definition of done checklist
- [Architecture](./architecture.md) — system architecture, tech stack, component breakdown, data flow, design decisions
- [Changelog](../ai/changelog.md) — changelog with brief notes about each change to the codebase
- [Testing & Logging](../ai/guides/testing.md) — where logs are, how to read them, how to parse for errors. **Read this before debugging or running tests.**

## API Keys Required
- `OPENAI_API_KEY` — LLM and embeddings
- `TAVILY_API_KEY` — web search
- `FOOTBALL_DATA_API_KEY` — football-data.org (stretch goal)

## Behavior
- Whenever creating plan docs and roadmap docs, always save them in ai/roadmaps. Prefix the name with the date. Add a note that we need to avoid over-engineering, cruft, and legacy-compatibility features in this clean code project. Make sure they reference each other.
- Whenever finishing with implementing a plan / roadmap doc pair, make sure the roadmap is up to date (tasks checked off, etc). Then move the docs to ai/roadmaps/complete. Then update ai/changelog.md accordingly.

## Current Focus
- Phase 1 (Foundation) complete — server, frontend, env config, smoke test all verified
- Phase 2 (Document Corpus) complete — 7 curated .md files in `documents/`
- Phase 3 (Core Tools) complete — calculator + web search tools with structured logging
- Phase 4 (RAG Pipeline) complete — document loading, splitting, embedding, vector store, retrieval tool
- Phase 5 (Agent) complete — createAgent, system prompt, conversation memory, POST /api/chat, structured logging
- Phase 6 (Web UI) complete — React chat interface with markdown, typing indicator, error handling
- Phase 7 (SSE Streaming) complete — real-time token streaming, tool indicators, abort handling
- LLM: OpenAI/GPT-4o (single provider for LLM + embeddings)
- All 7 phases complete. Stretch goals remaining: Football Data API, ChromaDB persistence
