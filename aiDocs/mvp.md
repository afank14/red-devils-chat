# MVP Definition: Red Devils Chat

## What "Done" Looks Like

A working chatbot where a user can open a web page, type a question about Manchester United, and receive an accurate, sourced response. The agent reasons through which tool(s) to use, executes them, and returns a synthesized answer with citations. Multi-turn conversation works — follow-up questions understand context.

---

## MVP Scope (P0 Features Only)

### 1. ReAct Agent with 3 Core Tools

The agent uses the ReAct pattern via LangChain.js to decide which tool(s) to invoke per query.

**Calculator Tool**
- Accepts math expressions as strings, evaluates via math.js
- Used for: goals-per-game ratios, per-90 metrics, win rate percentages, stat comparisons
- Example: `"253 / 510"` → `0.496`

**Web Search Tool**
- Searches the web via Tavily API
- Used for: transfer news, recent match results, current events not in the document corpus
- Returns: search results with titles, snippets, and URLs

**RAG Tool**
- Vector similarity search over 5+ curated Manchester United documents
- Returns: relevant text chunks with source metadata (document name, section)
- Every response that uses retrieved information must include source attribution

### 2. Document Corpus (Minimum 5 Documents)

| Document | Content | Purpose |
|----------|---------|---------|
| Club History & Timeline | Founding (1878), key eras, Munich disaster, Busby, Ferguson, modern era | Narrative questions about the club |
| Player Legends & Statistics | Profiles with career stats (goals, apps, assists, minutes) for 15+ players | Stat lookups and calculator input |
| Trophy Cabinet | Every major trophy with season, competition, opponent, scoreline | Trophy/record queries |
| Iconic Matches | 1999 CL final, key derbies, memorable European nights | Match-specific questions |
| Managerial History | Every permanent manager, tenure, trophies, philosophy | Manager comparisons and era questions |
| Old Trafford & Club Culture | Stadium history, Stretford End, rivalries, supporter traditions | Cultural/stadium questions |
| Player Statistics Reference | Structured stat tables for comparison queries | Calculator tool input data |

### 3. Conversation Memory

- Multi-turn context using LangChain message history
- Follow-up questions work: "Tell me about Rooney" → "How many goals did he score?" (agent understands "he" = Rooney)
- Memory persists within a session (not across browser refreshes for MVP)

### 4. Web UI

- React/TypeScript single-page chat interface
- Message input field + send button
- Response display with markdown rendering
- Source citations displayed beneath RAG-based responses
- No auth, no routing — just a chat page

### 5. Structured Logging

- Every tool call logged with: tool name, input arguments, output/result
- Agent reasoning steps logged (which tool was selected and why)
- Logs output as structured JSON (winston or pino)
- Viewable in server console during development

### 6. Source Attribution

- Every RAG-based answer includes the source document name and section
- Format: inline citation or footer reference (e.g., *[Source: Player Legends & Statistics — Wayne Rooney]*)
- If the agent synthesizes across multiple documents, all sources are cited

---

## What MVP Does NOT Include

These are deferred to stretch goals (P1) or post-MVP (P2):

- ~~Streaming UI~~ — responses return as complete messages (P1)
- ~~4th tool (Football Data API)~~ — web search covers current info for now (P1)
- ~~Persistent vector store~~ — documents re-embed on server restart (P1)
- ~~Hybrid search~~ — vector similarity only (P2)
- ~~Citation tooltips~~ — plain text citations (P2)
- ~~Conversation export~~ (P2)

---

## MVP User Flows

### Flow 1: Historical Question (RAG only)
```
User: "How many league titles has United won?"
Agent: [thinks] → calls RAG tool → retrieves trophy cabinet chunk
→ "Manchester United have won 20 league titles... [Source: Trophy Cabinet]"
```

### Flow 2: Stat Comparison (RAG + Calculator)
```
User: "Who had a better goals-per-game ratio, Rooney or Ronaldo?"
Agent: [thinks] → calls RAG tool for Rooney stats → calls RAG tool for Ronaldo stats
→ calls Calculator("253/510") → calls Calculator("118/292")
→ "Rooney: 0.496 goals/game. Ronaldo: 0.404 goals/game. Rooney had the better ratio.
   [Source: Player Legends & Statistics]"
```

### Flow 3: Current News (Web Search)
```
User: "What's the latest on United's transfer targets?"
Agent: [thinks] → calls Web Search tool
→ "According to recent reports... [Source: BBC Sport, via Tavily]"
```

### Flow 4: Follow-up Question (Memory)
```
User: "Tell me about the 1999 Champions League final"
Agent: → RAG → detailed response with sources
User: "Who scored the goals?"
Agent: → understands context → RAG → "Sheringham and Solskjaer scored..."
```

---

## Technical MVP Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js + TypeScript | Assignment requirement, type safety |
| Agent | LangChain.js ReAct agent | Assignment requirement, built-in tool orchestration |
| LLM | Claude via @langchain/anthropic | Primary reasoning model |
| Embeddings | OpenAI text-embedding-3-small via @langchain/openai | Fast, cheap, good quality for this corpus size |
| Vector Store | MemoryVectorStore (@langchain/classic) | Simplest option for MVP; ChromaDB for persistence stretch goal |
| Calculator | math.js | Robust expression evaluation |
| Web Search | Tavily API via @langchain/community | LangChain integration available |
| Frontend | React + TypeScript (Vite) | Fast dev setup, clean UI |
| Backend | Express.js | Simple REST API for chat endpoint |
| Logging | pino or winston | Structured JSON output |

---

## Definition of Done Checklist

- [ ] User can type a question and receive a response in the web UI
- [ ] Agent correctly selects RAG tool for historical questions
- [ ] Agent correctly selects Calculator tool for math/stat comparisons
- [ ] Agent correctly selects Web Search for current events
- [ ] Agent chains multiple tools when needed (RAG → Calculator)
- [ ] RAG responses include source document citations
- [ ] Follow-up questions resolve correctly (conversation memory works)
- [ ] Structured logs show tool calls with arguments and results
- [ ] 5+ Manchester United documents are embedded and searchable
- [ ] Project runs with `npm run dev` (or similar single command)
