# Phase 7 Roadmap: Streaming (P1 Stretch)

> **Plan:** See `2026-03-19_phase7-streaming-plan.md` for the detailed approach and technical reasoning.
> **High-level plan:** See `2026-03-19_high-level-plan.md` for project-wide context.
> **Principle:** No over-engineering, no cruft, no legacy-compatibility features. Keep it simple.

---

## Tasks

### Backend SSE Endpoint

- [ ] Create `POST /api/chat/stream` endpoint in Express with SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`)
- [ ] Wire up LangChain `streamEvents` (version `"v2"`) or `agent.stream` with `streamMode: "messages"` to get granular agent events
- [ ] Map agent stream events to typed SSE events: `token`, `tool_start`, `tool_end`, `sources`, `done`, `error`
- [ ] Send each SSE event via `res.write()` with proper framing (`event:` + `data:` + `\n\n`)
- [ ] Reconstruct full assistant response from streamed tokens and push to session memory after stream completes
- [ ] Handle client disconnect: listen for `close` event on request, cancel agent execution
- [ ] Handle errors mid-stream: catch exceptions, send `error` SSE event, close connection cleanly

### Frontend Stream Parser

- [ ] Replace (or add alongside) the existing `fetch` call with a streaming fetch that reads `response.body.getReader()`
- [ ] Implement SSE frame parser: buffer incoming chunks, split on `\n\n`, extract `event:` and `data:` fields
- [ ] Handle `token` events: append text to current assistant message, trigger re-render
- [ ] Handle `tool_start` events: display tool call indicator in UI
- [ ] Handle `tool_end` events: dismiss tool call indicator
- [ ] Handle `sources` events: store source metadata for citation display
- [ ] Handle `done` events: mark message as complete
- [ ] Handle `error` events: display error to user
- [ ] Wire up `AbortController` to cancel the stream on unmount or new message

### UI Indicators

- [ ] Add streaming text indicator (cursor or animation while tokens arrive)
- [ ] Add tool call indicator component showing tool name and status (e.g., "Searching knowledge base...")
- [ ] Dismiss tool indicators on corresponding `tool_end` event

### Fallback

- [ ] Verify non-streaming `POST /api/chat` endpoint still works as before

---

## Completion Criteria

- Tokens stream to the UI as the agent generates them (no waiting for full response)
- Tool call start/end events show in the UI as visual indicators
- Connection cleans up on client disconnect (no orphaned agent executions)
- Non-streaming endpoint still works as a fallback
- Error mid-stream displays a meaningful message to the user

---

## Commit

- [ ] Commit: "streaming agent reasoning in UI"
