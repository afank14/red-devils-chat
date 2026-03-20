# Supporting Libraries Reference

Reference documentation for the supporting libraries used in the agentic RAG chatbot.
Verified against live documentation as of March 2026.

---

## 1. math.js (Calculator Tool)

### Installation

```bash
npm install mathjs
# TypeScript types are bundled with mathjs since v11 -- no @types package needed.
```

### Basic Usage

```typescript
import { evaluate, round, format } from 'mathjs';

// Evaluate string expressions safely
const result = evaluate('253 / 510');     // 0.4960784313725490...
const pct    = evaluate('253 / 510 * 100'); // 49.6078...

// Rounding
round(0.49607, 1);  // 0.5
round(0.49607, 2);  // 0.50

// Format for display
format(0.49607, { precision: 3 }); // '0.496'
```

### Useful Functions for Football Stats

```typescript
import { evaluate, round } from 'mathjs';

// Completion percentage
const compPct = round(evaluate('253 / 410 * 100'), 1); // 61.7

// Passer rating sub-calculations
const a = round(evaluate('(( 253 / 410 ) - 0.3) * 5'), 2);
const b = round(evaluate('(( 3200 / 410 ) - 3) * 0.25'), 2);

// Yards per carry
const ypc = round(evaluate('1200 / 280'), 1); // 4.3

// Win percentage
const winPct = round(evaluate('10 / 16 * 100'), 1); // 62.5
```

### Wrapping as a LangChain Tool

```typescript
import { DynamicTool } from '@langchain/core/tools';
import { tool } from '@langchain/core/tools';
import { evaluate } from 'mathjs';
import { z } from 'zod';

// Option A: DynamicTool
const calculatorTool = new DynamicTool({
  name: 'calculator',
  description:
    'Evaluate a mathematical expression. Input must be a valid math expression string. ' +
    'Examples: "253 / 510 * 100", "round(14.7, 1)", "(10 + 6) / 2"',
  func: async (expression: string): Promise<string> => {
    try {
      const result = evaluate(expression);
      return String(result);
    } catch (error) {
      return `Error evaluating expression: ${(error as Error).message}`;
    }
  },
});

// Option B: tool() function (preferred in newer LangChain)
const calculator = tool(
  async ({ expression }): Promise<string> => {
    try {
      const result = evaluate(expression);
      return String(result);
    } catch (error) {
      return `Error evaluating "${expression}": ${(error as Error).message}`;
    }
  },
  {
    name: 'calculator',
    description:
      'Evaluate a math expression. Use this for any arithmetic: division, ' +
      'percentages, rounding, averages, etc.',
    schema: z.object({
      expression: z
        .string()
        .describe('The math expression to evaluate, e.g. "253 / 510 * 100"'),
    }),
  }
);
```

### Safety Considerations

- `mathjs.evaluate()` runs in a sandboxed expression parser -- it does **not** call JavaScript `eval()`.
- It cannot access the file system, network, or `globalThis`.
- User-supplied input can be passed directly to `evaluate()` without injection risk.
- The only concern is CPU-intensive expressions (e.g., huge factorials). To mitigate, you can wrap the call in a timeout or limit input length.

---

## 2. Express.js (Backend API)

> **Note:** Express 5.x is now the current stable release. The examples below are
> compatible with Express 5. Key differences from Express 4 are called out where
> relevant.

### Installation

```bash
npm install express cors
npm install -D @types/express @types/cors typescript tsx
```

### Basic Setup with TypeScript

```typescript
// src/server.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// --------------- Middleware ---------------

// Parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

// CORS -- allow React dev server
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

// --------------- Routes ---------------

app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, conversationId } = req.body;
  // ... handle chat logic
  res.json({ reply: 'Hello from the agent' });
});

// --------------- Error handler ---------------
// Express 5: rejected promises in async handlers are automatically forwarded
// to the error handler -- no need for try/catch wrappers or express-async-errors.

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// --------------- Start ---------------

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
```

Run with: `npx tsx src/server.ts` (or use `tsx watch` for dev).

### Express 5 Migration Notes

If upgrading from Express 4, be aware of these breaking changes:

| Express 4               | Express 5                                          |
|--------------------------|----------------------------------------------------|
| `app.del()`              | `app.delete()`                                     |
| `req.param('id')`        | `req.params.id` / `req.body.id` / `req.query.id`  |
| `res.json(obj, status)`  | `res.status(status).json(obj)`                     |
| `res.sendfile()`         | `res.sendFile()` (camelCase)                       |
| `res.send(200)`          | `res.sendStatus(200)`                              |
| Path wildcard `/*`       | Named wildcard `/*splat`                           |

A codemod is available: `npx codemod@latest @expressjs/v5-migration-recipe`

