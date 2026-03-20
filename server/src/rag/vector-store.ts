import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { loadDocuments, splitDocuments } from "./pipeline.js";
import logger from "../logger.js";

let vectorStore: MemoryVectorStore | null = null;

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

export async function initVectorStore(): Promise<MemoryVectorStore> {
  const start = Date.now();
  logger.info({ event: "vectorstore_init_start", category: "embedding" }, "initializing vector store");

  const docs = await loadDocuments();
  const chunks = await splitDocuments(docs);
  vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);

  const durationMs = Date.now() - start;
  logger.info(
    { event: "vectorstore_init_end", category: "embedding", chunkCount: chunks.length, durationMs },
    `vector store ready with ${chunks.length} chunks`
  );

  return vectorStore;
}

export function getVectorStore(): MemoryVectorStore {
  if (!vectorStore) {
    throw new Error("Vector store not initialized. Call initVectorStore() first.");
  }
  return vectorStore;
}

export { embeddings };
