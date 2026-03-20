# LangChain.js Reference Guide for Red Devils Chat

A practical reference for building an agentic RAG chatbot with LangChain.js + TypeScript. All code examples are TypeScript-first and copy-paste ready.

---

## Table of Contents

1. [ChatOpenAI (LLM Setup)](#1-chatopenai-llm-setup)
2. [Creating a ReAct Agent](#2-creating-a-react-agent)
3. [Defining Custom Tools](#3-defining-custom-tools)
4. [Document Loading](#4-document-loading)
5. [Text Splitting / Chunking](#5-text-splitting--chunking)
6. [Embeddings Setup](#6-embeddings-setup)
7. [Vector Stores](#7-vector-stores)
8. [RAG Chain / Retrieval Tool](#8-rag-chain--retrieval-tool)
9. [Conversation Memory](#9-conversation-memory)
10. [Streaming](#10-streaming)

---

## 1. ChatOpenAI (LLM Setup)

### Install

```bash
npm install @langchain/openai
```

### Code

```typescript
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
  maxTokens: 4096,
  apiKey: process.env.OPENAI_API_KEY,
});

// Basic invocation
const response = await llm.invoke("What is Manchester United?");
console.log(response.content);

// With structured messages
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const result = await llm.invoke([
  new SystemMessage("You are a Manchester United expert. Always cite your sources."),
  new HumanMessage("Who is the club's all-time top scorer?"),
]);
console.log(result.content);
```

### Notes

- Set `OPENAI_API_KEY` in your `.env` file.
- `temperature: 0` gives deterministic outputs -- good for factual Q&A.
- The `model` field accepts any OpenAI model string. Use `"gpt-4o"` for a good balance of speed and quality, or `"gpt-4o-mini"` for faster/cheaper responses.
- `ChatOpenAI` supports tool calling natively, which is required for the ReAct agent.

---

## 2. Creating a ReAct Agent

The ReAct agent orchestrates the tool-calling loop: the LLM reasons about which tool to call, calls it, observes the result, and repeats until it has a final answer.

### Install

```bash
npm install langchain @langchain/langgraph @langchain/core
```

### Approach A: `createAgent` (Recommended — course standard)

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 1. Choose your model
const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});

// 2. Define tools (see Section 3 for details)
const calculatorTool = tool(
  async ({ expression }): Promise<string> => {
    try {
      const { evaluate } = await import("mathjs");
      return String(evaluate(expression));
    } catch (error) {
      return `Error: ${error.message}. Try a simpler expression.`;
    }
  },
  {
    name: "calculator",
    description: "Evaluates a math expression and returns the numeric result.",
    schema: z.object({
      expression: z.string().describe("The math expression to evaluate, e.g. '253/510'"),
    }),
  }
);

// 3. Create the agent
const agent = createAgent({
  model: llm,
  tools: [calculatorTool],
  systemPrompt: `You are Red Devils Chat, an AI expert on Manchester United Football Club.
You have access to tools for retrieving information, searching the web, and computing statistics.
Always cite your sources when using retrieved information.
When comparing statistics, use the calculator tool for precise calculations.`,
});

// 4. Invoke the agent
const result = await agent.invoke({
  messages: [{ role: "user", content: "What is 253 divided by 510?" }],
});

const lastMessage = result.messages[result.messages.length - 1];
console.log(lastMessage.content);
```

### Approach B: `createReactAgent` (LangGraph — also valid)

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const agent = createReactAgent({
  model: new ChatOpenAI({ model: "gpt-4o" }),
  tools: [calculatorTool],
});

// Limit iterations when invoking to prevent infinite loops
const result = await agent.invoke(
  { messages },
  { recursionLimit: 10 }  // Prevent infinite loops
);
```

### Notes

- `createAgent` from `"langchain"` is the recommended approach. It uses `systemPrompt` and supports middleware.
- `createReactAgent` from `@langchain/langgraph/prebuilt` also works. Use `recursionLimit` to prevent infinite agent loops.
- Do NOT use `createReactAgent` from `langchain/agents` — that's the old, fully deprecated API.
- Both approaches handle the tool-calling loop automatically — you do not write the loop yourself.
- The agent returns the full conversation including tool calls and observations in `result.messages`.

---

## 3. Defining Custom Tools

### Install

```bash
npm install @langchain/core zod
```

### Approach 1: `tool` Function (Recommended)

The simplest and most common approach. Uses Zod for schema validation.

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Simple tool with a single string input
const webSearchTool = tool(
  async ({ query }): Promise<string> => {
    // Call Tavily or other search API
    const results = await tavilySearch(query);
    return JSON.stringify(results);
  },
  {
    name: "web_search",
    description:
      "Search the web for current information about Manchester United transfers, recent match results, or news not available in the document corpus.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

// Tool with multiple parameters
const ragTool = tool(
  async ({ query, numResults }): Promise<string> => {
    const docs = await vectorStore.similaritySearch(query, numResults);
    return docs
      .map((doc) => `[Source: ${doc.metadata.source}]\n${doc.pageContent}`)
      .join("\n\n---\n\n");
  },
  {
    name: "rag_search",
    description:
      "Search the Manchester United knowledge base for historical information, player stats, trophy records, match details, and club history. Returns relevant document chunks with source attribution.",
    schema: z.object({
      query: z.string().describe("The search query about Manchester United"),
      numResults: z
        .number()
        .default(4)
        .describe("Number of results to return (default: 4)"),
    }),
  }
);
```

### Approach 2: `DynamicTool` (No Schema Validation)

Use when you want a simple string-in, string-out tool without Zod.

```typescript
import { DynamicTool } from "@langchain/core/tools";

const calculatorTool = new DynamicTool({
  name: "calculator",
  description: "Evaluates a math expression. Input should be a valid math expression string.",
  func: async (input: string): Promise<string> => {
    const math = await import("mathjs");
    const result = math.evaluate(input);
    return String(result);
  },
});
```

### Approach 3: `DynamicStructuredTool` (Structured Input Without `tool()`)

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const playerStatsTool = new DynamicStructuredTool({
  name: "player_stats_lookup",
  description: "Look up a specific statistic for a Manchester United player",
  schema: z.object({
    playerName: z.string().describe("The player's name"),
    stat: z
      .enum(["goals", "appearances", "assists", "minutes"])
      .describe("The statistic to retrieve"),
  }),
  func: async ({ playerName, stat }): Promise<string> => {
    // Implementation
    return `${playerName}: ${stat} = ...`;
  },
});
```

### Error Handling in Tools — Always Catch, Never Throw

Tools must never throw errors — a thrown error crashes the agent loop. Instead, catch errors and return an error message string so the LLM can read it and try a different approach.

```typescript
// BAD — throws, crashes the agent loop:
const badTool = tool(
  ({ expression }) => {
    return eval(expression);  // Could throw!
  },
  { ... }
);

// GOOD — returns error message, agent can adapt:
const goodTool = tool(
  ({ expression }) => {
    try {
      const { evaluate } = require("mathjs");
      const result = evaluate(expression);
      return String(result);
    } catch (error) {
      return `Error: ${error.message}. Try a simpler expression.`;
    }
  },
  { ... }
);
```

### Security: Use mathjs, Not eval()

```typescript
// DANGEROUS — eval executes arbitrary code
const result = eval(userExpression);

// DANGEROUS — Function() is also unsafe for untrusted input
const result = Function('"use strict"; return (' + expression + ')')();

// SAFE — mathjs evaluate only does math, nothing else
import { evaluate } from "mathjs";
const result = evaluate(expression);
```

### Notes

- Prefer the `tool()` function approach -- it is the most concise and idiomatic.
- Tool `description` is critical -- the LLM reads it to decide WHEN to use each tool. Be specific about what the tool does and when it should be used.
- Tool `name` must be alphanumeric with underscores (no spaces or special characters).
- Zod schemas provide runtime validation and generate the JSON schema that the LLM sees for structured tool calling.
- Audit tool outputs — don't blindly trust web search results.

---

## 4. Document Loading

### Install

```bash
npm install langchain
```

The document loaders live in the `langchain` package.

### TextLoader (Single File)

```typescript
import { TextLoader } from "langchain/document_loaders/fs/text";

const loader = new TextLoader("./documents/club-history.md");
const docs = await loader.load();

// Each doc has: { pageContent: string, metadata: { source: string } }
console.log(docs[0].pageContent.slice(0, 200));
console.log(docs[0].metadata); // { source: './documents/club-history.md' }
```

### DirectoryLoader (Multiple Files)

```typescript
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";

const loader = new DirectoryLoader("./documents", {
  ".md": (path: string) => new TextLoader(path),
  ".txt": (path: string) => new TextLoader(path),
});

const docs = await loader.load();
console.log(`Loaded ${docs.length} documents`);

// Each doc's metadata.source will be the file path
docs.forEach((doc) => {
  console.log(`- ${doc.metadata.source} (${doc.pageContent.length} chars)`);
});
```

### Adding Custom Metadata

```typescript
import { Document } from "@langchain/core/documents";

// You can manually enrich metadata after loading
const enrichedDocs = docs.map((doc) => {
  const fileName = doc.metadata.source.split("/").pop() ?? "unknown";
  const docName = fileName.replace(/\.(md|txt)$/, "").replace(/-/g, " ");

  return new Document({
    pageContent: doc.pageContent,
    metadata: {
      ...doc.metadata,
      documentName: docName,
      // Add any custom metadata you want for source attribution
    },
  });
});
```

### Notes

- `TextLoader` works for both `.md` and `.txt` files -- it reads them as plain text.
- `DirectoryLoader` maps file extensions to loader classes. It will skip files with unrecognized extensions.
- The `metadata.source` field is automatically set to the file path.
- For the RAG tool's source attribution, you will want to enrich metadata before embedding so that it survives through retrieval.

---

## 5. Text Splitting / Chunking

### Install

```bash
npm install @langchain/textsplitters
```

### RecursiveCharacterTextSplitter (Recommended)

This is the go-to splitter for general text. It tries to split on natural boundaries (paragraphs, then sentences, then words) to keep chunks semantically coherent.

```typescript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // Target chunk size in characters
  chunkOverlap: 200,    // Overlap between chunks to preserve context at boundaries
  separators: ["\n\n", "\n", ". ", " ", ""], // Split priority order
});

// Split loaded documents
const chunks = await splitter.splitDocuments(docs);

console.log(`Split ${docs.length} docs into ${chunks.length} chunks`);
chunks.forEach((chunk, i) => {
  console.log(`Chunk ${i}: ${chunk.pageContent.length} chars | source: ${chunk.metadata.source}`);
});
```

### MarkdownTextSplitter

Better for markdown files -- respects heading boundaries.

```typescript
import { MarkdownTextSplitter } from "@langchain/textsplitters";

const mdSplitter = new MarkdownTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const mdChunks = await mdSplitter.splitDocuments(docs);
```

### RecursiveCharacterTextSplitter with Markdown Separators

A middle-ground approach: use the recursive splitter with markdown-aware separators.

```typescript
const markdownSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
  chunkSize: 1000,
  chunkOverlap: 200,
});

const chunks = await markdownSplitter.splitDocuments(docs);
```

### Notes

- **Chunk size**: 500-1500 characters is typical. For stat-dense documents, smaller chunks (500-800) help retrieve specific facts. For narrative documents, larger chunks (1000-1500) preserve context.
- **Chunk overlap**: 100-200 characters is standard. Ensures that sentences at chunk boundaries are not lost.
- Metadata from the original document is automatically copied to each chunk.
- Splitting happens BEFORE embedding. Each chunk becomes a separate vector in the store.
- For this project's player stats documents, consider smaller chunks so individual player profiles are not merged together.

---

## 6. Embeddings Setup

### Install

```bash
npm install @langchain/openai
```

### Code

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY,
  // Optional: reduce dimensions to save storage (default is 1536)
  // dimensions: 512,
});

// Embed a single query (for similarity search)
const queryVector = await embeddings.embedQuery("Wayne Rooney goals per game");

// Embed multiple documents (for building the vector store)
const docVectors = await embeddings.embedDocuments([
  "Wayne Rooney scored 253 goals in 559 appearances",
  "Cristiano Ronaldo scored 118 goals in 292 appearances",
]);

console.log(`Query vector dimensions: ${queryVector.length}`); // 1536
console.log(`Embedded ${docVectors.length} documents`);
```

### Notes

- Set `OPENAI_API_KEY` in your `.env` file.
- `text-embedding-3-small` is the recommended model: fast, cheap ($0.02 per 1M tokens), and good quality for document retrieval.
- `text-embedding-3-large` offers better quality at higher cost if needed.
- The older `text-embedding-ada-002` still works but `text-embedding-3-small` outperforms it at a lower price.
- You typically do NOT call `embedQuery`/`embedDocuments` directly -- the vector store handles this for you when you call `addDocuments` or `similaritySearch`. But it is useful to understand what happens under the hood.

---

## 7. Vector Stores

### MemoryVectorStore (MVP -- In-Memory)

Simple, zero-config. Data is lost when the process exits.

#### Install

```bash
npm install @langchain/core @langchain/openai
```

#### Code

```typescript
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

// Option 1: Create from documents
const vectorStore = await MemoryVectorStore.fromDocuments(
  chunks, // Your split documents from Section 5
  embeddings
);

// Option 2: Create empty, then add documents
const vectorStore2 = new MemoryVectorStore(embeddings);
await vectorStore2.addDocuments([
  new Document({
    pageContent: "Wayne Rooney is Manchester United's all-time top scorer with 253 goals.",
    metadata: { source: "player-legends.md", section: "Wayne Rooney" },
  }),
  new Document({
    pageContent: "The 1999 Champions League Final was won with injury-time goals from Sheringham and Solskjaer.",
    metadata: { source: "iconic-matches.md", section: "1999 CL Final" },
  }),
]);

// Similarity search
const results = await vectorStore.similaritySearch(
  "Who is United's top scorer?",
  4 // Number of results to return
);

results.forEach((doc) => {
  console.log(`[${doc.metadata.source}] ${doc.pageContent.slice(0, 100)}...`);
});

// Similarity search with scores (useful for filtering low-relevance results)
const resultsWithScores = await vectorStore.similaritySearchWithScore(
  "Who is United's top scorer?",
  4
);

resultsWithScores.forEach(([doc, score]) => {
  console.log(`Score: ${score.toFixed(4)} | [${doc.metadata.source}] ${doc.pageContent.slice(0, 80)}...`);
});
```

### ChromaDB (Persistent -- Stretch Goal)

Data persists to disk. Requires a Chroma server or uses local persistent storage.

#### Install

```bash
npm install @langchain/community chromadb chromadb-default-embed
```

#### Code

```typescript
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

// Create from documents (persists to disk)
const vectorStore = await Chroma.fromDocuments(chunks, embeddings, {
  collectionName: "red-devils-docs",
  url: "http://localhost:8000", // Chroma server URL
  // Or for local persistence without a server:
  // collectionMetadata: { "hnsw:space": "cosine" },
});

// Connect to an existing collection (on subsequent startups)
const existingStore = new Chroma(embeddings, {
  collectionName: "red-devils-docs",
  url: "http://localhost:8000",
});

// Search works the same way
const results = await existingStore.similaritySearch("1999 Champions League", 4);
```

#### Running Chroma Locally

```bash
# Using Docker
docker run -p 8000:8000 chromadb/chroma

# Or using pip
pip install chromadb
chroma run --path ./chroma-data
```

### Notes

- For MVP, `MemoryVectorStore` is the right choice -- zero setup, fast iteration. The trade-off is re-embedding all documents on every server start.
- `MemoryVectorStore` is from `@langchain/classic/vectorstores/memory` (moved from the old `langchain` package).
- `similaritySearchWithScore` returns cosine similarity scores. Lower scores = more similar (distance), but some stores invert this. Test to confirm.
- When building the RAG tool, wrap the vector store's `similaritySearch` in a LangChain tool (see Section 8).

---

## 8. RAG Chain / Retrieval Tool

This section shows how to create a retrieval tool that the ReAct agent can call. The tool searches the vector store and returns results with source metadata for citation.

### Approach 1: Custom Tool Wrapping the Vector Store (Recommended)

This gives you full control over the retrieval format and source attribution.

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";

// Assume vectorStore is already created and populated (Section 7)
let vectorStore: MemoryVectorStore;

const ragTool = tool(
  async ({ query }): Promise<string> => {
    const results = await vectorStore.similaritySearch(query, 4);

    if (results.length === 0) {
      return "No relevant documents found for this query.";
    }

    const formattedResults = results
      .map((doc, index) => {
        const source = doc.metadata.source ?? "Unknown";
        const section = doc.metadata.section ?? "";
        const citation = section ? `${source} -- ${section}` : source;
        return `[Result ${index + 1}]\nSource: ${citation}\nContent: ${doc.pageContent}`;
      })
      .join("\n\n---\n\n");

    return formattedResults;
  },
  {
    name: "rag_search",
    description: `Search the Manchester United knowledge base for information about club history,
player statistics, trophy records, iconic matches, managerial history, and Old Trafford.
Use this tool for any question about Manchester United's historical information.
Results include source citations that MUST be included in your response.`,
    schema: z.object({
      query: z.string().describe(
        "A natural language search query about Manchester United. Be specific -- e.g., 'Wayne Rooney career goals and appearances' rather than just 'Rooney'."
      ),
    }),
  }
);
```

### Approach 2: Using createRetrieverTool

LangChain provides a helper that wraps a retriever as a tool in one step.

```typescript
import { createRetrieverTool } from "langchain/tools/retriever";

// Convert vector store to a retriever
const retriever = vectorStore.asRetriever({
  k: 4, // Number of documents to retrieve
  // Optional: filter by metadata
  // filter: { source: "player-legends.md" },
});

const retrieverTool = createRetrieverTool(retriever, {
  name: "man_united_knowledge_base",
  description:
    "Search the Manchester United knowledge base for historical information, player stats, trophy records, and match details. Always use this for questions about Manchester United history and facts.",
});
```

### Full RAG Pipeline: Load, Split, Embed, Retrieve

Here is the complete pipeline from documents to a working RAG tool:

```typescript
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

async function buildRagTool() {
  // 1. Load documents
  const loader = new DirectoryLoader("./documents", {
    ".md": (path: string) => new TextLoader(path),
    ".txt": (path: string) => new TextLoader(path),
  });
  const docs = await loader.load();
  console.log(`Loaded ${docs.length} documents`);

  // 2. Split into chunks
  const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitDocuments(docs);
  console.log(`Split into ${chunks.length} chunks`);

  // 3. Create vector store and embed
  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  const vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);
  console.log("Vector store created");

  // 4. Create and return the tool
  return tool(
    async ({ query }): Promise<string> => {
      const results = await vectorStore.similaritySearch(query, 4);

      if (results.length === 0) {
        return "No relevant documents found.";
      }

      return results
        .map((doc, i) => {
          const source = doc.metadata.source?.split("/").pop() ?? "Unknown";
          return `[${i + 1}] Source: ${source}\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");
    },
    {
      name: "rag_search",
      description:
        "Search the Manchester United knowledge base. Use for any question about club history, players, stats, trophies, matches, or managers.",
      schema: z.object({
        query: z.string().describe("Natural language search query about Manchester United"),
      }),
    }
  );
}
```

### Notes

- The custom tool approach (Approach 1) is recommended because it gives you full control over formatting, source attribution, and error handling.
- `createRetrieverTool` is simpler but concatenates document content without structured source formatting.
- The `description` on the RAG tool is one of the most important strings in your whole application -- it determines when the agent chooses to use this tool vs. web search.
- Include instructions in the tool description or the agent's system prompt telling the agent to ALWAYS cite the source metadata it receives from this tool.

---

## 9. Conversation Memory

The agent manages conversation history by receiving the full message array with each invocation. You maintain the history and pass it in.

### Basic In-Memory Message History (Recommended — matches course slides)

```typescript
// Maintain message history across turns
let messageHistory: { role: string; content: string }[] = [];

async function chat(userMessage: string) {
  messageHistory.push({
    role: "user",
    content: userMessage,
  });

  const result = await agent.invoke({
    messages: messageHistory,
  });

  const assistantMessage =
    result.messages[result.messages.length - 1];

  messageHistory.push({
    role: "assistant",
    content: assistantMessage.content,
  });

  return assistantMessage.content;
}

// Usage
await chat("Tell me about Wayne Rooney");
// Agent retrieves info about Rooney
await chat("How many goals did he score?");
// Agent understands context from history — "he" = Rooney
```

For multiple sessions (e.g., in an Express server), use a Map keyed by session ID:

```typescript
const sessions: Map<string, { role: string; content: string }[]> = new Map();

async function chat(sessionId: string, userMessage: string) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const messageHistory = sessions.get(sessionId)!;

  messageHistory.push({ role: "user", content: userMessage });

  const result = await agent.invoke({ messages: messageHistory });

  const assistantMessage = result.messages[result.messages.length - 1];
  messageHistory.push({ role: "assistant", content: assistantMessage.content });

  return assistantMessage.content;
}
```

### Using LangGraph MemorySaver for Thread-Based Persistence

LangGraph has a built-in checkpointer for maintaining state across invocations.

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";

const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
const memory = new MemorySaver();

const agent = createReactAgent({
  llm,
  tools: [ragTool, calculatorTool, webSearchTool],
  checkpointSaver: memory,
});

// Each invocation with the same thread_id automatically maintains history
const config = { configurable: { thread_id: "session-123" } };

const result1 = await agent.invoke(
  { messages: [{ role: "user", content: "Tell me about the 1999 Champions League final" }] },
  config
);

// Follow-up -- the agent remembers the previous exchange
const result2 = await agent.invoke(
  { messages: [{ role: "user", content: "Who scored the goals?" }] },
  config
);
// Agent knows you are asking about the 1999 CL final
```

### Notes

- `MemorySaver` is an in-memory checkpointer -- data is lost when the process exits. This is fine for MVP.
- With `checkpointSaver`, you only need to send the NEW user message in each invocation. The checkpointer replays the full history automatically.
- Without `checkpointSaver`, you must manually maintain and pass the full message history array.
- The `thread_id` in the config acts as the session identifier. Use a unique ID per user/session.
- For production, LangGraph supports persistent checkpointers (PostgreSQL, SQLite, etc.), but `MemorySaver` is perfect for MVP.
- Be aware of context window limits. For very long conversations, you may need to trim or summarize older messages.
- LangChain v1 offers `summarizationMiddleware` for automatic conversation summarization:
  ```typescript
  import { createAgent, summarizationMiddleware } from "langchain";
  const agent = createAgent({
    model: llm,
    tools,
    middleware: [
      summarizationMiddleware({
        model: "claude-haiku-4-5-20251001",
        trigger: { tokens: 4000 },
        keep: { messages: 20 },
      }),
    ],
    checkpointer: new MemorySaver(),
  });
  ```

---

## 10. Streaming

### Streaming with streamEvents (Recommended)

`streamEvents` provides fine-grained streaming of the agent's reasoning process, tool calls, and final response.

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
const agent = createReactAgent({ llm, tools: [ragTool, calculatorTool, webSearchTool] });

// Stream events from the agent
const eventStream = agent.streamEvents(
  { messages: [{ role: "user", content: "Compare Rooney and Ronaldo's goals per game" }] },
  { version: "v2" }
);

for await (const event of eventStream) {
  const kind = event.event;

  if (kind === "on_chat_model_stream") {
    // LLM token streaming -- the agent's text output
    const chunk = event.data.chunk;
    if (chunk.content && typeof chunk.content === "string") {
      process.stdout.write(chunk.content);
    }
  } else if (kind === "on_tool_start") {
    // Tool invocation started
    console.log(`\n[Tool Call] ${event.name}: ${JSON.stringify(event.data.input)}`);
  } else if (kind === "on_tool_end") {
    // Tool returned a result
    console.log(`[Tool Result] ${event.name}: ${event.data.output.slice(0, 200)}...`);
  }
}
```

### Streaming with .stream() (Simpler)

The `.stream()` method yields state updates at each step of the agent graph.

```typescript
const stream = await agent.stream(
  { messages: [{ role: "user", content: "Tell me about the Busby Babes" }] },
  { streamMode: "updates" }
);

for await (const update of stream) {
  // Each update is keyed by the node that produced it ("agent" or "tools")
  for (const [nodeName, value] of Object.entries(update)) {
    if (nodeName === "agent") {
      console.log("[Agent]", (value as any).messages?.[0]?.content);
    } else if (nodeName === "tools") {
      console.log("[Tool Result]", (value as any).messages?.[0]?.content?.slice(0, 200));
    }
  }
}
```

### Express.js SSE Endpoint for Frontend Streaming

```typescript
import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

app.post("/api/chat", async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;

  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const config = { configurable: { thread_id: sessionId } };

  try {
    const eventStream = agent.streamEvents(
      { messages: [{ role: "user", content: message }] },
      { version: "v2", ...config }
    );

    for await (const event of eventStream) {
      if (event.event === "on_chat_model_stream") {
        const content = event.data.chunk?.content;
        if (content && typeof content === "string") {
          res.write(`data: ${JSON.stringify({ type: "token", content })}\n\n`);
        }
      } else if (event.event === "on_tool_start") {
        res.write(
          `data: ${JSON.stringify({
            type: "tool_start",
            tool: event.name,
            input: event.data.input,
          })}\n\n`
        );
      } else if (event.event === "on_tool_end") {
        res.write(
          `data: ${JSON.stringify({
            type: "tool_end",
            tool: event.name,
            output: event.data.output,
          })}\n\n`
        );
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`);
    res.end();
  }
});
```

### Notes

- `streamEvents` with `version: "v2"` is the recommended approach. It provides the most granular control over what you stream to the frontend.
- `streamMode: "updates"` in `.stream()` is simpler but gives you node-level updates rather than token-level streaming.
- For SSE, each message must be formatted as `data: <json>\n\n` (two newlines).
- When using `checkpointSaver` with streaming, pass the config as part of the second argument.
- The `on_chat_model_stream` event fires for EVERY LLM call, including intermediate reasoning. Filter by `event.metadata` or tag if you only want the final response tokens.

---

## Appendix: Full Package Install

All packages needed for the MVP:

```bash
# Core packages
npm install langchain @langchain/openai @langchain/langgraph @langchain/core

# For homework tools
npm install @langchain/tavily          # Web search
npm install @langchain/classic         # In-memory vector store

# Text splitting
npm install @langchain/textsplitters

# Schema validation
npm install zod

# Utilities
npm install mathjs dotenv

# For ChromaDB (stretch goal — persistent vector store)
npm install @langchain/community chromadb chromadb-default-embed

# Types
npm install -D typescript @types/node
```

### Environment Variables (.env)

```
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
```

---

## Appendix: Putting It All Together

A minimal working example combining all pieces:

```typescript
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { createAgent } from "langchain";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { TavilySearch } from "@langchain/tavily";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { evaluate } from "mathjs";
import "dotenv/config";

async function main() {
  // --- Build RAG pipeline ---
  const loader = new DirectoryLoader("./docs", {
    ".txt": (path) => new TextLoader(path),
    ".md": (path) => new TextLoader(path),
  });
  const docs = await loader.load();

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitDocuments(docs);

  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  const vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);

  // --- Define tools ---
  const ragTool = tool(
    async ({ query }) => {
      try {
        const results = await vectorStore.similaritySearch(query, 4);
        if (results.length === 0) return "No relevant documents found.";
        return results
          .map((doc, i) => {
            const source = doc.metadata.source?.split("/").pop() ?? "Unknown";
            return `[${i + 1}] Source: ${source}\n${doc.pageContent}`;
          })
          .join("\n\n---\n\n");
      } catch (error) {
        return `Error searching knowledge base: ${error.message}`;
      }
    },
    {
      name: "rag_search",
      description:
        "Search the Manchester United knowledge base for club history, player stats, trophies, matches, and managers.",
      schema: z.object({ query: z.string() }),
    }
  );

  const calculatorTool = tool(
    async ({ expression }) => {
      try {
        const result = evaluate(expression);
        return String(result);
      } catch (error) {
        return `Error: ${error.message}. Try a simpler expression.`;
      }
    },
    {
      name: "calculator",
      description: "Evaluate a math expression. Use for stat comparisons, ratios, percentages.",
      schema: z.object({
        expression: z.string().describe("Math expression, e.g. '253/510'"),
      }),
    }
  );

  const webSearchTool = new TavilySearch({
    maxResults: 5,
  });

  // --- Create agent ---
  const llm = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
  });

  const agent = createAgent({
    model: llm,
    tools: [ragTool, calculatorTool, webSearchTool],
    systemPrompt: `You are Red Devils Chat, an expert on Manchester United Football Club.
Use the rag_search tool for any question about United's history, players, stats, trophies, or matches.
Use the calculator tool when you need to compute ratios, percentages, or comparisons.
Use the web search tool for current news, transfers, or recent results.
ALWAYS cite your sources using the source metadata returned by rag_search.`,
  });

  // --- Use the agent with message history ---
  let messageHistory: { role: string; content: string }[] = [];

  async function chat(userMessage: string) {
    messageHistory.push({ role: "user", content: userMessage });
    const result = await agent.invoke({ messages: messageHistory });
    const assistantMessage = result.messages[result.messages.length - 1];
    messageHistory.push({ role: "assistant", content: assistantMessage.content });
    console.log(assistantMessage.content);
  }

  await chat("Who is United's all-time top scorer?");
  await chat("What was his goals per game ratio?");
}

main().catch(console.error);
```

---

## Common Gotchas

1. **Import paths matter**: `createAgent` comes from `"langchain"`. `createReactAgent` comes from `@langchain/langgraph/prebuilt`. Do NOT use `createReactAgent` from `langchain/agents` — that's the old, fully deprecated API.

2. **Package locations**: `MemoryVectorStore` is from `@langchain/classic/vectorstores/memory`. Document loaders are from `langchain/document_loaders/fs/...`. Tools from `@langchain/core/tools`. Tavily from `@langchain/tavily`.

3. **Never throw in tools**: Always catch errors and return an error string. Thrown errors crash the agent loop. The LLM can read error messages and try a different approach.

4. **Use mathjs, not eval()**: `eval()` and `Function()` execute arbitrary code. `mathjs.evaluate()` only does math — safe for untrusted input.

5. **Limit recursion**: Use `{ recursionLimit: 10 }` when invoking agents to prevent infinite tool-calling loops.

6. **Zod is required**: Most LangChain.js tool definitions require Zod for schema validation. Always install it alongside `@langchain/core`.

7. **Embedding costs**: `text-embedding-3-small` is cheap but calls are not free. For MVP with ~7 documents, re-embedding on every server restart is fine. For production, persist the vector store.

8. **Tool descriptions drive agent behavior**: If the agent is not picking the right tool, the fix is almost always to improve the tool's `description` string, not to change the agent code.

9. **Message types**: When using `agent.invoke`, you can pass messages as plain objects `{ role: "user", content: "..." }` or as LangChain message instances (`new HumanMessage(...)`). Both work.

10. **Streaming version**: Always pass `{ version: "v2" }` to `streamEvents`. v1 has a different event format and is deprecated.
