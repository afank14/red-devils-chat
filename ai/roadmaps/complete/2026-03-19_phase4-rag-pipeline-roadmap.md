# Phase 4 Roadmap: RAG Pipeline

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. MemoryVectorStore is the right choice for MVP. Don't add persistence, hybrid search, or re-ranking.

> **Plan:** See [2026-03-19_phase4-rag-pipeline-plan.md](./2026-03-19_phase4-rag-pipeline-plan.md) for the detailed approach and technical reasoning.
> **High-level plan:** See [2026-03-19_high-level-plan.md](../2026-03-19_high-level-plan.md) for how this phase fits into the overall project.

---

## Document Loading

- [x] Create `server/src/rag/pipeline.ts`
- [x] Use `DirectoryLoader` with `TextLoader` to load all `.md` files from `documents/`
- [x] Enrich metadata after loading: derive `documentName` from filename (strip path, remove extension, replace hyphens with spaces, title-case)
- [x] Verify: all 7 documents load with correct `metadata.source` and `metadata.documentName`

## Splitting

- [x] Use `RecursiveCharacterTextSplitter` with markdown-aware separators
- [x] Configure `chunkSize: 1000`, `chunkOverlap: 200`
- [x] Verify: documents split into 299 chunks (larger than initial estimate due to substantial docs)
- [x] Verify: each chunk retains parent metadata (`source`, `documentName`)

## Embedding & Vector Store

- [x] Create `server/src/rag/vector-store.ts`
- [x] Use `OpenAIEmbeddings` with model `text-embedding-3-small`
- [x] Build `MemoryVectorStore.fromDocuments(chunks, embeddings)`
- [x] Verify: vector store initializes without errors
- [x] Verify: `similaritySearch("league titles", 4)` returns relevant chunks from Trophy Cabinet doc

## RAG Tool

- [x] Create `server/src/tools/rag-search.ts`
- [x] Define tool using `tool` from `@langchain/core/tools` with Zod schema (single `query` string input)
- [x] Implement: call `vectorStore.similaritySearch(query, 4)`, format results with source metadata
- [x] Output format: `[n] Source: Document Name\nContent text...` for each result
- [x] Write a clear tool description: knowledge base search for Manchester United history, stats, players, trophies, managers
- [x] Wrap in try/catch — return error string on failure, never throw
- [x] Add structured pino log on every call (tool name, input, output truncated, duration)
- [x] Security: query length limit (500 chars), empty/whitespace guard

## Testing

- [x] Query "How many league titles has United won?" — results come from Trophy Cabinet document
- [x] Query "Who is United's all-time top scorer?" — results come from Player Stats Reference document
- [x] Query "Tell me about the 1999 Champions League final" — results come from Iconic Matches document
- [x] Verify RAG tool output includes source document name for every result
- [x] Verify errors return strings, not thrown exceptions (empty, oversized, whitespace queries)
- [x] Confirm logs appear with structured fields (tool, input, output truncated, durationMs)

## Commit

- [x] Commit: "working RAG pipeline with source citations"

## Note

Import path correction: `DirectoryLoader` and `TextLoader` come from `@langchain/classic/document_loaders/fs/...` (not `langchain/document_loaders/fs/...` as originally planned). The `langchain` package no longer exports these subpaths.
