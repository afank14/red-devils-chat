# Phase 4 Plan: RAG Pipeline

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. MemoryVectorStore is fine for MVP — don't add ChromaDB or persistence until the stretch goal phase.

> **Roadmap:** See [2026-03-19_phase4-rag-pipeline-roadmap.md](./2026-03-19_phase4-rag-pipeline-roadmap.md) for the execution checklist.
> **High-level plan:** See [2026-03-19_high-level-plan.md](./2026-03-19_high-level-plan.md) for how this phase fits into the overall project.

---

## What

Build the full RAG pipeline: load the Manchester United document corpus, split it into chunks, embed with OpenAI, store in an in-memory vector store, and expose it as a tool the agent can call. The tool must return results with source attribution so the agent can cite which document the information came from.

---

## How

### Document Loading (`server/src/rag/pipeline.ts`)

Use `DirectoryLoader` from `langchain/document_loaders/fs/directory` pointed at the `documents/` folder, with `TextLoader` for `.md` files. This produces a `Document[]` where each document's `metadata.source` is the file path.

After loading, enrich each document's metadata with a `documentName` field — a human-readable name derived from the filename (e.g., `documents/player-legends.md` becomes `"Player Legends"`). This is what shows up in source citations.

### Splitting

Use `RecursiveCharacterTextSplitter` with markdown-aware separators. Configure `chunkSize: 1000` and `chunkOverlap: 200`. The markdown-aware approach splits on `\n\n`, then `\n`, then `". "`, then `" "` — preserving semantic boundaries like paragraphs and sections. Each chunk inherits the parent document's metadata (including `documentName`).

### Embedding

Use `OpenAIEmbeddings` from `@langchain/openai` with model `text-embedding-3-small` (1536 dimensions). This embeds each chunk into a vector for similarity search.

### Vector Store (`server/src/rag/vector-store.ts`)

Use `MemoryVectorStore.fromDocuments(chunks, embeddings)` to build the store. This is in-memory and rebuilds on every server start — with 5-7 docs producing ~50-100 chunks, this takes seconds and costs pennies.

### RAG Tool (`server/src/tools/rag-search.ts`)

Define a tool using `tool` from `@langchain/core/tools` named `rag_search`. The Zod schema takes a `query` string. The implementation calls `vectorStore.similaritySearch(query, 4)` to get the top 4 chunks, then formats the results with source metadata.

Output format for each result: `[n] Source: Document Name\nContent text here...`

This format lets the agent see which document each chunk came from and cite it in the final response using the format `[Source: Document Name — Section]`.

---

## Technical Considerations

### Chunk size matters

Too small (~200 chars) and chunks lose context — a stat without the player name, a year without the event. Too large (~3000 chars) and retrieval gets noisy — irrelevant content dilutes the relevant part. 1000 chars with 200 overlap is a solid default for markdown content with mixed paragraphs and tables.

### Metadata enrichment

The raw `metadata.source` from DirectoryLoader is a file path like `documents/player-legends.md`. The agent and user don't want to see file paths — they want "Player Legends." Derive `documentName` from the filename by stripping the path, removing the extension, replacing hyphens with spaces, and title-casing. Do this once after loading, before splitting, so every chunk inherits it.

### Source attribution in tool output

The RAG tool output must include the document name for each result. Without this, the agent has no way to cite sources. The format should be clear and consistent so the agent can parse it and include citations in the final response. Number each result so the agent can reference specific ones.

### Test with known Q&A pairs

After building the pipeline, test retrieval quality with questions where the expected source document is known. "How many league titles has United won?" should retrieve chunks from the trophy cabinet document. "Who is United's all-time top scorer?" should retrieve chunks from player legends or player stats. If retrieval is off, the problem is usually chunk size, document quality, or query phrasing — not the embedding model.
