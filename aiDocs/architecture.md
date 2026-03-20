# Architecture Document: Red Devils Chat

## 1. System Overview

Red Devils Chat is an agentic RAG chatbot for Manchester United fans. A user asks a question in a React web UI, the request hits an Express API, which delegates to a LangChain ReAct agent powered by Claude. The agent reasons about which tools to call -- RAG search, calculator, web search, or Football Data API -- executes them, and returns a sourced response to the user. The MVP uses a simple JSON request/response endpoint (`POST /api/chat`). The stretch goal (Phase 7) upgrades this to SSE streaming (`POST /api/chat/stream`) so users can watch the agent reason in real time.

---

## 2. Architecture Diagram

```
                            +-----------------------+
                            |    React Frontend     |
                            |   (Vite + TypeScript)  |
                            +----------+------------+
                                       |
                          POST /api/chat (MVP: JSON)
                      POST /api/chat/stream (P1: SSE)
                                       |
                            +----------v------------+
                            |   Express.js API      |
                            |   (Node.js + TS)      |
                            |  - CORS, JSON parse   |
                            |  - SSE streaming       |
                            |  - Session memory map  |
                            |  - pino logging        |
                            +----------+------------+
                                       |
                            +----------v------------+
                            |   LangChain Agent     |
                            |   (createAgent)       |
                            |  - ReAct loop          |
                            |  - System prompt       |
                            |  - Claude Sonnet 4.5   |
                            +----------+------------+
                                       |
                    +------------------+------------------+
                    |                  |                  |
             +------v------+   +------v------+   +------v------+
             |  RAG Tool   |   | Calculator  |   | Web Search  |
             | (rag_search)|   | (math.js)   |   | (Tavily)    |
             +------+------+   +-------------+   +-------------+
                    |
             +------v------+
             | Vector Store |
             |(MemoryVector)|
             +------+------+          +-------------------+
                    |                  | Football Data API |
                    |                  | (P1 stretch)      |
                    |                  | football-data.org |
                    |                  +-------------------+
                    |
    +---------------+---------------+
    |                               |
+---v-----------+          +--------v--------+
| Document      |          | OpenAI          |
| Loader        |          | Embeddings      |
| (DirectoryLoader)        | (text-embedding |
| 5-7 .md files |          |  -3-small)      |
+---+-----------+          +-----------------+
    |
+---v-----------+
| Text Splitter |
| (Recursive    |
|  CharacterTS) |
| 1000 chars,   |
| 200 overlap   |
+---------------+
```

---

## 3. Component Breakdown

### 3.1 Frontend (React + Vite + TypeScript)

- **Role**: Single-page chat interface -- message input, response display with markdown rendering, source citations
- **Communication**: MVP uses POST to `/api/chat` (JSON response). Phase 7 upgrades to `/api/chat/stream` with SSE via `fetch` + `ReadableStream` (not native `EventSource`, since we need POST)
- **Key pieces**:
  - `useChat` hook manages message state, SSE parsing, and abort control
  - `react-markdown` renders agent responses
  - `SourceCitation` component displays document sources beneath RAG-based answers
- **Design foundation**: `ai/guides/external/chatbotUI_claude.md` — provides design tokens (CSS custom properties), layout structure, component CSS, animations. Adapt to Manchester United branding (reds/blacks, "Red Devils Chat" bot name)
- **UI extras**: typing indicator (animated dots), message entrance animations, auto-resize textarea, optional suggested reply chips for common queries
- **No routing, no auth** -- just a chat page

### 3.2 Backend (Node.js + Express)

- **API endpoint**: `POST /api/chat` (MVP: JSON response) or `POST /api/chat/stream` (P1: SSE stream) -- both accept `{ message, conversationId }`
- **SSE setup**: Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`; writes `event:` + `data:` frames using `res.write()`
- **Event types streamed**:
  - `token` -- LLM text chunks
  - `tool_call` -- tool name + input (for transparency)
  - `sources` -- RAG source metadata
  - `done` -- signals stream completion
  - `error` -- error messages
- **Express 5** with native async route handler support (no `express-async-errors` needed), `cors` middleware allowing `http://localhost:5173`
- **Dev runner**: `tsx` (esbuild-based, single dependency, no config file needed)
- **Session management**: `Map<string, { role: string; content: string }[]>` keyed by `conversationId`

### 3.3 Agent (LangChain `createAgent`)

