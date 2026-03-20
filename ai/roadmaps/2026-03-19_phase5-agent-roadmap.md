# Phase 5 Roadmap: Agent

> **Plan:** See `2026-03-19_phase5-agent-plan.md` for the detailed implementation approach.
> **High-level plan:** See `2026-03-19_high-level-plan.md` for full project phases.
> **Principle:** No over-engineering, no cruft, no legacy-compatibility features. Keep it simple.

---

## Tasks

### Agent Setup
- [ ] Create `server/src/agent/agent.ts` — import `createAgent` from `"langchain"`, `ChatOpenAI` from `@langchain/openai`, and all 3 tools
- [ ] Configure `ChatOpenAI` with `gpt-4o`, `temperature: 0`
- [ ] Pass tools array (rag_search, calculator, tavily_search) to `createAgent`
- [ ] Set `recursionLimit` to prevent infinite loops

### System Prompt
- [ ] Create `server/src/agent/system-prompt.ts` — export the system prompt as a constant string
- [ ] Define persona (Red Devils Chat, Manchester United expert)
- [ ] Add tool selection guidance (RAG for historical/stats, web search for current news, calculator for math)
- [ ] Add citation format instructions (`[Source: Document Name — Section]`)
- [ ] Add multi-tool chaining instructions (gather data first, then synthesize)

### Conversation Memory
- [ ] Create session store: `Map<string, BaseMessage[]>` keyed by `conversationId`
- [ ] On each request: look up or create session history
- [ ] Push user message to history before invoking agent
- [ ] Push assistant response to history after agent completes
- [ ] **Completion**: follow-up questions resolve pronouns correctly (e.g., "Tell me about Rooney" → "How many goals did he score?" understands "he" = Rooney)

### Express API Endpoint
- [ ] Add `POST /api/chat` route in `server/src/routes/chat.ts`
- [ ] Parse JSON body: `{ message: string, conversationId: string }`
- [ ] Configure CORS middleware to allow frontend dev server (port 5173)
- [ ] Invoke agent with message and session history
- [ ] Return JSON response with agent answer and sources
- [ ] Add error handling — return clean error JSON, never raw stack traces
- [ ] **Completion**: `POST /api/chat` returns agent response with correct content type

### Logging
- [ ] Set up pino logger in `server/src/logger.ts` (if not already done)
- [ ] Add per-request child logger with `requestId`
- [ ] Log tool calls: name, input, output (truncated to 500 chars), duration
- [ ] Log agent reasoning chain events
- [ ] Configure `pino-pretty` for development, raw JSON for production
- [ ] **Completion**: server console shows full reasoning chain for each query

### Testing
- [ ] Test: agent selects RAG tool for historical questions (e.g., "How many league titles has United won?")
- [ ] Test: agent selects web search for current events (e.g., "latest Man United transfer news")
- [ ] Test: agent selects calculator for math expressions
- [ ] Test: agent chains RAG + calculator for stat comparisons (e.g., "Who had a better goals-per-game ratio, Rooney or Ronaldo?")
- [ ] Test: follow-up questions resolve pronouns correctly
- [ ] Test: error handling returns clean responses for bad input

### Commit
- [ ] Commit: `"working agent with memory and logging"`
