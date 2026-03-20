# Anthropic Claude — Reference Guide

> Reference documentation for using Claude as the LLM in an agentic RAG chatbot (Red Devils Chat).
> Covers models, SDKs, LangChain integration, tool use, system prompts, and environment setup.
>
> **Last verified**: March 2026 (based on knowledge through May 2025; pricing and newest model IDs should be cross-checked against [docs.anthropic.com](https://docs.anthropic.com) and [console.anthropic.com](https://console.anthropic.com) for any updates after that date).

---

## 1. Claude Models Overview

### Current Model Lineup

| Model | Model ID | Alias | Context Window | Best For |
|-------|----------|-------|---------------|----------|
| Claude Opus 4.6 | `claude-opus-4-6` | `claude-opus-4-6-latest` | 200K tokens | Highest capability — complex reasoning, nuanced analysis |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | `claude-sonnet-4-6-latest` | 200K tokens | Best cost/quality balance — recommended for agents |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | `claude-sonnet-4-5-latest` | 200K tokens | Previous-gen Sonnet — still very capable |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | `claude-haiku-4-5-latest` | 200K tokens | Fastest, cheapest — simple tasks, high throughput |

> **Aliases**: You can use `claude-sonnet-4-latest` etc. in development for convenience, but pin to a dated ID (e.g., `claude-sonnet-4-5-20250929`) in production so behavior does not change when Anthropic updates the alias.

### Extended Thinking

Claude Opus 4 and Sonnet 4 support **extended thinking**, which gives the model an internal scratchpad for multi-step reasoning before producing the final answer. This is particularly useful for complex analytical questions.

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 16000,
  thinking: {
    type: "enabled",
    budget_tokens: 10000, // max tokens for internal reasoning
  },
  messages: [{ role: "user", content: "Complex question here" }],
});

// Response content may include a "thinking" block followed by a "text" block
for (const block of response.content) {
  if (block.type === "thinking") {
    console.log("Thinking:", block.thinking);
  }
  if (block.type === "text") {
    console.log("Answer:", block.text);
  }
}
```

> When extended thinking is enabled, the `temperature` parameter must be omitted (it is fixed at 1). For the agentic chatbot, extended thinking is generally **not needed** — standard mode with `temperature: 0` is faster and cheaper for tool-use workflows.

### Pricing (per million tokens)

| Model | Input | Output | Prompt Caching (write) | Prompt Caching (read) |
|-------|-------|--------|------------------------|-----------------------|
| Claude Opus 4 | $15.00 | $75.00 | $18.75 | $1.50 |
| Claude Sonnet 4 | $3.00 | $15.00 | $3.75 | $0.30 |
| Claude Sonnet 3.5 v2 | $3.00 | $15.00 | $3.75 | $0.30 |
| Claude Haiku 3.5 | $0.80 | $4.00 | $1.00 | $0.08 |

> **Prompt caching** can reduce costs significantly for agentic apps. The system prompt and tool definitions can be cached across requests. See Section 8 below for details.

### Recommendation for Red Devils Chat

**Use Claude Sonnet 4 (`claude-sonnet-4-5-20250929`)** for the agentic chatbot:
- Strong tool-use and reasoning capabilities (ReAct agent loop)
- 5x cheaper than Opus on input, 5x cheaper on output
- Fast enough for streaming UI responsiveness
- Excellent at following system prompt instructions for source attribution
- More than capable for RAG + calculator + web search orchestration

Use Haiku only if you need to optimize costs for high-traffic scenarios and the reasoning quality is sufficient for your use case.

---

## 2. Anthropic SDK (TypeScript)

### Installation

```bash
npm install @anthropic-ai/sdk
```

### Basic Chat Completion

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
// Reads ANTHROPIC_API_KEY from environment automatically

const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  system: "You are a helpful Manchester United expert.",
  messages: [
    {
      role: "user",
      content: "Who scored the winning goal in the 1999 Champions League final?",
    },
  ],
});

// Response structure
console.log(response.content[0]); // { type: "text", text: "Ole Gunnar Solskjaer..." }
console.log(response.usage);      // { input_tokens: 42, output_tokens: 156 }
console.log(response.stop_reason); // "end_turn" | "tool_use" | "max_tokens"
```