### SSE (Server-Sent Events) Endpoint for Streaming

Express 5 has no built-in SSE helper -- use `res.write()` manually as shown below.

```typescript
// src/routes/chat-stream.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.post('/api/chat/stream', async (req: Request, res: Response) => {
  const { message, conversationId } = req.body;

  // ---- SSE Headers ----
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable nginx buffering if applicable
  });

  // ---- Send helper ----
  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // ---- Stream tokens from the agent ----
  try {
    // Example: iterate over an async stream from LangChain
    const stream = await agentExecutor.stream({ input: message });

    for await (const chunk of stream) {
      if (chunk.output) {
        sendEvent('token', { content: chunk.output });
      }
      // Optionally stream tool calls
      if (chunk.intermediateSteps) {
        for (const step of chunk.intermediateSteps) {
          sendEvent('tool_call', {
            tool: step.action.tool,
            input: step.action.toolInput,
            output: step.observation,
          });
        }
      }
    }

    sendEvent('done', { finished: true });
  } catch (error) {
    sendEvent('error', { message: (error as Error).message });
  } finally {
    res.end();
  }

  // ---- Connection cleanup ----
  req.on('close', () => {
    // Client disconnected -- clean up any resources
    console.log('Client disconnected from SSE stream');
  });
});

export default router;
```

### Registering SSE Route

```typescript
// In server.ts
import chatStreamRouter from './routes/chat-stream';

app.use(chatStreamRouter);
```

---

## 3. React + Vite (Frontend)

> **Note:** The React team now recommends full-stack frameworks (Next.js, React
> Router v7, Expo) for new projects. Vite remains a solid choice when you only
> need a client-side SPA, which is the case for this chatbot frontend.

### Project Setup

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-markdown
```

> **React 19:** React and ReactDOM now ship their own TypeScript declarations.
> You no longer need to install `@types/react` or `@types/react-dom` separately.
> If you are on React 18 or earlier, you still need `npm install -D @types/react @types/react-dom`.

### Chat UI Component Structure

```
frontend/src/
  components/
    ChatWindow.tsx      # main container, manages messages state
    MessageList.tsx      # renders list of messages
    MessageBubble.tsx    # single message with markdown rendering
    ChatInput.tsx        # text input + send button
    SourceCitation.tsx   # displays retrieved sources
  hooks/
    useChat.ts           # SSE streaming hook
  types/
    chat.ts              # shared types
```

### Shared Types

```typescript
// src/types/chat.ts
export interface Source {
  title: string;
  url?: string;
  snippet: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}
```

### SSE Streaming Hook

```typescript
// src/hooks/useChat.ts
import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, Source } from '../types/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userInput: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userInput,
    };

    // Placeholder for assistant response
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    // ---- Fetch SSE stream ----
    // Note: EventSource only supports GET. For POST we use fetch + ReadableStream.
    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const collectedSources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line in buffer

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (currentEvent === 'token') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + data.content }
                    : m
                )
              );
            } else if (currentEvent === 'sources') {
              collectedSources.push(...data.sources);
            } else if (currentEvent === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, isStreaming: false, sources: collectedSources }
                    : m
                )
              );
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Error: failed to get response.', isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, isLoading, sendMessage, stopStreaming };
}
```

### Rendering Markdown in Chat Responses

```typescript
// src/components/MessageBubble.tsx
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../types/chat';
import { SourceCitation } from './SourceCitation';

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'message--user' : 'message--assistant'}`}>
      <div className="message__content">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}

        {message.isStreaming && <span className="cursor-blink">|</span>}
      </div>

      {message.sources && message.sources.length > 0 && (
        <div className="message__sources">
          <p className="message__sources-label">Sources:</p>
          {message.sources.map((source, i) => (
            <SourceCitation key={i} source={source} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Displaying Source Citations

```typescript
// src/components/SourceCitation.tsx
import type { Source } from '../types/chat';

interface Props {
  source: Source;
  index: number;
}

export function SourceCitation({ source, index }: Props) {
  return (
    <div className="source-citation">
      <span className="source-citation__badge">{index}</span>
      <div>
        <p className="source-citation__title">
          {source.url ? (
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title}
            </a>
          ) : (
            source.title
          )}
        </p>
        <p className="source-citation__snippet">{source.snippet}</p>
        {source.score !== undefined && (
          <p className="source-citation__score">
            Relevance: {(source.score * 100).toFixed(0)}%
          </p>
        )}
      </div>
    </div>
  );
}
```

### Main Chat Window

```typescript
// src/components/ChatWindow.tsx
import { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { MessageBubble } from './MessageBubble';

export function ChatWindow() {
  const { messages, isLoading, sendMessage, stopStreaming } = useChat();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="chat-window">
      <div className="chat-window__messages">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <form className="chat-window__input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about football stats..."
          disabled={isLoading}
        />
        {isLoading ? (
          <button type="button" onClick={stopStreaming}>Stop</button>
        ) : (
          <button type="submit" disabled={!input.trim()}>Send</button>
        )}
      </form>
    </div>
  );
}
```

---

## 4. pino (Structured Logging)

### Installation

```bash
npm install pino
npm install -D pino-pretty   # pretty-print for development
```

### Basic Setup

```typescript
// src/logger.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Use pino-pretty in development, JSON in production
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',  // human-readable timestamps
        ignore: 'pid,hostname',
      },
    },
  }),
});

