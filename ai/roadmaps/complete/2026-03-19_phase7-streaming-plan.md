# Phase 7 Plan: Streaming (P1 Stretch)

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. SSE streaming is the simplest approach for one-way server-to-client communication. Don't add WebSocket infrastructure, reconnection logic, or buffering layers we don't need.

> **Roadmap:** See `2026-03-19_phase7-streaming-roadmap.md` for the execution checklist.
> **High-level plan:** See `2026-03-19_high-level-plan.md` for project-wide context.

---

## What

Add SSE streaming to the Express backend so the agent's reasoning, tool calls, and generated tokens stream to the frontend in real time. The user sees text appear token-by-token and gets visual indicators when the agent is calling tools, rather than waiting for a complete response.

---

## How

### Backend: SSE Endpoint

Add a new endpoint `POST /api/chat/stream` (or convert the existing `/api/chat` endpoint) that returns an SSE response instead of a JSON body.

- Set response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Use `res.write()` to send SSE-framed events (`event:` + `data:` lines, separated by `\n\n`)
- Use LangChain `streamEvents` (version `"v2"`) or `agent.stream` with `streamMode: "messages"` to get granular events from the agent execution
- Map LangChain stream events to typed SSE events:
  - `token` -- individual LLM text chunks (from `on_chat_model_stream`)
  - `tool_start` -- tool name and input arguments (from `on_tool_start`)
  - `tool_end` -- tool name and output (from `on_tool_end`)
  - `sources` -- RAG source metadata, sent when the RAG tool completes
  - `done` -- signals stream completion, triggers final cleanup
  - `error` -- error messages if something fails mid-stream
- After the stream completes, push the full assistant response to session memory and close the connection

### Frontend: Stream Consumer

Use `fetch` + `ReadableStream` to consume the SSE stream. Native `EventSource` does not support POST requests, so we use the fetch API with a `ReadableStream` reader instead.

- Send the chat request as a normal `POST` with JSON body
- Read the response body as a stream using `response.body.getReader()`
- Parse incoming chunks by splitting on `\n\n` boundaries, extracting `event:` and `data:` fields
- On `token` events: append the token text to the current assistant message and re-render
- On `tool_start` events: show a tool call indicator in the UI (e.g., "Searching knowledge base..." or "Calculating...")
- On `tool_end` events: update or dismiss the tool indicator
- On `sources` events: store source metadata for display beneath the response
- On `done` events: mark the message as complete
- On `error` events: display an error message to the user
- Support aborting the stream via `AbortController` if the user navigates away or sends a new message

### UI Indicators

- Show a typing/streaming indicator while tokens are arriving
- Show tool call indicators (tool name + brief description) when the agent invokes a tool
- Dismiss tool indicators when the corresponding `tool_end` event arrives

### Fallback

Keep the non-streaming endpoint (`POST /api/chat`) working as-is. The streaming endpoint is additive. This ensures the app still works if streaming is disabled or if debugging requires a simpler request/response cycle.

---

## Technical Considerations

- **SSE vs WebSockets**: SSE is the right choice. Communication is one-way (server to client). SSE works over standard HTTP with no upgrade handshake, no connection lifecycle management, no heartbeats. WebSockets would add complexity with zero benefit for this use case.
- **Error handling mid-stream**: If the agent or a tool throws during streaming, catch the error, send an `error` SSE event, and close the connection cleanly. The frontend should handle partial responses gracefully.
- **Connection cleanup on client disconnect**: Listen for the `close` event on the request to detect client disconnection. Cancel the agent execution if the client disconnects to avoid wasted compute.
- **Buffering**: SSE events may arrive as partial chunks in the `ReadableStream`. The frontend parser must buffer incomplete events and only process complete `\n\n`-delimited frames.
- **Memory update**: The full assistant response must be reconstructed from streamed tokens and pushed to session memory after the stream completes, so conversation history stays accurate.
