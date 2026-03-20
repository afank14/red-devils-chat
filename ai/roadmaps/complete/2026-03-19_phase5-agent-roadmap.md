# Phase 5 Roadmap: Agent

> **Plan:** See `2026-03-19_phase5-agent-plan.md` for the detailed implementation approach.
> **High-level plan:** See `2026-03-19_high-level-plan.md` for full project phases.
> **Principle:** No over-engineering, no cruft, no legacy-compatibility features. Keep it simple.

---

## Tasks

### Agent Setup
- [x] Create `server/src/agent/agent.ts` — import `createAgent` from `"langchain"`, `ChatOpenAI` from `@langchain/openai`, and all 3 tools
- [x] Configure `ChatOpenAI` with `gpt-4o`, `temperature: 0`
- [x] Pass tools array (rag_search, calculator, tavily_search) to `createAgent`
- [x] Set `recursionLimit: 10` to prevent infinite loops
- [x] Lazy initialization (env vars load before API clients instantiate)

### System Prompt
- [x] Create `server/src/agent/system-prompt.ts` — export the system prompt as a constant string
- [x] Define persona (Red Devils Chat, Manchester United expert)
- [x] Add tool selection guidance (RAG for historical/stats, web search for current news, calculator for math)
- [x] Add citation format instructions (`[Source: Document Name]`)
- [x] Add multi-tool chaining instructions (gather data first, then synthesize)

### Conversation Memory
- [x] Create session store: `Map<string, BaseMessage[]>` keyed by `conversationId`
- [x] On each request: look up or create session history
- [x] Push user message to history before invoking agent
- [x] Push assistant response to history after agent completes
- [x] History trimming (max 50 messages) to prevent context overflow
- [x] Rollback on agent failure (remove pushed HumanMessage)
- [x] **Completion**: follow-up questions resolve pronouns correctly

### Express API Endpoint
- [x] Add `POST /api/chat` route in `server/src/routes/chat.ts`
- [x] Parse JSON body: `{ message: string, conversationId: string }`
- [x] Input validation: message length (2000), conversationId format (alphanumeric/hyphens/underscores — blocks path traversal)
- [x] Invoke agent with message and session history
- [x] Return JSON response with agent answer, conversationId, traceId
- [x] Error handling — return clean error JSON (400/500), never raw stack traces
- [x] **Completion**: `POST /api/chat` returns agent response with correct content type

### Logging
- [x] Logger rewritten with tee stream: raw JSON to both stdout and logs/app.log
- [x] Dev script pipes through pino-pretty for readable console output
- [x] ToolLoggingHandler callback captures ALL tool calls (including TavilySearch) with traceId
- [x] Per-request child logger with requestId and traceId for full chain tracing
- [x] agent_start/agent_end lifecycle logging
- [x] **Completion**: logs verified with grep/jq — traceId propagation confirmed across all tool calls

### Testing
- [x] Test: agent selects RAG tool for historical questions ("1999 Champions League final" → rag_search)
- [x] Test: agent selects web search for current events ("latest transfer news" → tavily_search)
- [x] Test: agent chains RAG + calculator for stat comparisons ("Rooney vs Ronaldo goals-per-game" → rag_search x2 + calculator x2)
- [x] Test: follow-up questions resolve pronouns correctly
- [x] Test: error handling returns clean responses for bad input (8 validation tests passed)
- [x] Test: log analysis confirms correct tool routing with traceId propagation (5/5 checks)

### Commit
- [x] Commit: "working agent with memory and logging"
