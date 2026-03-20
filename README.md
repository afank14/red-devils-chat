# Red Devils Chat

An agentic, RAG-powered chatbot for Manchester United fans. Built with LangChain.js, OpenAI, and React.

Ask about club history, compare player stats, get the latest transfer news, or check the Premier League table — all from a single conversational interface with source attribution and transparent AI reasoning.

## Features

### Core (P0)
- **ReAct Agent Loop** — LangChain.js `createAgent` reasons about which tool(s) to call per query
- **3 Core Tools**
  - **Calculator** — evaluates math expressions (goals-per-game ratios, per-90 metrics) via math.js
  - **Web Search** — searches the web via Tavily for current news, transfers, and recent results
  - **RAG** — vector similarity search over curated Manchester United documents with source citations
- **Conversation Memory** — multi-turn context; follow-up questions with pronoun resolution
- **Web UI** — React/TypeScript chat interface with markdown rendering and source citation display
- **Structured Logging** — every tool call logged with name, arguments, results, and duration (pino)

### Stretch Goals (P1)
- **Streaming** — watch the agent think, retrieve, and calculate in real time via SSE
- **Football Data API** — live Premier League standings, fixtures, and squad data via football-data.org
- **Persistent Vector Store** — ChromaDB so documents survive server restarts

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js + TypeScript |
| Agent Framework | LangChain.js (`createAgent` from `langchain`) |
| LLM | OpenAI GPT-4o (via `@langchain/openai`) |
| Embeddings | OpenAI `text-embedding-3-small` (via `@langchain/openai`) |
| Vector Store | MemoryVectorStore (`@langchain/classic`) |
| Web Search | TavilySearch (`@langchain/tavily`) |
| Calculator | math.js |
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + Express 5 |
| Streaming | Server-Sent Events (SSE) |
| Logging | pino (structured JSON to stdout + `./logs/app.log`) |

## Prerequisites

- Node.js 18+
- API keys for:
  - [OpenAI](https://platform.openai.com/) (LLM and embeddings)
  - [Tavily](https://app.tavily.com/) (web search)
  - [football-data.org](https://www.football-data.org/) (stretch goal — free tier)

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
FOOTBALL_DATA_API_KEY=your-key-here    # Optional (stretch goal)
LOG_LEVEL=info                          # trace, debug, info, warn, error
```

## Running

```bash
# Start the backend (from server/)
cd server
npm run dev

# In a separate terminal, start the frontend (from frontend/)
cd frontend
npm run dev
```

The backend runs on `http://localhost:3000` and the frontend on `http://localhost:5173`.

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
├── documents/                   # Manchester United corpus (5-7 .md files)
│
├── server/                      # Node.js + Express backend
│   └── src/
│       ├── agent/               # createAgent setup + system prompt
│       ├── tools/               # Calculator, RAG, web search, Football Data API
│       ├── rag/                 # Document loading, splitting, embedding, vector store
│       ├── routes/              # POST /api/chat, POST /api/chat/stream
│       └── logger.ts            # pino structured logging
│
├── frontend/                    # React + Vite + TypeScript
│   └── src/
│       ├── components/          # ChatWindow, MessageBubble, ChatInput, SourceCitation
│       ├── hooks/               # useChat (SSE streaming)
│       └── types/               # Shared TypeScript types
│
├── logs/                        # Application logs (gitignored)
├── .env.example                 # Environment variable template
├── .gitignore
└── README.md
```

## Example Queries

- "How many league titles has United won?"
- "Who had a better goals-per-game ratio at United, Rooney or Ronaldo?"
- "Tell me about the 1999 Champions League final"
- "What's the latest on United's transfer window?"
- "What was Cantona's goal involvement ratio per 90 minutes?"
- "Where does United sit in the Premier League table?" *(stretch goal — Football Data API)*

## Document Corpus

The RAG tool searches over curated Manchester United documents covering:

1. **Club History & Timeline** — founding (1878), key eras, Munich disaster, modern era
2. **Player Legends & Statistics** — career stats for 15+ key players (goals, appearances, assists, minutes)
3. **Trophy Cabinet** — every major trophy with season, competition, opponent, scoreline
4. **Iconic Matches** — 1999 CL final, 8-2 vs Arsenal, key derbies, European nights
5. **Managerial History** — every permanent manager, tenure, trophies, philosophy
6. **Old Trafford & Club Culture** — stadium history, Stretford End, rivalries, traditions
7. **Player Statistics Reference** — structured stat tables for calculator-friendly comparison queries
