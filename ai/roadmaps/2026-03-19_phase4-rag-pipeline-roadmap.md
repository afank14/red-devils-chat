# Phase 4 Roadmap: RAG Pipeline

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. MemoryVectorStore is the right choice for MVP. Don't add persistence, hybrid search, or re-ranking.

> **Plan:** See [2026-03-19_phase4-rag-pipeline-plan.md](./2026-03-19_phase4-rag-pipeline-plan.md) for the detailed approach and technical reasoning.
> **High-level plan:** See [2026-03-19_high-level-plan.md](./2026-03-19_high-level-plan.md) for how this phase fits into the overall project.

---

## Document Loading

- [ ] Create `server/src/rag/pipeline.ts`
- [ ] Use `DirectoryLoader` with `TextLoader` to load all `.md` files from `documents/`
- [ ] Enrich metadata after loading: derive `documentName` from filename (strip path, remove extension, replace hyphens with spaces, title-case)
- [ ] Verify: all 5-7 documents load with correct `metadata.source` and `metadata.documentName`

## Splitting

- [ ] Use `RecursiveCharacterTextSplitter` with markdown-aware separators
- [ ] Configure `chunkSize: 1000`, `chunkOverlap: 200`
- [ ] Verify: documents split into reasonable chunks (~50-100 total across all docs)
- [ ] Verify: each chunk retains parent metadata (`source`, `documentName`)

## Embedding & Vector Store

- [ ] Create `server/src/rag/vector-store.ts`
- [ ] Use `OpenAIEmbeddings` with model `text-embedding-3-small`
- [ ] Build `MemoryVectorStore.fromDocuments(chunks, embeddings)`
- [ ] Verify: vector store initializes without errors
- [ ] Verify: `similaritySearch("league titles", 4)` returns relevant chunks from trophy cabinet doc

## RAG Tool

- [ ] Create `server/src/tools/rag-search.ts`
- [ ] Define tool using `tool` from `@langchain/core/tools` with Zod schema (single `query` string input)
- [ ] Implement: call `vectorStore.similaritySearch(query, 4)`, format results with source metadata
- [ ] Output format: `[n] Source: Document Name\nContent text...` for each result
- [ ] Write a clear tool description: knowledge base search for Manchester United history, stats, players, trophies, managers
- [ ] Wrap in try/catch — return error string on failure, never throw
- [ ] Add structured pino log on every call (tool name, input, output truncated, duration)

## Testing

- [ ] Query "How many league titles has United won?" — results come from trophy cabinet document
- [ ] Query "Who is United's all-time top scorer?" — results come from player legends or player stats document
- [ ] Query "Tell me about the 1999 Champions League final" — results come from iconic matches document
- [ ] Verify RAG tool output includes source document name for every result
- [ ] Verify errors return strings, not thrown exceptions
- [ ] Confirm logs appear with structured fields (tool, input, output truncated, durationMs)

## Commit

- [ ] Commit: "working RAG pipeline with source citations"
