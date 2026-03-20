# Phase 6 Plan: Web UI

> **Important:** No over-engineering, no cruft, no legacy-compatibility features. Keep the UI simple — one page, one purpose.

> **Roadmap:** See `2026-03-19_phase6-web-ui-roadmap.md` for the execution checklist.
> **High-level plan:** See `2026-03-19_high-level-plan.md` for full project phases.

---

## What

Build a React/TypeScript chat interface that connects to the backend API from Phase 5. Users type questions, see responses rendered as markdown, and see source citations below RAG-based answers. No routing, no auth, no complexity — just a clean chat page.

---

## How

### React + Vite Setup

The frontend was already scaffolded in Phase 1 (`frontend/` directory with Vite + React + TypeScript). Build on that foundation — install any additional dependencies needed (`react-markdown` for rendering).

### Chat Component Structure

Follow the component structure from the architecture doc:

- **`App.tsx`**: Renders the `ChatWindow` component, nothing else
- **`ChatWindow.tsx`**: Container that holds `MessageList` and `ChatInput`. Manages message state (array of `{ role, content, sources? }` objects) and the `conversationId` for session continuity
- **`MessageList.tsx`**: Renders the list of messages, scrolls to bottom on new messages
- **`MessageBubble.tsx`**: Renders a single message. User messages displayed plainly. Assistant messages rendered with `react-markdown`. If the message has sources, renders a `SourceCitation` component below it
- **`ChatInput.tsx`**: Text input field with a send button. Disables input while the agent is processing. Submits on Enter key press
- **`SourceCitation.tsx`**: Displays source document names and sections below a RAG-based response. Simple list format

### API Connection

`ChatWindow` handles the API call:

1. User submits a message via `ChatInput`
2. Add the user message to the message list
3. Show a loading indicator
4. `fetch` POST to `/api/chat` with `{ message, conversationId }` body
5. On response, parse JSON, add assistant message (with sources if present) to the message list
6. Hide loading indicator

Generate a `conversationId` once on component mount (e.g., `crypto.randomUUID()`) and reuse it for the session. This ties into the server-side session memory from Phase 5.

### Markdown Rendering

Use `react-markdown` to render assistant responses. This handles the common formatting the agent produces: bold text, bullet lists, headers, inline code for stats. No need for syntax highlighting or custom renderers — the defaults are sufficient.

### Source Citations

When the agent's response includes source information, display it below the message in a distinct visual style (e.g., smaller text, muted color, preceded by a "Sources:" label). Each source shows the document name and section.

### Styling

Use the chatbot UI guide at `ai/guides/external/chatbotUI_claude.md` as the design foundation. It provides:

- **Design tokens** — CSS custom properties for colors, borders, accent (gold), typography, border-radius. Swap these to re-theme the entire UI. Adapt the color palette to Manchester United branding (reds/blacks instead of gold/dark).
- **Layout** — Flex column structure: header, scrollable message area, input footer. Capped at 760px wide.
- **Fonts** — DM Serif Display (headings/bot name) + DM Sans (body/UI) from Google Fonts.
- **Component CSS** — Pre-built styles for header (avatar, name, status dot), message bubbles (ai vs user alignment, speech-direction corners), typing indicator (animated dots), input area (auto-resize textarea, send button).
- **Animations** — Message entrance animation (`msgIn`), typing dot pulse, status dot pulse.
- **Suggested reply chips** — Optional quick-tap buttons below AI messages. Could use these for common queries ("Tell me about Rooney", "Show the trophy cabinet").
- **JS snippets** — Auto-resize textarea, Enter-to-send, programmatic message append, typing indicator toggle.

Adapt the guide's design — don't copy it verbatim. Key adaptations:
- Rename "Aria" to "Red Devils Chat" with a Man United-themed avatar
- Adjust accent color from gold to United red (`#DA291C`) or keep gold as secondary
- Add source citation styling (not in the guide — add below message bubbles)
- Add streaming indicator styling for Phase 7 compatibility

Use plain CSS with the guide's custom properties approach. No component libraries.

---

## Technical Considerations

- **No routing**: Single page app with one view. React Router is unnecessary.
- **No auth**: Anyone who can reach the page can chat. Authentication is out of scope.
- **CORS**: Already configured on the Express server in Phase 5 to allow the Vite dev server on port 5173.
- **Loading states**: The agent can take several seconds to reason through multi-tool queries. Show clear feedback that processing is happening. Disable the input to prevent duplicate submissions.
- **Error display**: If the API returns an error, show it in the chat as a system message. Don't silently fail.
- **No streaming yet**: Phase 6 uses request-response (complete messages). SSE streaming is added in Phase 7, which will introduce the `useChat` hook for stream handling.
- **Auto-scroll**: When a new message appears, scroll the message list to the bottom so the user always sees the latest response.
- **UI guide reference**: The chatbot UI guide at `ai/guides/external/chatbotUI_claude.md` provides a complete design system. Use it as a starting point and adapt to Manchester United branding.
