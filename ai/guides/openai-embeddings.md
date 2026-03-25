<!-- Generated with context7 (library: /openai/openai-node, /websites/developers_openai_api) -->

# OpenAI Embeddings — Reference Guide

> **Context**: Red Devils Chat uses OpenAI for both the reasoning LLM (`ChatOpenAI` with `gpt-4o`) and embeddings (`text-embedding-3-small`). This doc covers everything needed to embed our Manchester United document corpus for RAG retrieval.

---

## 1. Embeddings API Overview

### What Are Embeddings?

Embeddings convert text into dense numerical vectors (arrays of floating-point numbers) that capture semantic meaning. Texts with similar meaning produce vectors that are close together in vector space, enabling similarity search — the foundation of RAG retrieval.

For our chatbot, we embed each chunk of our Manchester United documents into vectors, store them in a vector store, and at query time embed the user's question and find the most similar document chunks.

### Available Models

| Model | Dimensions (default) | Dimensions (configurable) | Max Input Tokens | Performance | Notes |
|-------|---------------------|--------------------------|-------------------|-------------|-------|
| `text-embedding-3-small` | 1536 | 512, 1536 | 8191 | Good | Best cost/performance ratio |
| `text-embedding-3-large` | 3072 | 256, 1024, 3072 | 8191 | Best | Higher quality, higher cost |
| `text-embedding-ada-002` | 1536 | Not configurable | 8191 | Legacy | Predecessor, no dimension control |

### Pricing (per 1M tokens)

| Model | Price per 1M tokens |
|-------|-------------------|
| `text-embedding-3-small` | $0.02 |
| `text-embedding-3-large` | $0.13 |
| `text-embedding-ada-002` | $0.10 |

> **For our corpus**: 5-7 documents, roughly 50-100 chunks at ~500-1000 tokens each = ~25,000-100,000 tokens total. At `text-embedding-3-small` pricing, that is well under $0.01 to embed the entire corpus. Query embeddings are single sentences — negligible cost.

### Dimension Reduction

The `text-embedding-3-*` models support a `dimensions` parameter that truncates the output vector. Lower dimensions mean:
- Smaller vector store footprint
- Faster similarity search
- Slightly reduced retrieval quality

For our small corpus, the default 1536 dimensions are fine — no need to reduce.

---

## 2. API Usage

### REST API (Direct)

```bash
curl https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Manchester United won the treble in 1999",
    "model": "text-embedding-3-small"
  }'
```

**Response:**

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.0023064255, -0.009327292, ...],
      "index": 0
    }
  ],
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  }
}
```

**Key points:**
- Endpoint: `POST https://api.openai.com/v1/embeddings`
- `input` can be a string or an array of strings (batch embedding)
- The response `data[].embedding` is the vector (array of floats)
- You are billed by `usage.total_tokens`

### Using the `openai` npm Package

```typescript
import OpenAI from "openai";

const openai = new OpenAI(); // reads OPENAI_API_KEY from env

// Embed a single text
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "Wayne Rooney scored 253 goals for Manchester United",
});

const embedding: number[] = response.data[0].embedding;
console.log(`Vector dimensions: ${embedding.length}`); // 1536

// Batch embed multiple texts
const batchResponse = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: [
    "Rooney scored 253 goals in 559 appearances",
    "Ronaldo scored 118 goals in 292 appearances",
    "Cantona scored 82 goals in 185 appearances",
  ],
});

// Each item in data[] corresponds to the input at the same index
batchResponse.data.forEach((item, i) => {
  console.log(`Embedding ${i}: ${item.embedding.length} dimensions`);
});
```

**With custom dimensions:**

```typescript
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "The 1999 Champions League final at Camp Nou",
  dimensions: 512, // reduce from default 1536
});
```

---

## 3. LangChain Integration (Primary Usage)

This is how we actually use embeddings in Red Devils Chat — through LangChain's `OpenAIEmbeddings` class, which wraps the OpenAI API and integrates with LangChain vector stores.

### Installation

```bash
npm install @langchain/openai
```

### Basic Setup

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  // Reads OPENAI_API_KEY from environment automatically
});
```

### Constructor Options

```typescript
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",   // Which model to use
  dimensions: 1536,                   // Optional: reduce dimensions
  batchSize: 512,                     // Max texts per API call (default 512)
  stripNewLines: true,                // Replace \n with spaces (default true)
  maxRetries: 3,                      // Retry on rate limit (default 3)
});
```

### Core Methods

```typescript
// Embed a single query (user question at search time)
const queryVector: number[] = await embeddings.embedQuery(
  "How many league titles has United won?"
);