- **Function**: `createAgent` from `"langchain"` -- creates a ReAct agent that handles the tool-calling loop automatically
- **ReAct loop**: LLM reasons about the query -> decides which tool(s) to call -> calls them -> observes results -> repeats until it has enough information -> synthesizes final answer
- **System prompt role**: Defines persona (Red Devils Chat), tool usage guidelines (when to use RAG vs. web search vs. calculator), citation format (`[Source: Document Name -- Section]`), and response style
- **LLM**: `ChatAnthropic` with `claude-sonnet-4-5-20250929`, `temperature: 0`
- **Recursion limit**: Set to 10-15 to prevent infinite tool-calling loops
- **Per-request flow**: (1) look up/create session history, (2) push user message, (3) invoke agent with full history, (4) push assistant response
- **System prompt structure**: Persona definition, tool selection guidance (when to use RAG vs web search vs calculator), source citation format, multi-tool chaining instructions, response style
- **Streaming** (Phase 7): `agent.streamEvents()` with `version: "v2"` yields `on_chat_model_stream`, `on_tool_start`, `on_tool_end` events

### 3.4 Tools

**Error handling pattern (all tools):** Always catch errors internally and return error strings — never throw. This prevents breaking the agent loop and lets the LLM read the error and try a different approach.

**Calculator (`calculator`)**
- Input: math expression string (e.g., `"253/510"`)
- Output: numeric result as string
- Engine: `mathjs.evaluate()` -- sandboxed, no arbitrary code execution
- Use case: goals-per-game ratios, per-90 metrics, win rate percentages

**Web Search (`tavily_search`)**
- Input: search query string
- Output: JSON array of `{ title, url, content, score }`
- Engine: `TavilySearch` from `@langchain/tavily` with `maxResults: 5`
- Use case: transfer news, recent results, anything not in the document corpus
- Domain filtering via `includeDomains`: `["manutd.com", "bbc.co.uk/sport", "premierleague.com", "skysports.com", "espn.com"]`

**RAG Search (`rag_search`)**
- Input: natural language query about Manchester United
- Output: formatted results with source citations (`[Source: filename -- section]`)
- Engine: custom `tool()` wrapping `vectorStore.similaritySearch(query, 4)`
- Use case: any question about club history, player stats, trophies, matches, managers

**Football Data API (`football_data`) -- P1 stretch**
- Input: `{ query_type: "standings" | "fixtures" | "results" | "squad" | "scorers", limit? }`
- Output: formatted text (standings table, match list, squad roster)
- Engine: `DynamicStructuredTool` wrapping `fetch` calls to `football-data.org/v4`
- Includes client-side rate limiter (10 req/min) and response caching
- Takes precedence over web search for current-season PL data (guided via system prompt)
- **Graceful degradation**: If `FOOTBALL_DATA_API_KEY` is not set, tool is excluded from the agent's tool list

### 3.5 RAG Pipeline

```
Documents (5-7 .md files in /documents)
    |
    v
DirectoryLoader (TextLoader per .md file)
    |  -> Document[] with metadata.source = file path
    v
RecursiveCharacterTextSplitter.fromLanguage("markdown")
    |  -> chunkSize: 1000, chunkOverlap: 200
    |  -> Splits on: \n\n, \n, ". ", " "
    |  -> Each chunk inherits parent metadata
    v
OpenAIEmbeddings (text-embedding-3-small, 1536 dims)
    |  -> Embeds each chunk into a vector
    v
MemoryVectorStore.fromDocuments(chunks, embeddings)
    |  -> In-memory, rebuilt on every server start (MVP)
    |  -> ChromaDB for persistence (stretch goal)
    v
similaritySearch(query, k=4) -> top 4 chunks with metadata
```

**Document corpus** (minimum 5):
1. Club History & Timeline
2. Player Legends & Statistics
3. Trophy Cabinet
4. Iconic Matches
5. Managerial History
6. Old Trafford & Club Culture
7. Player Statistics Reference (structured stat tables)

**Metadata enrichment**: After loading, each document's metadata is enriched with `documentName` (human-readable) derived from the filename (strip path, remove extension, replace hyphens with spaces, title-case), enabling clean source attribution in responses.

**Document authoring guidelines**:
- Write with the text splitter in mind — keep paragraphs focused, use headers for topic changes
- Stat-heavy docs should use consistent formats (e.g., "253 goals in 559 appearances" not "scored over 250 goals") so the calculator tool gets clean inputs
- Put tables in their own sections so chunks don't split mid-table
- Keep sections under ~800 characters to stay within a single chunk where possible

### 3.6 Conversation Memory

- **Approach**: Simple message history array maintained per session on the server
- **Implementation**: `Map<string, { role: string; content: string }[]>` keyed by `conversationId`
- **On each request**: push user message to history, invoke agent with full history array, push assistant response to history
- **Context**: enables follow-up questions with pronoun resolution ("Tell me about Rooney" -> "How many goals did he score?")
- **Scope**: in-memory, lost on server restart -- acceptable for MVP
- **No automatic summarization** for MVP; potential context window overflow handled by reasonable turn limits

### 3.7 Logging

