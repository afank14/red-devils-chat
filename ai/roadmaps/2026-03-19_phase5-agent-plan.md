# Phase 5 Plan: Agent

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. Solve the current problem with the simplest approach that works.

> **Roadmap:** See `2026-03-19_phase5-agent-roadmap.md` for the execution checklist.
> **High-level plan:** See `2026-03-19_high-level-plan.md` for full project phases.

---

## What

Wire all 3 tools (RAG search, calculator, web search) into a LangChain agent with a system prompt that governs tool selection and source citation behavior. Add conversation memory so follow-up questions work. Expose the agent through an Express API endpoint. Add structured logging for the full agent reasoning chain.

---

## How

### Agent Setup

Use `createAgent` from `"langchain"` with `ChatAnthropic` (`claude-sonnet-4-5-20250929`, `temperature: 0`) as the model. Pass all three tools as an array. The agent handles the ReAct loop automatically — it reasons about the query, selects tool(s), calls them, observes results, and repeats until it can synthesize a final answer.

### System Prompt

The system prompt is the single most important piece for controlling agent behavior. It defines:

- **Persona**: Red Devils Chat, a Manchester United expert assistant
- **Tool selection guidance**: When to use RAG (historical questions, stats, club info), when to use web search (current news, transfer rumors, recent results), when to use calculator (ratios, percentages, comparisons involving math)
- **Source citation format**: Every RAG-based answer must include `[Source: Document Name — Section]`. Web search results cite the source URL/title. Calculator results show the expression evaluated.
- **Multi-tool chaining**: Instruct the agent to gather all needed data before synthesizing (e.g., fetch stats for both players via RAG, then calculate ratios)
- **Response style**: Knowledgeable but concise, always cite sources, never fabricate stats

### Conversation Memory

Simple `messageHistory` array approach — no external memory store, no summarization. On each request:

1. Look up session history from a `Map<string, BaseMessage[]>` keyed by `sessionId`
2. Push the user's message onto the history array
3. Invoke the agent with the full message history
4. Push the assistant's response onto the history array

This enables pronoun resolution in follow-up questions (e.g., "Tell me about Rooney" → "How many goals did he score?").

### Express API Endpoint

`POST /api/chat` endpoint on the Express server (already set up in `server/src/server.ts`):

- JSON body parsing via `express.json()`
- CORS middleware configured to allow the React dev server (port 5173)
- Request body: `{ message: string, conversationId: string }`
- Response: JSON with the agent's final answer and any source citations
- Error responses return appropriate HTTP status codes with error messages

### Structured Logging

Build on the pino logger from Phase 3. Add agent-level lifecycle logging:

- Log `agent_start` with `{ traceId, category: "agent", messageCount }` when agent is invoked
- Log `agent_end` with `{ traceId, category: "agent", success, durationMs }` when agent completes
- Per-request child loggers with `requestId` and `traceId` for full chain tracing (HTTP request → agent → tools → response)
- Tool-level logging already done in Phase 3 — the `traceId` ties them together
- All logs go to both stdout (`pino-pretty` in dev) and `./logs/app.log` (raw JSON for AI parsing)
- See `ai/guides/testing.md` for log format spec and parsing commands

---

## Technical Considerations

- **System prompt quality directly determines agent quality.** Spend time getting the tool selection instructions right. Test with edge cases (ambiguous queries, queries that need multiple tools, queries that need no tools).
- **Session management**: Use a simple `Map` keyed by `conversationId`. Sessions are in-memory and lost on restart — acceptable for MVP.
- **`recursionLimit`**: Set a recursion limit on the agent to prevent infinite tool-calling loops. A reasonable default is 10-15 iterations.
- **Error handling at the API level**: Catch agent errors and return clean JSON error responses. Never let raw stack traces reach the client.
- **No streaming yet**: Phase 5 returns complete responses. SSE streaming is Phase 7.