// Embed multiple documents (at indexing time)
const docVectors: number[][] = await embeddings.embedDocuments([
  "Manchester United have won 20 league titles...",
  "The club was founded as Newton Heath in 1878...",
  "Sir Alex Ferguson managed United from 1986 to 2013...",
]);
```

### Integration with MemoryVectorStore (MVP)

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

// Create vector store from documents
const documents: Document[] = [
  new Document({
    pageContent: "Wayne Rooney is Manchester United's all-time top scorer with 253 goals...",
    metadata: { source: "Player Legends & Statistics", section: "Wayne Rooney" },
  }),
  new Document({
    pageContent: "The 1999 UEFA Champions League Final was played at Camp Nou...",
    metadata: { source: "Iconic Matches", section: "1999 Champions League Final" },
  }),
];

const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

// Similarity search — returns most relevant chunks
const results = await vectorStore.similaritySearch(
  "Who is United's top scorer?",
  3 // return top 3 results
);

results.forEach((doc) => {
  console.log(`[${doc.metadata.source}] ${doc.pageContent.slice(0, 100)}...`);
});
```

### Integration with ChromaDB (Stretch Goal — Persistent Storage)

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

// Create persistent vector store
const vectorStore = await Chroma.fromDocuments(documents, embeddings, {
  collectionName: "man-utd-docs",
  url: "http://localhost:8000", // ChromaDB server
});

// Later: load existing collection (no re-embedding needed)
const existingStore = new Chroma(embeddings, {
  collectionName: "man-utd-docs",
  url: "http://localhost:8000",
});
```

---

## 4. Chunking Strategies for RAG

### Why Chunking Matters

Chunking is the process of splitting documents into smaller pieces before embedding. It directly impacts retrieval quality:

- **Chunks too large** → embeddings become diluted, covering multiple topics. A query about Rooney might retrieve a 5,000-word document covering all players — the relevant Rooney paragraph is lost in noise.
- **Chunks too small** → embeddings lack context. A sentence fragment like "scored 253 goals" has no indication it refers to Rooney or Manchester United.
- **Right-sized chunks** → each chunk covers a single coherent topic with enough context to be meaningfully matched.

### Recommended Chunk Sizes for Our Use Case

| Parameter | Recommended Value | Rationale |
|-----------|------------------|-----------|
| `chunkSize` | 500–1000 characters | Large enough for a full paragraph with context; small enough for focused retrieval |
| `chunkOverlap` | 100–200 characters | Prevents losing information that spans chunk boundaries |

> **Note**: LangChain's `RecursiveCharacterTextSplitter` measures in *characters* by default, not tokens. 1000 characters is roughly 200-250 tokens. For our model's 8191 token input limit, this is well within bounds.

### Overlap Strategy

Overlap ensures that sentences or facts at chunk boundaries are not split across two chunks and lost:

```
Document: "...Rooney scored his 253rd goal in April 2017. | This made him the all-time top scorer. | He surpassed Bobby Charlton's record..."

Without overlap (chunk boundary at |):
  Chunk 1: "...Rooney scored his 253rd goal in April 2017."
  Chunk 2: "He surpassed Bobby Charlton's record..."
  → Query "who did Rooney surpass?" finds Chunk 2, but lacks context about the 253 goals

With 100-char overlap:
  Chunk 1: "...Rooney scored his 253rd goal in April 2017. This made him the all-time top scorer."
  Chunk 2: "This made him the all-time top scorer. He surpassed Bobby Charlton's record..."
  → Both chunks have the full context
```

### RecursiveCharacterTextSplitter (Recommended)

This is the standard LangChain splitter for most RAG applications. It tries to split on natural boundaries in priority order: `\n\n` (paragraphs) → `\n` (lines) → `. ` (sentences) → ` ` (words) → characters.

```typescript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,     // max characters per chunk
  chunkOverlap: 200,   // overlap between adjacent chunks
  separators: ["\n\n", "\n", ". ", " ", ""], // default priority order
});

// Split a single document
const chunks = await splitter.createDocuments(
  ["Full text of the Player Legends document..."],
  [{ source: "Player Legends & Statistics" }] // metadata applied to all chunks
);

// Split with per-chunk metadata
const docs = await splitter.splitDocuments([
  new Document({
    pageContent: fullText,
    metadata: { source: "Trophy Cabinet", type: "history" },
  }),
]);
// Each chunk inherits the parent document's metadata
```

### Other Splitter Options

| Splitter | When to Use | Notes |
|----------|------------|-------|
| `RecursiveCharacterTextSplitter` | General prose (history, match reports, biographies) | Our default — handles most documents well |
| `MarkdownHeaderTextSplitter` | Documents structured with markdown headers | Splits by `#`, `##`, `###` and adds header info to metadata |
| `TokenTextSplitter` | When you need precise token-count control | Splits by token count rather than characters |

