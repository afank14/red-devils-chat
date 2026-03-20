import { DirectoryLoader } from "@langchain/classic/document_loaders/fs/directory";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import path from "path";
import logger from "../logger.js";

const DOCUMENTS_DIR = path.resolve(__dirname, "../../../documents");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function deriveDocumentName(filePath: string): string {
  const basename = path.basename(filePath, path.extname(filePath));
  return basename
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function loadDocuments(): Promise<Document[]> {
  const start = Date.now();
  logger.info({ event: "rag_load_start", category: "embedding", dir: DOCUMENTS_DIR }, "loading documents");

  const loader = new DirectoryLoader(DOCUMENTS_DIR, {
    ".md": (filePath) => new TextLoader(filePath),
  });

  const docs = await loader.load();

  for (const doc of docs) {
    doc.metadata.documentName = deriveDocumentName(doc.metadata.source);
  }

  const durationMs = Date.now() - start;
  logger.info(
    { event: "rag_load_end", category: "embedding", docCount: docs.length, durationMs },
    `loaded ${docs.length} documents`
  );

  return docs;
}

export async function splitDocuments(docs: Document[]): Promise<Document[]> {
  const start = Date.now();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ["\n---\n", "\n## ", "\n### ", "\n\n", "\n", ". ", " "],
  });

  const chunks = await splitter.splitDocuments(docs);

  const durationMs = Date.now() - start;
  logger.info(
    { event: "rag_split_end", category: "embedding", chunkCount: chunks.length, durationMs },
    `split into ${chunks.length} chunks`
  );

  return chunks;
}

export { DOCUMENTS_DIR, CHUNK_SIZE, CHUNK_OVERLAP, deriveDocumentName };
