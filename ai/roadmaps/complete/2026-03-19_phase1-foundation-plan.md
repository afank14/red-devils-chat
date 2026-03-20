# Phase 1: Foundation — Plan

> **Roadmap**: See [2026-03-19_phase1-foundation-roadmap.md](./2026-03-19_phase1-foundation-roadmap.md) for the execution checklist.
> **Parent**: See [2026-03-19_high-level-plan.md](./2026-03-19_high-level-plan.md) for overall project phases.

> **Principle**: No over-engineering, no cruft, no legacy-compatibility features. Scaffold the minimum needed to start building tools and RAG in Phase 3-4. If it isn't needed yet, don't add it.

---

## What

Initialize the project structure for Red Devils Chat: a Node.js/TypeScript backend (Express) and a React/TypeScript frontend (Vite). Install all dependencies, configure TypeScript, and set up environment variable templates so any developer can clone and run.

---

## How

### Project Structure

Use a two-directory approach within the existing `agentic-chatbot/` repo — not a monorepo tool like Turborepo or Nx. Just two separate npm projects side by side:

```
agentic-chatbot/
├── server/          # Node.js + Express + TypeScript backend
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── frontend/        # React + Vite + TypeScript frontend
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── documents/       # Empty dir, populated in Phase 2
├── .env.example
├── .gitignore
└── package.json     # Root-level scripts for convenience (dev, install)
```

A root `package.json` provides convenience scripts (`npm run dev` to start both, `npm run install:all` to install both) but does not use npm workspaces. Each project manages its own dependencies independently.

### Backend Setup (server/)

Initialize with `npm init`, then install dependencies in two groups:

**Runtime dependencies:**
- `langchain`, `@langchain/openai`, `@langchain/langgraph`, `@langchain/core`, `@langchain/tavily`, `@langchain/classic`, `@langchain/textsplitters` — agent framework and integrations
- `zod` — schema validation for tool inputs
- `mathjs` — sandboxed calculator evaluation
- `express` — HTTP server and API routes
- `cors` — cross-origin middleware for frontend dev server
- `pino`, `pino-pretty` — structured logging
- `dotenv` — environment variable loading

**Dev dependencies:**
- `typescript`, `@types/node`, `@types/express`, `@types/cors` — TypeScript toolchain
- `tsx` — fast TypeScript execution for development (replaces ts-node + nodemon)

TypeScript config targets ES2022 with Node module resolution. Enable strict mode. Output to `dist/`.

Create a minimal `server.ts` entry point: Express app that listens on port 3000, has CORS enabled, and responds to `GET /health` with `{ status: "ok" }`. This verifies the server runs. No other routes yet — those come in Phase 5.

### Frontend Setup (frontend/)

Scaffold with `npm create vite@latest frontend -- --template react-ts`. This gives us React 19, TypeScript, and a working dev server out of the box.

The Vite dev server runs on port 5173 by default. No additional dependencies needed in Phase 1 — `react-markdown`, SSE handling, and component libraries come in Phase 6.

Verify the default Vite app renders in the browser.

### Environment Variables

Create `.env.example` at the project root with:
- `OPENAI_API_KEY` — for GPT-4o (agent reasoning) and text-embedding-3-small (RAG embeddings)
- `TAVILY_API_KEY` — for web search tool
- `PORT` — backend port (default 3000)
- `LOG_LEVEL` — pino log level (default info)
- `FOOTBALL_DATA_API_KEY` — for stretch goal Football Data API tool

The backend loads `.env` from the project root via dotenv's `path` option.

### Smoke Test

Write a small standalone script (`server/src/smoke-test.ts`) that imports each API client (ChatOpenAI, OpenAIEmbeddings, TavilySearch) and makes one minimal call to verify the keys work. This script is run manually, not part of the app — it just confirms the environment is configured correctly before moving on.

### CORS Configuration

Configure `cors` middleware on Express to allow requests from `http://localhost:5173` (Vite dev server). This is the only origin needed during development. In the cors options, allow `Content-Type` and any other headers needed for the SSE streaming endpoint that comes later.

---

## Technical Considerations

**Why not a monorepo tool?** Turborepo, Nx, and npm workspaces add configuration overhead with no benefit at this scale. Two directories with a root convenience script is simpler and achieves the same result.

**Why tsx over ts-node + nodemon?** `tsx` is a single dependency that watches for changes and re-executes. No configuration file needed. Faster startup than ts-node because it uses esbuild under the hood.

**Why install all LangChain packages now?** They're needed in Phase 3-5. Installing upfront means no dependency management interruptions during implementation phases. The unused packages add no runtime cost.

**Why Express 5?** Express 5 is stable and supports async route handlers natively (no need for `express-async-errors` wrapper). Use `express@5` explicitly.
