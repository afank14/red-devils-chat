# Phase 1: Foundation — Roadmap

> **Plan**: See [2026-03-19_phase1-foundation-plan.md](./2026-03-19_phase1-foundation-plan.md) for the reasoning behind each task.
> **Parent**: See [2026-03-19_high-level-plan.md](./2026-03-19_high-level-plan.md) for overall project phases.

> **Principle**: No over-engineering, no cruft, no legacy-compatibility features. Only build what Phase 1 requires.

---

## Backend Setup

- [ ] Create `server/` directory and initialize with `npm init`
- [ ] Install runtime dependencies: `langchain`, `@langchain/anthropic`, `@langchain/openai`, `@langchain/langgraph`, `@langchain/core`, `@langchain/tavily`, `@langchain/classic`, `@langchain/textsplitters`, `zod`, `mathjs`, `express@5`, `cors`, `pino`, `pino-pretty`, `dotenv`
- [ ] Install dev dependencies: `typescript`, `@types/node`, `@types/express`, `@types/cors`, `tsx`
- [ ] Create `tsconfig.json` — target ES2022, strict mode, Node module resolution, outDir `dist/`
- [ ] Create `server/src/server.ts` — Express app with CORS, health endpoint (`GET /health` returns `{ status: "ok" }`), listens on PORT from env
- [ ] Create `server/src/logger.ts` — pino logger with pino-pretty in dev, configurable via LOG_LEVEL env var
- [ ] Add `dev` script to `server/package.json` using `tsx watch src/server.ts`
- [ ] Verify: `npm run dev` in `server/` starts Express and `GET /health` returns 200

## Frontend Setup

- [ ] Scaffold `frontend/` with `npm create vite@latest frontend -- --template react-ts`
- [ ] Verify: `npm run dev` in `frontend/` opens React app in browser at localhost:5173

## Environment & Config

- [ ] Create `.env.example` at project root with: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `TAVILY_API_KEY`, `PORT`, `LOG_LEVEL`, `FOOTBALL_DATA_API_KEY`
- [ ] Create `.env` from `.env.example` and fill in actual API keys
- [ ] Ensure `.gitignore` includes `.env`, `node_modules/`, `dist/`, and any other generated files
- [ ] Create empty `documents/` directory (populated in Phase 2)

## Root Convenience

- [ ] Create root `package.json` with convenience scripts: `dev` (starts both server and frontend), `install:all` (installs deps in both directories)

## Smoke Test

- [ ] Create `server/src/smoke-test.ts` — makes one minimal call to each API (ChatAnthropic, OpenAIEmbeddings, TavilySearch) and logs success/failure
- [ ] Run smoke test and verify all three API keys work
  - **Criteria**: Script logs successful responses from Claude, OpenAI embeddings, and Tavily without errors

## Commit

- [ ] Commit: **"project scaffold with working dev environment"**
  - **Criteria**: Fresh clone can run `npm run install:all` then `npm run dev` and see both backend health endpoint and frontend React app running
