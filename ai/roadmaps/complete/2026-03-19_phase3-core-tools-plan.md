# Phase 3 Plan: Core Tools (Calculator + Web Search)

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. Build exactly what the agent needs, nothing more. If a configuration option or abstraction isn't needed yet, skip it.

> **Roadmap:** See [2026-03-19_phase3-core-tools-roadmap.md](./2026-03-19_phase3-core-tools-roadmap.md) for the execution checklist.
> **High-level plan:** See [2026-03-19_high-level-plan.md](./2026-03-19_high-level-plan.md) for how this phase fits into the overall project.

---

## What

Build two tools the agent will use: a calculator tool and a web search tool. Both are standalone — they don't depend on each other or on the RAG pipeline (Phase 4). Each tool is defined using LangChain's `tool` function with a Zod schema describing its input, so the agent knows when and how to call it.

---

## How

### Calculator Tool (`server/src/tools/calculator.ts`)

Use the `tool` function from `@langchain/core/tools` to define a tool named `calculator`. The Zod schema takes a single `expression` string. The implementation calls `mathjs.evaluate(expression)` and returns the result as a string.

The tool description is critical — it tells the agent when to use this tool. Describe it as a calculator for math expressions: arithmetic, percentages, ratios, stat comparisons. The agent uses this description to decide routing.

### Web Search Tool (`server/src/tools/web-search.ts`)

Instantiate `TavilySearch` from `@langchain/tavily` with `maxResults: 5`. Configure `includeDomains` to bias toward sports sources (manutd.com, bbc.co.uk/sport, premierleague.com, skysports.com, espn.com). The tool name should be `tavily_search`.

TavilySearch is already a LangChain tool — it doesn't need wrapping with the `tool` function. Just instantiate it with the right config and pass it to the agent.

### Logging (`server/src/logger.ts`)

Set up pino with dual output: `pino-pretty` to stdout for development readability, plus a file transport writing raw JSON to `./logs/app.log` for AI-parseable log analysis. Export a base logger. Every tool call should be logged with structured fields: `{ traceId, requestId, event, tool, input, output (truncated to 500 chars), success, durationMs, category }`. Use `logger.child()` to create scoped loggers per request. See `ai/guides/testing.md` for the full log format spec.

---

## Technical Considerations

### Error handling: catch, never throw

Both tools must catch errors internally and return error strings instead of throwing. If `mathjs.evaluate()` throws on bad input, the tool catches it and returns something like `"Error: invalid expression 'abc'"`. This lets the LLM see the error, adapt its approach, and retry with corrected input. A thrown error would break the agent loop.

### Security: mathjs, not eval

`mathjs.evaluate()` runs in a sandboxed expression parser — it can only do math. `eval()` or `new Function()` would execute arbitrary JavaScript, which is dangerous when the LLM generates the expression string. This is a hard requirement, not a preference.

### Tool descriptions matter

The agent decides which tool to call based on tool descriptions. A vague description leads to bad routing. The calculator description should mention math expressions, arithmetic, percentages, and ratios. The web search description should mention current events, recent news, and information not in the knowledge base.

### Pino structured logging

Every tool call gets a log entry with: `{ traceId, requestId, event, tool, input, output, success, durationMs, category }`. Output should be truncated to 500 chars to avoid flooding logs with full search results. Use `pino-pretty` to stdout in dev for readable output, plus file transport to `./logs/app.log` (always raw JSON). The logger is configured via `LOG_LEVEL` env var (default: `info`). The `success` boolean and `category` field enable AI agents to quickly filter and diagnose failures. See `ai/guides/testing.md` for parsing commands.