### Special Considerations for Our Corpus

**Structured stat tables** (Player Statistics Reference):

Stat tables need different treatment than prose. If a table row like `| Rooney | 253 | 559 | 0.453 |` gets split mid-row or separated from its header, retrieval fails.

```typescript
// For stat-heavy documents, use smaller chunks and markdown-aware splitting
const statSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,       // smaller to keep individual stat blocks together
  chunkOverlap: 100,
  separators: ["\n\n", "\n", ""], // don't split on ". " — preserve table rows
});
```

**Prose documents** (Club History, Iconic Matches):

These split naturally with the default splitter. Each paragraph tends to cover a self-contained topic.

```typescript
const proseSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
```

**Preserving metadata across chunks:**

Every chunk should carry metadata identifying its source document and section. This powers source attribution in responses.

```typescript
import { Document } from "@langchain/core/documents";

// When creating documents for splitting, include rich metadata
const doc = new Document({
  pageContent: rawText,
  metadata: {
    source: "Player Legends & Statistics",
    section: "Wayne Rooney",
    type: "player-stats",
  },
});

// After splitting, each chunk retains this metadata
const chunks = await splitter.splitDocuments([doc]);
// chunks[0].metadata = { source: "Player Legends & Statistics", section: "Wayne Rooney", type: "player-stats" }
```

---

## 5. Model Recommendation

### Our choice: `text-embedding-3-small`

For Red Devils Chat (5-7 documents, small corpus), `text-embedding-3-small` is the right model.

| Factor | text-embedding-3-small | text-embedding-3-large | Verdict |
|--------|----------------------|----------------------|---------|
| **Cost** | $0.02 / 1M tokens | $0.13 / 1M tokens | 6.5x cheaper. Our corpus costs <$0.01 either way, but queries add up |
| **Speed** | Faster | Slower | Faster embedding = faster indexing and query response |
| **Quality** | Strong for English text retrieval | Marginally better on benchmarks | Difference is negligible for a small, focused, English-only corpus |
| **Dimensions** | 1536 default | 3072 default | Smaller vectors = less memory, faster similarity search |
| **Our corpus** | 5-7 focused documents about one topic | Overkill | A small, thematically coherent corpus does not need the extra quality |

### When to Reconsider

- If retrieval quality is poor on specific queries during testing, try `text-embedding-3-large` as a quick experiment
- If the corpus grows significantly (100+ documents, multi-topic), the larger model may provide better discrimination
- If you implement hybrid search (P2), the embedding model matters less since BM25 handles exact-match retrieval

---

## 6. Environment Setup

### Required Environment Variable

```
OPENAI_API_KEY=sk-proj-...
```

Both the `openai` npm package and `@langchain/openai` read this automatically from `process.env.OPENAI_API_KEY`.

### .env File Setup

```bash
# .env (project root)

# OpenAI — used for both LLM reasoning and embeddings
OPENAI_API_KEY=sk-proj-your-key-here

# Tavily — used for web search tool
TAVILY_API_KEY=tvly-your-key-here
```

### Loading .env in the Application

```typescript
// At the top of your entry point (e.g., src/index.ts)
import "dotenv/config";

// Or explicitly:
import dotenv from "dotenv";
dotenv.config();
```

### Install dotenv

```bash
npm install dotenv
```

### .gitignore

Make sure `.env` is in your `.gitignore`:

```
# .gitignore
.env
.env.local
```

### Verifying the Key Works

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

try {
  const result = await embeddings.embedQuery("test");
  console.log(`OpenAI embeddings working. Vector length: ${result.length}`);
} catch (error) {
  console.error("OpenAI API key issue:", error);
}
```

---

## Quick Reference: Copy-Paste Setup

The minimal code to get embeddings working in Red Devils Chat:

```typescript
import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";

// 1. Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

// 2. Create splitter
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

// 3. Split documents
const rawDocs: Document[] = [
  new Document({
    pageContent: "Full text of document here...",
    metadata: { source: "Club History", section: "Overview" },
  }),
  // ... more documents
];

const splitDocs = await splitter.splitDocuments(rawDocs);

// 4. Create vector store (embeds all chunks)
const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);

// 5. Search
const results = await vectorStore.similaritySearch("1999 Champions League final", 3);
console.log(results);
```

### Required Packages

```bash
npm install @langchain/openai @langchain/textsplitters @langchain/core langchain dotenv
```
