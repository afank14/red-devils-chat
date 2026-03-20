# Product Requirements Document: Red Devils Chat

## Project Description

Red Devils Chat is an AI-powered conversational agent built for Manchester United fans who want instant, accurate answers about the club's history, players, statistics, and current affairs. Whether it's comparing Rooney's goals-per-game ratio to Ronaldo's, recalling the drama of the 1999 Champions League final, or fetching the latest transfer news, the chatbot delivers sourced, trustworthy responses through a clean web interface.

Built on LangChain.js with a ReAct agent loop, Red Devils Chat goes beyond simple Q&A by reasoning through multi-step queries, pulling from curated club documents with source attribution, searching the live web for current information, and computing statistical comparisons with mathematical precision. It shows its work in real time via streaming, so users can watch the agent think, retrieve, and calculate before delivering its answer.

---

## 1. Problem Statement

Manchester United has over 1.1 billion fans worldwide, yet accessing reliable, comprehensive club information requires jumping between wikis, stats sites, news outlets, and forums. Existing tools are either too broad (general sports chatbots) or too shallow (basic FAQ pages). Fans asking nuanced, multi-step questions — like "Who had a better goals-per-game ratio at United, Rooney or Ronaldo?" — get no single place that retrieves the stats, does the math, and cites its sources.

Red Devils Chat solves this by providing a single conversational interface that combines curated historical knowledge, live web search, and computational tools — all with transparent reasoning and source attribution.

---

## 2. Target Users

### Primary
- **Manchester United fans** — casual to hardcore supporters who want quick, accurate answers about club history, player stats, records, and current news
- **Fantasy football players** — users who need stat comparisons and per-90 metrics to inform decisions

### Secondary
- **Sports journalists and content creators** — need quick fact-checking and stat lookups with citable sources
- **Students of AI/software engineering** — evaluating the project as a reference implementation of agentic RAG patterns

### Not For
- Fans seeking real-time live match commentary
- Users looking for betting odds or gambling advice
- General football fans with no interest in Manchester United specifically

---

## 3. Goals and Success Metrics

| Goal | Success Metric |
|------|---------------|
| Accurate retrieval from curated docs | RAG responses cite correct source documents ≥ 90% of the time |
| Multi-tool reasoning works end-to-end | Agent correctly chains RAG + Calculator for stat comparison queries |
| Conversation memory enables follow-ups | Pronoun resolution and context carry-over work across 5+ turns |
| Transparent agent reasoning | Streaming UI shows tool calls, arguments, and intermediate results |
| Source attribution on every RAG response | Every retrieval-based answer includes document name/section reference |
| Clean, functional web UI | Users can send messages, see streaming responses, and read sources without confusion |

---

## 4. Key Features

### P0 — Core (Must Have)

| Feature | Description |
|---------|-------------|
| **ReAct Agent Loop** | LangChain.js agent using the ReAct pattern to reason about which tool(s) to call for each query |
| **Calculator Tool** | Evaluates math expressions using math.js. Used for stat comparisons (goals per game, per-90 metrics, win rate percentages) |
| **Web Search Tool** | Searches the web via Tavily API for current/recent information not in the document corpus (transfers, recent results, news) |
| **RAG Tool** | Vector similarity search over 5+ curated Manchester United documents. Returns relevant chunks with source metadata (document name, section) |
| **Source Attribution** | Every RAG-based response includes citations indicating which document(s) the information came from |
| **Conversation Memory** | Multi-turn context using LangChain message history. Follow-up questions with pronouns ("when did *he* score that?") resolve correctly |
| **Web UI** | React/TypeScript chat interface with message input, response display, and source citation rendering |
| **Structured Logging** | Backend logs showing tool calls, arguments, results, and agent reasoning steps |

### P1 — Stretch Goals (Extra Credit)

| Feature | Description |
|---------|-------------|
| **Streaming UI** | Server-Sent Events (SSE) streaming that shows the agent's reasoning process in real time — tool calls, observations, and final synthesis visible as they happen |
| **4th Custom Tool: Football Data API** | Queries the football-data.org REST API for current-season Premier League data: standings, fixtures, results, and squad information. Takes precedence over web search for any question about current-season Premier League statistics, table positions, upcoming matches, or recent results — provides structured, authoritative data rather than scraped web snippets |
| **Persistent Vector Store** | Vector store that survives server restarts (ChromaDB with local persistence or similar), so documents don't need re-embedding on every startup |

### P2 — Nice to Have (Post-MVP)

| Feature | Description |
|---------|-------------|
| Hybrid search (BM25 + vector) | Improved retrieval recall for specific names, dates, and exact phrases |
| Citation tooltips in UI | Interactive source citations that expand to show the retrieved chunk |
| Conversation export | Users can export chat history |

---

## 5. User Stories

1. **As a fan**, I want to ask "How many league titles has United won?" and get an accurate answer with a citation to the trophy records document, so I can trust the information.

2. **As a fan**, I want to ask "Who had a better goals-per-game ratio at United, Rooney or Ronaldo?" and have the agent retrieve both players' stats from the documents, calculate each ratio, and present the comparison — so I don't have to look it up and do the math myself.

