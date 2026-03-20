# Red Devils Chat

An agentic, RAG-powered chatbot for Manchester United fans. Built with LangChain.js, OpenAI, and React.

Ask about club history, compare player stats, get the latest transfer news, or check the Premier League table — all from a single conversational interface with source attribution and transparent AI reasoning.

## Features

### Core
- **ReAct Agent Loop** — LangChain.js `createAgent` reasons about which tool(s) to call per query
- **4 Tools**
  - **RAG Search** — vector similarity search over 7 curated Manchester United documents (299 chunks) with source citations
  - **Calculator** — evaluates math expressions (goals-per-game ratios, per-90 metrics) via math.js with sandbox security
  - **Web Search** — searches the web via Tavily for current news, transfers, and recent results
  - **Football Data API** — live Premier League standings, fixtures, results, squad, and top scorers via football-data.org
- **Conversation Memory** — multi-turn context; follow-up questions with pronoun resolution
- **Web UI** — React/TypeScript chat interface with markdown rendering, dark theme, Man United branding
- **SSE Streaming** — tokens stream to the UI in real time with tool call indicators (Searching knowledge base, Calculating, etc.)
- **Persistent Vector Store** — ChromaDB stores embeddings across server restarts (falls back to in-memory if unavailable)
- **Structured Logging** — every tool call logged with traceId, name, arguments, results, and duration (pino → `logs/app.log`)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js + TypeScript |
| Agent Framework | LangChain.js (`createAgent` from `langchain`) |
| LLM | OpenAI GPT-4o (via `@langchain/openai`) |
| Embeddings | OpenAI `text-embedding-3-small` (via `@langchain/openai`) |
| Vector Store | ChromaDB (persistent) / MemoryVectorStore (fallback) |
| Web Search | TavilySearch (`@langchain/tavily`) |
| Calculator | math.js |
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + Express 5 |
| Streaming | Server-Sent Events (SSE) |
| Logging | pino (structured JSON to stdout + `./logs/app.log`) |

| Football Data | [football-data.org](https://www.football-data.org/) v4 API |

## Prerequisites

- Node.js 18+
- API keys for:
  - [OpenAI](https://platform.openai.com/) (LLM and embeddings)
  - [Tavily](https://app.tavily.com/) (web search)
  - [football-data.org](https://www.football-data.org/) (live PL data — free tier)
- Optional: [Docker](https://www.docker.com/) for ChromaDB persistent vector store

## Setup

```bash
# Clone the repo
git clone https://github.com/afank14/red-devils-chat.git
cd red-devils-chat

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables (from project root)
cd ..
cp .env.example .env
# Edit .env with your API keys
```

## Environment Variables

```
OPENAI_API_KEY=your-key-here
TAVILY_API_KEY=your-key-here
FOOTBALL_DATA_API_KEY=your-key-here
CHROMA_URL=http://localhost:8000        # Optional — falls back to in-memory if unavailable
PORT=3000
LOG_LEVEL=info                          # trace, debug, info, warn, error
```

## Running

```bash
# Option 1: Use the dev script (starts both servers)
source .env && ./scripts/dev.sh

# Option 2: Start manually
cd server && npm run dev    # Backend on http://localhost:3000
cd frontend && npm run dev  # Frontend on http://localhost:5173
```

### Optional: Enable Persistent Vector Store

```bash
# Start ChromaDB (embeddings survive server restarts)
docker run -d --name chromadb -p 8000:8000 chromadb/chroma

# First server start: embeds and stores 299 chunks
# Subsequent starts: loads from ChromaDB (skips re-embedding)
```

Without Docker/ChromaDB, the app falls back to an in-memory vector store automatically.

## Testing

```bash
# Run the full 26-test integration suite
source .testEnvVars && ./scripts/test.sh
```

Tests cover: health endpoint, input validation (6 tests), all 4 tools, SSE streaming, conversation memory, and structured log verification. See `ai/guides/testing.md` for details.

## Project Structure

```
red-devils-chat/
├── aiDocs/                      # Project planning docs
│   ├── prd.md                   # Product Requirements Document
│   ├── mvp.md                   # MVP definition & done checklist
│   ├── architecture.md          # System architecture & design decisions
│   └── context.md               # Quick-reference pointer file
│
├── ai/                          # AI-assisted development
│   ├── guides/
│   │   ├── reference/           # API reference docs (LangChain, OpenAI, etc.)
│   │   └── external/            # Market research, technical research, UI design guide
│   ├── roadmaps/                # Phase plans and roadmaps
│   │   └── complete/            # Finished phases moved here
│   ├── notes/
│   └── changelog.md
│
├── documents/                   # Manchester United corpus (7 .md files, 299 chunks)
│
├── server/                      # Node.js + Express backend
│   └── src/
│       ├── agent/               # createAgent setup, system prompt, callbacks
│       ├── tools/               # Calculator, RAG, web search, Football Data API
│       ├── rag/                 # Document loading, splitting, embedding, vector store
│       ├── routes/              # POST /api/chat, POST /api/chat/stream (SSE)
│       └── logger.ts            # pino structured logging (stdout + file)
│
├── frontend/                    # React + Vite + TypeScript
│   └── src/
│       ├── components/          # ChatWindow, MessageBubble, ChatInput, ToolIndicator
│       └── types/               # Message types
│
├── scripts/                     # CLI scripts
│   ├── test.sh                  # 26-test integration suite
│   ├── dev.sh                   # Start both servers
│   ├── build.sh                 # Type-check + build
│   └── run.sh                   # Start backend only
│
├── logs/                        # Structured JSON logs (gitignored)
├── .env.example                 # Environment variable template
├── .testEnvVars                 # Test environment config (gitignored)
├── .gitignore
└── README.md
```

## Example Queries

- "How many league titles has United won?"
- "Who had a better goals-per-game ratio at United, Rooney or Ronaldo?"
- "Tell me about the 1999 Champions League final"
- "What's the latest on United's transfer window?"
- "What was Cantona's goal involvement ratio per 90 minutes?"
- "Where does United sit in the Premier League table?"
- "What are United's next 3 fixtures?"
- "Who are the top Premier League scorers this season?"

## Document Corpus

The RAG tool searches over curated Manchester United documents covering:

1. **Club History & Timeline** — founding (1878), key eras, Munich disaster, modern era
2. **Player Legends & Statistics** — career stats for 15+ key players (goals, appearances, assists, minutes)
3. **Trophy Cabinet** — every major trophy with season, competition, opponent, scoreline
4. **Iconic Matches** — 1999 CL final, 8-2 vs Arsenal, key derbies, European nights
5. **Managerial History** — every permanent manager, tenure, trophies, philosophy
6. **Old Trafford & Club Culture** — stadium history, Stretford End, rivalries, traditions
7. **Player Statistics Reference** — structured stat tables for calculator-friendly comparison queries

## Agent Proposal

See [`ai/notes/agent-proposal.md`](ai/notes/agent-proposal.md) — a proposal for applying the agentic pattern to an autonomous scheduling feature in Stride (an AI daily planner).
