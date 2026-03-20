This is meant to be a concise list of changes to track as we build this project. Keep comments short and summarized. Always add references back to the source plan docs for each set of changes.

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