### Streaming Responses

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const stream = client.messages.stream({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  system: "You are a helpful Manchester United expert.",
  messages: [
    { role: "user", content: "Tell me about the Class of '92." },
  ],
});

// Event-based streaming
stream.on("text", (text) => {
  process.stdout.write(text);
});

const finalMessage = await stream.finalMessage();
console.log(finalMessage.usage);

// Alternative: async iteration
const stream2 = client.messages.stream({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
});

for await (const event of stream2) {
  if (
    event.type === "content_block_delta" &&
    event.delta.type === "text_delta"
  ) {
    process.stdout.write(event.delta.text);
  }
}
```

### Tool Use / Function Calling (Native SDK)

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "search_documents",
    description:
      "Search the Manchester United knowledge base for information about players, history, trophies, and matches.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant documents",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "calculator",
    description:
      "Evaluate a mathematical expression. Use for stat comparisons, ratios, percentages.",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: {
          type: "string",
          description: "Math expression to evaluate, e.g. '253 / 510'",
        },
      },
      required: ["expression"],
    },
  },
];

const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  tools,
  messages: [
    {
      role: "user",
      content: "What was Rooney's goals-per-game ratio at United?",
    },
  ],
});

// When Claude wants to use a tool, stop_reason = "tool_use"
// and content includes a tool_use block:
for (const block of response.content) {
  if (block.type === "tool_use") {
    console.log(block.name);  // "search_documents"
    console.log(block.id);    // "toolu_abc123..."
    console.log(block.input); // { query: "Wayne Rooney goals appearances Manchester United" }
  }
}

// To continue the conversation after a tool call, send back a tool_result:
const toolResultMessages: Anthropic.MessageParam[] = [
  {
    role: "user",
    content: "What was Rooney's goals-per-game ratio at United?",
  },
  {
    role: "assistant",
    content: response.content, // includes the tool_use block
  },
  {
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "toolu_abc123", // match the tool_use block's id
        content: "Wayne Rooney: 253 goals in 559 appearances for Manchester United (2004-2017). [Source: Player Legends & Statistics]",
      },
    ],
  },
];

const followUp = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  tools,
  messages: toolResultMessages,
});
```

---

## 3. LangChain Integration

This is the recommended approach for Red Devils Chat, since the project uses LangChain.js for the ReAct agent loop.

### Installation

```bash
npm install @langchain/anthropic @langchain/core @langchain/langgraph langchain
```

### Basic Setup

```typescript
import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  temperature: 0,
  // API key read from ANTHROPIC_API_KEY env var automatically
  // Or pass explicitly:
  // anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await llm.invoke("Who is Manchester United's all-time top scorer?");
console.log(response.content);
```

### Configuring for Agent Use (ReAct)

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 1. Create the LLM
const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  temperature: 0,
  streaming: true, // Enable streaming for SSE
});

// 2. Define tools
const searchDocsTool = tool(
  async ({ query }: { query: string }) => {
    // Your RAG retrieval logic here
    const results = await vectorStore.similaritySearch(query, 4);
    return results
      .map(
        (doc) =>
          `[Source: ${doc.metadata.source}]\n${doc.pageContent}`
      )
      .join("\n\n");
  },
  {
    name: "search_knowledge_base",
    description:
      "Search the Manchester United knowledge base. Use for questions about club history, player stats, trophies, iconic matches, and managers. Always cite the source.",
    schema: z.object({
      query: z.string().describe("Search query for the knowledge base"),
    }),
  }
);