- **Library**: pino -- dual output: `pino-pretty` to stdout (dev readability) + file transport to `./logs/app.log` (always raw JSON for AI parsing)
- **Log level**: configurable via `LOG_LEVEL` env var (default: `info`)
- **Log fields**: `{ traceId, requestId, event, tool, input, output, success, durationMs, category }`
  - `traceId` — unique ID linking the full chain: HTTP request → agent → tool calls → response
  - `requestId` — per-HTTP-request ID
  - `success` — boolean for quick failure filtering
  - `category` — `tool`, `agent`, `api`, `embedding`, `error`
- **What gets logged**:
  - Every tool call: `tool_start`, `tool_end` with input/output and success flag
  - Agent lifecycle: `agent_start`, `agent_end`
  - Request metadata via child loggers
  - Errors with full context and category
- **AI-parseable**: logs in `./logs/app.log` can be parsed with `grep`, `jq`, or read directly by AI agents. See `ai/guides/testing.md` for parsing commands.
- **This is a graded requirement**: the assignment requires "structured logging that shows tool calls, arguments, and results"

---

## 4. Data Flow

**Example query**: "Who had a better goals-per-game ratio, Rooney or Ronaldo?"

```
1. USER types question in React chat UI

2. FRONTEND sends POST /api/chat (or /api/chat/stream with SSE in Phase 7)
   Body: { message: "Who had a better goals-per-game ratio...", conversationId: "abc-123" }

3. EXPRESS handler:
   - Looks up/creates session history from Map
   - Pushes user message to history
   - Sets SSE headers on response
   - Invokes agent.streamEvents() with full message history

4. AGENT (ReAct loop - iteration 1):
   - Claude reads system prompt + message history
   - THINKS: "I need Rooney's stats. Let me search the knowledge base."
   - CALLS: rag_search({ query: "Wayne Rooney career goals appearances Manchester United" })
   -> SSE event: tool_start { tool: "rag_search", input: {...} }

5. RAG TOOL:
   - Embeds query via OpenAI text-embedding-3-small
   - Searches MemoryVectorStore, returns top 4 chunks
   - Formats: "[1] Source: player-legends.md\nWayne Rooney: 253 goals in 559 appearances..."
   -> SSE event: tool_end { tool: "rag_search", output: "..." }

6. AGENT (ReAct loop - iteration 2):
   - OBSERVES Rooney's stats
   - THINKS: "Now I need Ronaldo's stats."
   - CALLS: rag_search({ query: "Cristiano Ronaldo career goals appearances Manchester United" })

7. RAG TOOL returns Ronaldo's stats (118 goals, 292 appearances)

8. AGENT (ReAct loop - iteration 3):
   - THINKS: "I have both sets of stats. Let me calculate the ratios."
   - CALLS: calculator({ expression: "253/559" })
   -> Result: "0.4526"
   - CALLS: calculator({ expression: "118/292" })
   -> Result: "0.4041"

9. AGENT (ReAct loop - iteration 4):
   - THINKS: "I have both ratios. Rooney: 0.453, Ronaldo: 0.404. Rooney had the better ratio."
   - SYNTHESIZES final answer with citations
   -> SSE events: token { content: "Wayne Rooney..." } (streamed token by token)

10. EXPRESS:
    - Sends final SSE event: done { finished: true }
    - Pushes assistant response to session history
    - Closes connection

11. FRONTEND:
    - useChat hook parses SSE frames, appends tokens to assistant message
    - On "done", marks message as complete, displays source citations
```

---

## 5. Key Design Decisions

**`createAgent` over `createReactAgent`**
- `createAgent` from `"langchain"` is the course-recommended approach
- Supports `systemPrompt` directly (no need to manually construct message arrays)
- Cleaner API for middleware (e.g., `summarizationMiddleware` for future context management)
- `createReactAgent` from `@langchain/langgraph/prebuilt` also works but requires `recursionLimit` configuration

**`MemoryVectorStore` for MVP**
- Zero configuration -- no external service (Docker, Chroma server) required
- Rebuilds on server restart, but with 5-7 docs (~50-100 chunks), re-embedding takes seconds and costs < $0.01
- ChromaDB (stretch goal) adds persistence so docs survive restarts

**`math.js` over `eval()`**
- `eval()` and `Function()` execute arbitrary JavaScript -- a critical security risk when processing LLM-generated expressions
- `mathjs.evaluate()` runs in a sandboxed expression parser that only does math
- No access to filesystem, network, or `globalThis`

**`TavilySearch` from `@langchain/tavily`**
- Dedicated package (`@langchain/tavily`) over `TavilySearchResults` from `@langchain/community`
- More configuration options: `topic`, `timeRange`, `searchDepth`
- Uses `.invoke({ query })` (vs. `.invoke({ input })` in the older community version)
- Recommended in course slides

