# Testing & Logging Guide

## Quick Start

```bash
# Run the full integration test suite (26 tests)
source .testEnvVars && ./scripts/test.sh
```

## CLI Scripts

All scripts are in `scripts/` and run from the project root.

| Script | Purpose | Usage |
|--------|---------|-------|
| `test.sh` | Full integration test suite (26 tests) | `source .testEnvVars && ./scripts/test.sh` |
| `dev.sh` | Start both backend + frontend dev servers | `source .testEnvVars && ./scripts/dev.sh` |
| `build.sh` | Type-check server + build frontend | `./scripts/build.sh` |
| `run.sh` | Start backend server only | `source .testEnvVars && ./scripts/run.sh` |

### Environment: `.testEnvVars`

The `.testEnvVars` file exports all environment variables needed for testing. Source it before running any script:

```bash
source .testEnvVars && ./scripts/test.sh
```

Required variables: `OPENAI_API_KEY`, `TAVILY_API_KEY`, `FOOTBALL_DATA_API_KEY`, `PORT`, `LOG_LEVEL`.

Set `LOG_LEVEL=info` to ensure tool/agent events are logged for verification. Setting it to `error` will suppress info-level logs and cause log verification tests to fail.

### What `test.sh` Tests (26 checks)

1. **Health endpoint** — GET /health returns 200
2. **Input validation (6 tests)** — missing message, empty message, missing conversationId, path traversal, oversized message, no body
3. **Stream validation (2 tests)** — missing message, path traversal on stream endpoint
4. **RAG tool (3 tests)** — correct answer (20 league titles), response has conversationId, response has traceId
5. **Calculator tool** — returns computed decimal result
6. **Web search tool** — returns non-empty response for current events
7. **Football data tool** — returns PL standings data
8. **SSE streaming (4 tests)** — has token events, has tool_start, has done event, streamed content is relevant
9. **Conversation memory** — follow-up with pronoun resolves correctly (253 goals)
10. **Log verification (7 tests)** — file exists, contains tool_start/tool_end/agent_start/agent_end/traceId, valid JSON

## Logs

- Application logs: `./logs/app.log`
- Clear logs: `rm ./logs/*.log`
- Tail recent: `tail -100 ./logs/app.log`
- Pretty-print: `cat ./logs/app.log | npx pino-pretty`

## Log Format

All logs are structured JSON (pino). Each line is a parseable JSON object.

### Tool Call Logs
Every tool invocation produces a log entry:
```json
{
  "level": 30,
  "time": 1711036800000,
  "traceId": "abc-123",
  "requestId": "req-456",
  "event": "tool_end",
  "tool": "rag_search",
  "input": { "query": "Wayne Rooney career goals" },
  "output": "[1] Source: player-legends.md\nWayne Rooney: 253 goals...",
  "success": true,
  "durationMs": 342,
  "category": "tool"
}
```

### Log Fields
| Field | Type | Description |
|-------|------|-------------|
| `traceId` | string | Unique ID for the full request chain (HTTP → agent → tools → response) |
| `requestId` | string | Per-HTTP-request ID |
| `event` | string | `tool_start`, `tool_end`, `agent_start`, `agent_end`, `error` |
| `tool` | string | Tool name: `rag_search`, `calculator`, `tavily_search`, `football_data` |
| `input` | object | Tool input arguments |
| `output` | string | Tool output (truncated to 500 chars) |
| `success` | boolean | Whether the tool call succeeded |
| `durationMs` | number | Execution time in milliseconds |
| `category` | string | `tool`, `agent`, `api`, `embedding`, `error` |

### Error Logs
```json
{
  "level": 50,
  "event": "error",
  "category": "tool",
  "tool": "calculator",
  "input": { "expression": "invalid()" },
  "error": "Error: Undefined symbol invalid",
  "success": false,
  "durationMs": 2
}
```

### Agent Lifecycle Logs
```json
{ "event": "agent_start", "traceId": "abc-123", "category": "agent", "messageCount": 3 }
{ "event": "tool_start", "traceId": "abc-123", "category": "tool", "tool": "rag_search", "input": {...} }
{ "event": "tool_end", "traceId": "abc-123", "category": "tool", "tool": "rag_search", "success": true, "durationMs": 342 }
{ "event": "agent_end", "traceId": "abc-123", "category": "agent", "success": true, "durationMs": 1205 }
```

## How to Parse Logs (for AI agents)

### Find all errors
```bash
grep '"success":false' ./logs/app.log
```

### Find all tool calls for a specific request
```bash
grep '"traceId":"abc-123"' ./logs/app.log | grep '"category":"tool"'
```

### Find slow tool calls (> 2 seconds)
```bash
cat ./logs/app.log | jq 'select(.durationMs > 2000)'
```

### Find all failures by category
```bash
cat ./logs/app.log | jq 'select(.success == false) | {event, category, tool, error}'
```

### Count tool usage
```bash
grep '"event":"tool_end"' ./logs/app.log | jq -r '.tool' | sort | uniq -c | sort -rn
```

### Check which vector store is active
```bash
grep '"vectorstore_init_end"' ./logs/app.log | jq '.storeType'
```

## Log File Management
- Logs are written to `./logs/app.log` (raw JSON) AND stdout (raw JSON, pipe through `pino-pretty` for readability)
- `./logs/` is gitignored
- Logs do not rotate automatically — clear manually with `rm ./logs/*.log` during development
- The test script clears logs before each run

## Environment
- `LOG_LEVEL` — controls minimum log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`). Default: `info`
- Set in `.env` for normal development, `.testEnvVars` for test runs
- `CHROMA_URL` — ChromaDB server URL (default: `http://localhost:8000`). If ChromaDB is not running, falls back to in-memory vector store