const calculatorTool = tool(
  async ({ expression }: { expression: string }) => {
    const math = await import("mathjs");
    const result = math.evaluate(expression);
    return String(result);
  },
  {
    name: "calculator",
    description:
      "Evaluate a math expression. Use for computing goals-per-game ratios, per-90 stats, percentages, and stat comparisons.",
    schema: z.object({
      expression: z
        .string()
        .describe("Mathematical expression to evaluate, e.g. '253 / 559'"),
    }),
  }
);

// 3. Create the agent
const agent = createReactAgent({
  llm,
  tools: [searchDocsTool, calculatorTool],
});

// 4. Invoke
const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "What was Rooney's goals-per-game ratio at United?",
    },
  ],
});
```

### Streaming with LangChain

```typescript
// Stream agent events (tool calls, intermediate steps, final answer)
const eventStream = agent.streamEvents(
  {
    messages: [{ role: "user", content: "Compare Rooney and Ronaldo at United" }],
  },
  { version: "v2" }
);

for await (const event of eventStream) {
  if (event.event === "on_chat_model_stream") {
    // Token-by-token streaming of the LLM output
    const chunk = event.data.chunk;
    if (chunk.content) {
      process.stdout.write(String(chunk.content));
    }
  }

  if (event.event === "on_tool_start") {
    console.log(`\nUsing tool: ${event.name}`);
    console.log(`   Input: ${JSON.stringify(event.data.input)}`);
  }

  if (event.event === "on_tool_end") {
    console.log(`   Result: ${event.data.output}`);
  }
}
```

### Tool Binding (Alternative Pattern)

```typescript
// You can also bind tools directly to the LLM (without an agent)
// Useful for single-step tool calling
const llmWithTools = llm.bindTools([searchDocsTool, calculatorTool]);

const response = await llmWithTools.invoke(
  "Search for Rooney's stats"
);

