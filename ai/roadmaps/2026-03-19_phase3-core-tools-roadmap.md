# Phase 3 Roadmap: Core Tools (Calculator + Web Search)

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. Check off each item and move on.

> **Plan:** See [2026-03-19_phase3-core-tools-plan.md](./2026-03-19_phase3-core-tools-plan.md) for the detailed approach and technical reasoning.
> **High-level plan:** See [2026-03-19_high-level-plan.md](./2026-03-19_high-level-plan.md) for how this phase fits into the overall project.

---

## Logging Setup

- [ ] Create `server/src/logger.ts` with pino base logger
- [ ] Configure dual output: `pino-pretty` to stdout (dev), file transport to `./logs/app.log` (always raw JSON)
- [ ] Support `LOG_LEVEL` env var (default: `info`)
- [ ] Add `traceId` and `requestId` generation helpers
- [ ] Log entries include: `{ traceId, requestId, event, tool, input, output, success, durationMs, category }`
- [ ] `category` field values: `tool`, `agent`, `api`, `embedding`, `error`
- [ ] Add `./logs/` to `.gitignore`
- [ ] **Completion**: logs written to both stdout and `./logs/app.log`, parseable with `grep` and `jq` per `ai/guides/testing.md`

## Calculator Tool

- [ ] Create `server/src/tools/calculator.ts`
- [ ] Define tool using `tool` from `@langchain/core/tools` with Zod schema (single `expression` string input)
- [ ] Implement using `mathjs.evaluate()` — return result as string
- [ ] Write a clear tool description that mentions math, arithmetic, percentages, ratios, stat comparisons
- [ ] Wrap implementation in try/catch — return error string on failure, never throw
- [ ] Add structured pino log on every call (tool name, input, output, duration)
- [ ] Verify: `"253/510"` evaluates to `"0.4960784313725490196078431372549"` (or similar)
- [ ] Verify: `"2 + 2"` evaluates to `"4"`
- [ ] Verify: invalid input like `"abc"` returns an error string, does not throw

## Web Search Tool

- [ ] Create `server/src/tools/web-search.ts`
- [ ] Instantiate `TavilySearch` from `@langchain/tavily` with `maxResults: 5`
- [ ] Configure `includeDomains` for sports sources (manutd.com, bbc.co.uk/sport, premierleague.com, skysports.com, espn.com)
- [ ] Add structured pino log on every call (tool name, input, output truncated, duration)
- [ ] Verify: search for "Man United transfer news" returns results with titles and content
- [ ] Verify: errors return strings, not thrown exceptions

## Testing

- [ ] Run each tool independently outside the agent to confirm correct input/output
- [ ] Confirm logs appear in console with structured fields (tool, input, output, durationMs)
- [ ] Confirm no unhandled exceptions from bad input

## Commit

- [ ] Commit: "working calculator and web search tools"
