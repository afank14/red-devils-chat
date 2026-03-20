import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { VectorStore } from "@langchain/core/vectorstores";
import { loadDocuments, splitDocuments } from "./pipeline.js";
import logger from "../logger.js";

const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000";
const COLLECTION_NAME = "red-devils-chat";

let vectorStore: VectorStore | null = null;

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

async function tryChromaDB(): Promise<VectorStore | null> {
  try {
    // Test if ChromaDB is reachable
    const res = await fetch(`${CHROMA_URL}/api/v2/heartbeat`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;

    logger.info({ event: "chroma_connect", category: "embedding", url: CHROMA_URL }, "ChromaDB is reachable");

    // Check if collection already has documents
    const existing = await Chroma.fromExistingCollection(embeddings, {
      collectionName: COLLECTION_NAME,
      url: CHROMA_URL,
    });

    // Test if it has data by doing a small search
    const testResults = await existing.similaritySearch("test", 1);
    if (testResults.length > 0) {
      logger.info(
        { event: "chroma_loaded", category: "embedding", persistent: true },
        "ChromaDB collection loaded (persistent — skipping re-embedding)"
      );
      return existing;
    }

    // Collection exists but empty — populate it
    logger.info({ event: "chroma_populate", category: "embedding" }, "ChromaDB collection empty — populating");
    const docs = await loadDocuments();
    const chunks = await splitDocuments(docs);
    const store = await Chroma.fromDocuments(chunks, embeddings, {
      collectionName: COLLECTION_NAME,
      url: CHROMA_URL,
    });
    logger.info(
      { event: "chroma_populated", category: "embedding", chunkCount: chunks.length, persistent: true },
      `ChromaDB populated with ${chunks.length} chunks (persistent)`
    );
    return store;
  } catch (err) {
    // ChromaDB not available or collection doesn't exist — try creating
    try {
      const docs = await loadDocuments();
      const chunks = await splitDocuments(docs);
      const store = await Chroma.fromDocuments(chunks, embeddings, {
        collectionName: COLLECTION_NAME,
        url: CHROMA_URL,
      });
      logger.info(
        { event: "chroma_created", category: "embedding", chunkCount: chunks.length, persistent: true },
        `ChromaDB collection created with ${chunks.length} chunks (persistent)`
      );
      return store;
    } catch {
      return null;
    }
  }
}

async function fallbackMemoryStore(): Promise<MemoryVectorStore> {
  logger.warn(
    { event: "chroma_fallback", category: "embedding" },
    "ChromaDB unavailable — falling back to in-memory vector store (data will not persist across restarts)"
  );
  const docs = await loadDocuments();
  const chunks = await splitDocuments(docs);
  return MemoryVectorStore.fromDocuments(chunks, embeddings);
}

export async function initVectorStore(): Promise<VectorStore> {
  const start = Date.now();
  logger.info({ event: "vectorstore_init_start", category: "embedding" }, "initializing vector store");

  // Try ChromaDB first, fall back to in-memory
  vectorStore = await tryChromaDB() ?? await fallbackMemoryStore();

  const durationMs = Date.now() - start;
  const storeType = vectorStore instanceof Chroma ? "ChromaDB (persistent)" : "MemoryVectorStore (in-memory)";
  logger.info(
    { event: "vectorstore_init_end", category: "embedding", storeType, durationMs },
    `vector store ready: ${storeType}`
  );

  return vectorStore;
}

export function getVectorStore(): VectorStore {
  if (!vectorStore) {
    throw new Error("Vector store not initialized. Call initVectorStore() first.");
  }
  return vectorStore;
}

export { embeddings };