// Check for tool calls in response
if (response.tool_calls && response.tool_calls.length > 0) {
  for (const toolCall of response.tool_calls) {
    console.log(toolCall.name); // "search_knowledge_base"
    console.log(toolCall.args); // { query: "Rooney stats" }
  }
}
```

---

## 4. Tool Use with Claude — Details and Gotchas

### How Claude's Native Tool Format Maps to LangChain

| Claude Native (Anthropic SDK) | LangChain |
|-------------------------------|-----------|
| `tools` array in request body | `bindTools()` or agent's tool list |
| `tool_use` content block in response | `response.tool_calls` array |
| `tool_result` message from user | Handled automatically by agent executor |
| `stop_reason: "tool_use"` | Agent loop detects tool calls and continues |

### Key Gotchas

1. **Claude may call multiple tools in a single turn.** The response `content` array can contain multiple `tool_use` blocks. LangChain's agent executor handles this, but if you are rolling your own loop, you must process all tool calls before sending results back.

2. **Tool descriptions matter a lot.** Claude relies heavily on tool descriptions to decide which tool to use. Be specific:
   - Bad: `"Search for information"`
   - Good: `"Search the Manchester United knowledge base for information about club history, player statistics, trophies, and iconic matches. Returns relevant document chunks with source metadata."`

3. **`tool_choice` parameter.** You can force Claude to use a specific tool or let it decide:
   ```typescript
   // Let Claude decide (default)
   tool_choice: { type: "auto" }

   // Force a specific tool
   tool_choice: { type: "tool", name: "search_knowledge_base" }

   // Force Claude to use at least one tool
   tool_choice: { type: "any" }
   ```

4. **Tool result format.** When returning tool results, include enough context for Claude to synthesize a good answer. For RAG, always include source metadata in the tool result string so Claude can cite it.

5. **Parallel tool calls.** Claude Sonnet 4 can issue parallel tool calls when it determines multiple tools are needed independently. The LangGraph ReAct agent handles this automatically.

6. **No nested tool calls.** Claude cannot call a tool from within a tool response — tool execution is always handled by your code, not by Claude.

7. **JSON input schema.** Claude's tool input schemas follow JSON Schema. Use `type: "object"` with `properties` and `required`. Zod schemas in LangChain are converted automatically.

---

## 5. System Prompts — Best Practices for Agents

### System Prompt Template for Red Devils Chat

```typescript
const SYSTEM_PROMPT = `You are Red Devils Chat, an expert AI assistant for Manchester United fans. You have access to a curated knowledge base of Manchester United history, players, statistics, trophies, and iconic matches.

## Core Behavior
- Answer questions about Manchester United with accuracy and enthusiasm
- Always use your tools to find information rather than relying on memory alone
- If you're unsure, say so — never fabricate stats or facts

## Tool Usage Guidelines
- **search_knowledge_base**: Use for ANY question about Manchester United history, players, stats, trophies, or matches. Always search before answering factual questions.
- **calculator**: Use when you need to compute ratios, percentages, or comparisons (e.g., goals per game, win rates). Always show your calculation.
- **web_search**: Use for current/recent information not likely in the knowledge base (transfers, recent results, breaking news).

## Source Attribution
- ALWAYS cite your sources when using information from the knowledge base
- Format citations as: [Source: Document Name — Section]
- If synthesizing from multiple sources, cite all of them
- Never present retrieved information without attribution

## Response Style
- Be conversational but accurate
- Use specific numbers and dates when available
- For stat comparisons, show the raw numbers AND the computed result
- Keep responses focused — don't ramble with unnecessary background unless asked`;
```

### System Prompt Tips

1. **Put tool instructions in the system prompt**, not in individual tool descriptions. Claude reads the system prompt first and uses it to guide tool selection throughout the conversation.

2. **Be explicit about when to use tools.** Claude may try to answer from training data. Tell it: "Always search before answering factual questions."

3. **Define citation format in the system prompt.** Claude will follow the format you specify consistently.

4. **Temperature 0 for agents.** When using Claude as an agent, set `temperature: 0` for deterministic tool selection and consistent behavior.

5. **System prompt length.** Claude handles long system prompts well (thousands of tokens). Don't be afraid to be detailed — it improves reliability.

---

## 6. Environment Setup

### API Key

Get your API key from [console.anthropic.com](https://console.anthropic.com/).

### `.env` File

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional: override default model
CLAUDE_MODEL=claude-sonnet-4-5-20250929
```

### Loading Environment Variables

```typescript
// Option A: dotenv (if not using a framework that auto-loads .env)
import "dotenv/config";

// Option B: with LangChain (auto-reads ANTHROPIC_API_KEY)
import { ChatAnthropic } from "@langchain/anthropic";
const llm = new ChatAnthropic({
  model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929",
  temperature: 0,
});
```

### `.env.example` (commit this to repo)

```env
# Get your API key at https://console.anthropic.com
ANTHROPIC_API_KEY=
```

Add `.env` to `.gitignore` — never commit API keys.

---

## 7. Rate Limits & Pricing

### Rate Limits (Tier 1 — default for new accounts)

| Model | Requests/min | Input tokens/min | Output tokens/min |
|-------|-------------|-------------------|-------------------|
| Claude Sonnet 4 | 50 | 40,000 | 8,000 |
| Claude Haiku 3.5 | 50 | 50,000 | 10,000 |
| Claude Opus 4 | 50 | 20,000 | 4,000 |

