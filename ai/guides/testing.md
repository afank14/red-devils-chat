# Testing & Logging Guide

## Logs
- Application logs: `./logs/app.log`
- Clear logs: `rm ./logs/*.log`
- Tail recent: `tail -100 ./logs/app.log`
- Log level: Set `LOG_LEVEL` in `.testEnvVars`

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
  "time": 1711036800000,
  "traceId": "abc-123",
  "requestId": "req-456",
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

## Log File Management
- Logs are written to `./logs/app.log` (file transport) AND stdout (console)
- In development: stdout uses `pino-pretty` for readability, file always writes raw JSON
- `./logs/` is gitignored
- Logs do not rotate automatically — clear manually with `rm ./logs/*.log` during development

## Environment
- `LOG_LEVEL` — controls minimum log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`). Default: `info`
- Set in `.env` for normal development, `.testEnvVars` for test runs