3. **As a fan**, I want to ask "What's the latest on United's transfer window?" and have the agent search the web for current news, since my curated docs only cover historical information.

4. **As a fan**, I want to ask a follow-up question like "How does that compare to City's spending?" after a transfer question, and have the agent understand what "that" refers to from the conversation history.

5. **As a fan**, I want to ask "Tell me about the 1999 Champions League final" and see the agent's reasoning process streamed in real time — showing it searching the documents, finding the relevant chunk, and synthesizing the response — so I understand how it arrived at the answer.

6. **As a fan**, I want to ask "What was Cantona's goal involvement ratio per 90 minutes?" and have the agent pull Cantona's goals, assists, and minutes from the docs, then use the calculator to compute the per-90 metric.

7. **As a user**, I want to see the source document cited alongside every factual claim, so I can verify information and understand where it came from.

8. **As a developer reviewing the project**, I want to see structured logs of every tool call (tool name, input arguments, output) so I can evaluate the agent's decision-making process.

---

## 6. Out of Scope

- Real-time live match scores or minute-by-minute commentary
- Betting odds, predictions, or gambling features
- Coverage of clubs other than Manchester United (web search may return general football news, but the RAG corpus is United-specific)
- User authentication or personalized profiles
- Mobile-native app (web-responsive is sufficient)
- Voice input/output
- Multilingual support (English only)
- Admin interface for document management (docs are loaded at build/startup time)

---

## 7. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **RAG retrieval misses relevant chunks** | Agent gives incomplete or wrong answers | Careful chunking strategy with overlap; test with known Q&A pairs; consider hybrid search (P2) |
| **LLM hallucination despite RAG grounding** | Agent states "facts" not in any source document | System prompt instructs agent to only cite retrieved information; source attribution makes hallucination visible to users |
| **Calculator tool rarely invoked** | Feels like a checkbox feature | Design docs with structured stat data that naturally invites comparison queries; test with stat-heavy questions |
| **Web search returns low-quality results** | Agent surfaces unreliable news or spam | Tavily supports domain filtering; system prompt can instruct agent to prefer authoritative sources (manutd.com, BBC Sport, premierleague.com) |
| **Context window overflow in long conversations** | Agent loses track of earlier context, responses degrade | Use ConversationSummaryBufferMemory to compress older turns; set reasonable turn limits |
| **Streaming complexity delays delivery** | Core features work but streaming is buggy | Streaming is P1, not P0 — ship working non-streaming version first, layer streaming on top |
| **Document quality limits answer quality** | Poorly structured docs lead to bad retrieval | Invest time in document curation; use consistent formatting with structured stats sections |

---

## 8. Timeline and Milestones

| Phase | Milestone | Key Deliverables |
|-------|-----------|-----------------|
| **Phase 1: Foundation** | Project setup & tooling | Monorepo structure, dependencies installed, .gitignore, context.md, PRD, roadmap |
| **Phase 2: Documents** | Manchester United corpus created | 5+ curated documents (history, legends, stats, trophies, stadium, iconic matches), chunked and formatted |
| **Phase 3: Core Tools** | Calculator + Web Search working | math.js calculator tool, Tavily web search tool, both tested independently |
| **Phase 4: RAG Pipeline** | Vector store + RAG tool working | Document embedding, vector store setup, retrieval tool with source attribution |
| **Phase 5: Agent** | ReAct agent loop complete | LangChain agent with all 3 tools, conversation memory, structured logging |
| **Phase 6: Web UI** | Chat interface functional | React/TypeScript frontend, API endpoint, message display with source citations |
| **Phase 7: Streaming** | Real-time agent reasoning in UI | SSE streaming endpoint, frontend stream rendering showing tool calls and reasoning |
| **Phase 8: Polish** | Final refinements | 4th custom tool, persistent vector store, error handling, README |

---

## Technical Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js / TypeScript |
| Agent Framework | LangChain.js (ReAct agent) |
| LLM | Claude (via @langchain/anthropic) |
| Calculator | math.js |
| Web Search | Tavily API |
| Embeddings | OpenAI text-embedding-3-small via @langchain/openai |
| Vector Store | ChromaDB (local, with persistence for stretch goal) |
| Frontend | React + TypeScript |
| Streaming | Server-Sent Events (SSE) |
| Backend API | Express.js |
| Logging | Structured JSON logging (winston or pino) |

---

## Document Corpus (Minimum 5)

1. **Club History & Timeline** — founding as Newton Heath (1878), key eras, Munich disaster, modern era
2. **Player Legends & Statistics** — profiles with career stats (goals, appearances, assists, minutes) for 15+ key players
3. **Trophy Cabinet** — every major trophy, season, final opponent, scoreline
4. **Iconic Matches** — 1999 CL final, 8-2 vs Arsenal, key derby wins, memorable European nights
5. **Managerial History** — every permanent manager, tenure, win rates, tactical philosophy, trophies won
6. **Old Trafford & Club Culture** — stadium history, the Stretford End, supporter traditions, rivalries
7. **Player Statistics Reference** — structured data tables for stat comparison queries (goals per season, per-90 metrics)