Rate limits increase with higher usage tiers. Check your current tier at [console.anthropic.com](https://console.anthropic.com/).

### Higher Tiers

| Tier | Spend Threshold | Sonnet RPM | Sonnet Input TPM |
|------|----------------|------------|------------------|
| Tier 1 | $0 | 50 | 40,000 |
| Tier 2 | $40+ | 1,000 | 80,000 |
| Tier 3 | $200+ | 2,000 | 160,000 |
| Tier 4 | $400+ | 4,000 | 400,000 |

> **Note**: Rate limits may have changed since May 2025. Check [docs.anthropic.com/en/api/rate-limits](https://docs.anthropic.com/en/api/rate-limits) for the latest values.

### Cost Estimation for Red Devils Chat

Rough estimate per conversation (10 turns, using RAG + calculator):
- Average input per turn: ~2,000 tokens (system prompt + history + tool results)
- Average output per turn: ~500 tokens
- **Per conversation**: ~20K input + ~5K output
- **Cost with Sonnet 4**: ~$0.06 input + ~$0.075 output = **~$0.14 per conversation**
- **Cost with Sonnet 4 + prompt caching**: ~$0.006 cached input + ~$0.075 output = **~$0.08 per conversation** (system prompt cached after first turn)
- **Cost with Haiku 3.5**: ~$0.016 input + ~$0.02 output = **~$0.04 per conversation**

### Handling Rate Limits in Code

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// The SDK automatically retries on 429 (rate limit) errors
// with exponential backoff. Default: 2 retries.
// To customize:
const clientWithRetries = new Anthropic({
  maxRetries: 5,
});

// For LangChain, configure on the model:
import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  maxRetries: 3,
});
```

---

## 8. Prompt Caching

Prompt caching allows you to cache frequently reused prefixes (system prompts, tool definitions, large context documents) so they are only billed at the reduced cache-read price on subsequent requests. This is highly relevant for agentic chatbots where every request includes the same system prompt and tool definitions.

### How It Works

- First request: full input price + cache write surcharge (1.25x input price)
- Subsequent requests (within ~5 min TTL): cached portion billed at 10% of input price
- Cache is per-model, per-prefix (the cached content must be an exact prefix match)
- Minimum cacheable prefix: 1,024 tokens (for Sonnet/Opus) or 2,048 tokens (for Haiku)

### With the Anthropic SDK

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: SYSTEM_PROMPT, // your long system prompt
      cache_control: { type: "ephemeral" },
    },
  ],
  tools: tools, // tool definitions are also cached when part of the prefix
  messages: [
    { role: "user", content: "Who won the treble in 1999?" },
  ],
});

// Check cache usage in response
console.log(response.usage);
// {
//   input_tokens: 15,
//   output_tokens: 120,
//   cache_creation_input_tokens: 1500,  // first request only
//   cache_read_input_tokens: 0,         // will be >0 on subsequent requests
// }
```

### With LangChain

```typescript
import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  temperature: 0,
  // LangChain @langchain/anthropic supports prompt caching via
  // the `clientOptions` or by structuring system messages with
  // cache_control headers. Check @langchain/anthropic docs for
  // the latest API surface.
});
```

> **Tip for Red Devils Chat**: With a system prompt + tool definitions totaling ~1,500 tokens, prompt caching saves roughly 90% on the cached portion for multi-turn conversations. This adds up fast.

---

## 9. Batch API

For non-real-time workloads (e.g., bulk processing documents, batch evaluations), Anthropic offers a **Message Batches API** at 50% of standard pricing:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const batch = await client.messages.batches.create({
  requests: [
    {
      custom_id: "request-1",
      params: {
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Question 1" }],
      },
    },
    {
      custom_id: "request-2",
      params: {
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Question 2" }],
      },
    },
  ],
});

// Poll for results
const result = await client.messages.batches.retrieve(batch.id);
```

> Not relevant for the chatbot's real-time responses, but useful if you ever need to process your knowledge base documents through Claude (e.g., for summarization or metadata extraction during ingestion).

---

## Quick Reference

```typescript
// Minimal agentic setup with LangChain — copy-paste ready
import "dotenv/config";
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  temperature: 0,
  streaming: true,
});

const myTool = tool(
  async ({ query }) => {
    return "Tool result here";
  },
  {
    name: "my_tool",
    description: "Description of what this tool does",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

const agent = createReactAgent({
  llm,
  tools: [myTool],
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "User question here" }],
});

console.log(result.messages.at(-1)?.content);
```