export default logger;
```

### Structured JSON Logging Format

In production, pino outputs one JSON object per line (ndjson):

```json
{"level":30,"time":1710857200000,"msg":"Server listening","port":3001}
{"level":30,"time":1710857201000,"msg":"Chat request received","conversationId":"abc-123","messageLength":42}
```

In development with `pino-pretty`:

```
[2026-03-19 14:00:00] INFO: Server listening (port=3001)
[2026-03-19 14:00:01] INFO: Chat request received (conversationId="abc-123", messageLength=42)
```

### Creating Child Loggers (per-request context)

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

// Middleware that attaches a request-scoped logger
export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID();

  // Child logger inherits parent config + adds persistent fields
  req.log = logger.child({
    requestId,
    path: req.path,
    method: req.method,
  });

  req.log.info('Request received');
  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      log: pino.Logger;
    }
  }
}
```

### Logging Tool Calls with Arguments and Results

```typescript
// src/logging/tool-logger.ts
import logger from '../logger';

interface ToolCallLog {
  tool: string;
  input: unknown;
  output: unknown;
  durationMs: number;
}

export function logToolCall({ tool, input, output, durationMs }: ToolCallLog) {
  logger.info(
    {
      event: 'tool_call',
      tool,
      input,
      output:
        typeof output === 'string' && output.length > 500
          ? output.slice(0, 500) + '...'
          : output,
      durationMs,
    },
    `Tool executed: ${tool}`
  );
}

// Usage in agent pipeline:
export async function executeToolWithLogging(
  toolName: string,
  toolFn: (input: string) => Promise<string>,
  input: string
): Promise<string> {
  const start = Date.now();
  logger.debug({ tool: toolName, input }, `Calling tool: ${toolName}`);

  try {
    const result = await toolFn(input);
    logToolCall({
      tool: toolName,
      input,
      output: result,
      durationMs: Date.now() - start,
    });
    return result;
  } catch (error) {
    logger.error(
      {
        event: 'tool_error',
        tool: toolName,
        input,
        error: (error as Error).message,
        durationMs: Date.now() - start,
      },
      `Tool failed: ${toolName}`
    );
    throw error;
  }
}
```

### Logging LangChain Agent Events

```typescript
// src/logging/agent-logger.ts
import logger from '../logger';

/**
 * LangChain callback-style logging for agent runs.
 * Attach these to your agent executor via `callbacks`.
 */
export const loggingCallbacks = {
  handleLLMStart: async (_llm: unknown, prompts: string[]) => {
    logger.debug(
      { event: 'llm_start', promptCount: prompts.length },
      'LLM invocation started'
    );
  },
  handleLLMEnd: async (output: unknown) => {
    logger.debug({ event: 'llm_end' }, 'LLM invocation completed');
  },
  handleToolStart: async (
    tool: { name: string },
    input: string
  ) => {
    logger.info(
      { event: 'tool_start', tool: tool.name, input },
      `Agent calling tool: ${tool.name}`
    );
  },
  handleToolEnd: async (output: string) => {
    logger.info(
      {
        event: 'tool_end',
        outputPreview: output.slice(0, 200),
      },
      'Tool returned result'
    );
  },
  handleAgentEnd: async (result: { output: string }) => {
    logger.info(
      {
        event: 'agent_end',
        outputLength: result.output.length,
      },
      'Agent finished'
    );
  },
};
```

### Log Levels Reference

| Level   | Value | When to use                                    |
|---------|-------|------------------------------------------------|
| `fatal` | 60    | App is about to crash                          |
| `error` | 50    | Operation failed, needs attention              |
| `warn`  | 40    | Something unexpected but not breaking          |
| `info`  | 30    | Normal operations (requests, tool calls)       |
| `debug` | 20    | Detailed diagnostics (prompts, full responses) |
| `trace` | 10    | Extremely verbose (token-level streaming)      |

Set via environment variable:

```bash
# Development -- see everything
LOG_LEVEL=debug npx tsx src/server.ts

# Production -- info and above
LOG_LEVEL=info node dist/server.js
```
