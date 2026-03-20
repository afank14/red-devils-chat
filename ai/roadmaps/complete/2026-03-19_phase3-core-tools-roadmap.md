# Phase 3 Roadmap: Core Tools (Calculator + Web Search)

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. Check off each item and move on.

> **Plan:** See [2026-03-19_phase3-core-tools-plan.md](./2026-03-19_phase3-core-tools-plan.md) for the detailed approach and technical reasoning.
> **High-level plan:** See [2026-03-19_high-level-plan.md](../2026-03-19_high-level-plan.md) for how this phase fits into the overall project.

---

## Logging Setup

- [x] Create `server/src/logger.ts` with pino base logger
- [x] Configure dual output: `pino-pretty` to stdout (dev), file transport to `./logs/app.log` (always raw JSON)
- [x] Support `LOG_LEVEL` env var (default: `info`)
- [x] Add `traceId` and `requestId` generation helpers
- [x] Log entries include: `{ traceId, requestId, event, tool, input, output, success, durationMs, category }`
- [x] `category` field values: `tool`, `agent`, `api`, `embedding`, `error`
- [x] Add `./logs/` to `.gitignore`
- [x] **Completion**: logs written to both stdout and `./logs/app.log`, parseable with `grep` and `jq` per `ai/guides/testing.md`

## Calculator Tool

- [x] Create `server/src/tools/calculator.ts`
- [x] Define tool using `tool` from `@langchain/core/tools` with Zod schema (single `expression` string input)
- [x] Implement using `mathjs.evaluate()` — return result as string
- [x] Write a clear tool description that mentions math, arithmetic, percentages, ratios, stat comparisons
- [x] Wrap implementation in try/catch — return error string on failure, never throw
- [x] Add structured pino log on every call (tool name, input, output, duration)
- [x] Security: input length limit (1000 chars), empty expression guard, mathjs sandbox verified
- [x] Verify: `"253/510"` evaluates to `"0.4960784313725490196078431372549"` (or similar)
- [x] Verify: `"2 + 2"` evaluates to `"4"`
- [x] Verify: invalid input like `"abc"` returns an error string, does not throw

## Web Search Tool

- [x] Create `server/src/tools/web-search.ts`
- [x] Instantiate `TavilySearch` from `@langchain/tavily` with `maxResults: 5`
- [x] Configure `includeDomains` for sports sources (manutd.com, bbc.co.uk/sport, premierleague.com, skysports.com, espn.com)
- [x] Add structured pino log on every call (tool name, input, output truncated, duration)
- [x] Security: query length limit (500 chars), empty query guard
- [x] Verify: search for "Man United transfer news" returns results with titles and content
- [x] Verify: errors return strings, not thrown exceptions

## Testing

- [x] Run each tool independently outside the agent to confirm correct input/output
- [x] Confirm logs appear in console with structured fields (tool, input, output, durationMs)
- [x] Confirm no unhandled exceptions from bad input

## Commit

- [x] Commit: "working calculator and web search tools"