**SSE over WebSockets for streaming**
- Unidirectional (server -> client) is all we need -- user sends a request, server streams a response
- Works over standard HTTP -- no upgrade handshake, no connection management
- Native browser support via `EventSource` (though we use `fetch` + `ReadableStream` for POST support)
- Simpler to implement: just `res.write()` with SSE framing
- WebSockets would add complexity (connection lifecycle, heartbeats, reconnection) with no benefit for this use case

**Tool error handling: catch, never throw**
- A thrown error crashes the agent's ReAct loop entirely
- Returning an error string lets the LLM read it and try a different approach (e.g., rephrase the query, try a different tool)
- This is a course requirement from the professor's slides

**Graceful degradation for stretch goal APIs**
- If `FOOTBALL_DATA_API_KEY` is missing, the Football Data tool is excluded from the agent — the agent simply won't have that tool available and will fall back to web search for current-season data
- If `TAVILY_API_KEY` is missing, web search is excluded similarly
- Core tools (calculator, RAG) don't require external API keys beyond embeddings

**Football Data API precedence over web search**
- For current-season Premier League statistics (standings, fixtures, results, scorers), the Football Data API provides structured, authoritative data
- Web search returns scraped snippets that may be inaccurate or outdated
- The system prompt guides the agent to prefer Football Data API for these queries

**OpenAI for embeddings, Claude for reasoning**
- Anthropic does not offer an embeddings model
- `text-embedding-3-small` is fast, cheap ($0.02/1M tokens), and high quality for a small corpus
- Clean separation: OpenAI handles vector math, Claude handles reasoning and tool orchestration

---

## 6. Directory Structure

```
agentic-chatbot/
├── aiDocs/                      # Project documentation
│   ├── prd.md                   # Product requirements
│   ├── mvp.md                   # MVP definition
│   ├── architecture.md          # This document
│   └── context.md               # Quick-reference pointer file
│
├── ai/                          # AI coding guides
│   ├── guides/
│   │   ├── reference/           # Library reference docs
│   │   │   ├── langchain.md
│   │   │   ├── anthropic-claude.md
│   │   │   ├── openai-embeddings.md
│   │   │   ├── tavily-api.md
│   │   │   ├── football-data-api.md
│   │   │   └── supporting-libs.md
│   │   └── external/            # External research & design guides
│   │       ├── chatbotUI_claude.md      # UI design system (design tokens, CSS, components)
│   │       ├── marketResearch_gemini.md
│   │       └── technicalResearch_gemini.md
│   ├── roadmaps/                # Phase plans and roadmaps
│   │   ├── 2026-03-19_high-level-plan.md
│   │   ├── 2026-03-19_phase1-*.md through phase8-*.md
│   │   └── complete/            # Finished phase docs moved here
│   ├── notes/
│   └── changelog.md
│
├── documents/                   # Manchester United corpus (5-7 .md files)
│   ├── club-history.md
│   ├── player-legends.md
│   ├── trophy-cabinet.md
│   ├── iconic-matches.md
│   ├── managerial-history.md
│   ├── old-trafford.md
│   └── player-stats-reference.md
│
├── server/                      # Backend
│   ├── src/
│   │   ├── server.ts            # Express app entry point
│   │   ├── routes/
│   │   │   └── chat.ts          # POST /api/chat (JSON) + /api/chat/stream (SSE, Phase 7)
│   │   ├── agent/
│   │   │   ├── agent.ts         # createAgent setup with system prompt
│   │   │   └── system-prompt.ts # System prompt constant
│   │   ├── tools/
│   │   │   ├── calculator.ts    # math.js calculator tool
│   │   │   ├── web-search.ts    # TavilySearch tool
│   │   │   ├── rag-search.ts    # RAG retrieval tool
│   │   │   └── football-data.ts # Football Data API tool (P1)
│   │   ├── rag/
│   │   │   ├── pipeline.ts      # Load -> split -> embed -> vector store
│   │   │   └── vector-store.ts  # MemoryVectorStore setup
│   │   ├── lib/
│   │   │   ├── football-data-client.ts  # API client for football-data.org
│   │   │   └── rate-limiter.ts          # Rate limiter for external APIs
│   │   └── logger.ts            # pino logger setup
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                    # Frontend (Vite + React + TS)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── SourceCitation.tsx
│   │   ├── hooks/
│   │   │   └── useChat.ts       # SSE streaming hook
│   │   └── types/
│   │       └── chat.ts          # Shared types
│   ├── package.json
│   └── tsconfig.json
│
├── .env                         # API keys (gitignored)
├── .env.example                 # Template for required keys
├── .gitignore
├── package.json                 # Root (workspace or scripts)
└── README.md
```
