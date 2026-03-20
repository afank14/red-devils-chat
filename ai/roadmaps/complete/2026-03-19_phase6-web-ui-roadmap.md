# Phase 6 Roadmap: Web UI

> **Plan:** See `2026-03-19_phase6-web-ui-plan.md` for the detailed implementation approach.
> **High-level plan:** See `../2026-03-19_high-level-plan.md` for full project phases.
> **Principle:** No over-engineering, no cruft, no legacy-compatibility features. Keep it simple.

---

## Tasks

### Chat Component Structure
- [x] Create `frontend/src/types/chat.ts` — define message types (`{ role: "user" | "assistant", content: string, sources?: Source[] }`)
- [x] Create `frontend/src/components/ChatWindow.tsx` — container managing message state array and `conversationId`
- [x] Create `frontend/src/components/MessageList.tsx` — renders messages, auto-scrolls to bottom on new messages
- [x] Create `frontend/src/components/MessageBubble.tsx` — renders single message, uses `react-markdown` for assistant messages
- [x] Create `frontend/src/components/ChatInput.tsx` — text input + send button, disables during processing, submits on Enter
- [x] Create `frontend/src/components/SourceCitation.tsx` — displays source document names/sections below RAG responses
- [x] Update `frontend/src/App.tsx` to render `ChatWindow`

### API Connection
- [x] Install `react-markdown` if not already present
- [x] Generate `conversationId` via `crypto.randomUUID()` on component mount
- [x] Implement `fetch` POST to `/api/chat` with `{ message, conversationId }` body
- [x] Parse JSON response and add assistant message (with sources) to message list
- [x] **Completion**: user can type a message and see a response from the agent

### Markdown Rendering
- [x] Render assistant messages through `react-markdown`
- [x] Verify common formatting works: bold, lists, headers, inline code
- [x] **Completion**: markdown renders correctly in responses (e.g., bold stats, bulleted lists)

### Source Citations
- [x] Parse source data from API response
- [x] Render `SourceCitation` component below assistant messages that include sources
- [x] Style citations distinctly (smaller text, muted color, "Sources:" label)
- [x] **Completion**: source citations display below RAG-based responses with document name and section

### Styling (based on `ai/guides/external/chatbotUI_claude.md`)
- [x] Set up CSS custom properties (design tokens) — adapt guide's color palette to Man United branding
- [x] Add Google Fonts (DM Serif Display + DM Sans) or chosen font pairing
- [x] Style chat shell layout (flex column: header, scrollable messages, input footer, max-width 760px)
- [x] Style header (bot avatar, name "Red Devils Chat", status indicator)
- [x] Style message bubbles (ai vs user distinction, speech-direction corners, entrance animation)
- [x] Style input area (auto-resize textarea, send button with accent color, disable states)
- [x] Add typing indicator (animated dots, hidden by default)
- [x] Add loading indicator that shows while the agent processes
- [x] Disable input field and send button during processing
- [x] Basic responsive layout (doesn't break on smaller screens)
- [x] Optional: add suggested reply chips for common queries
- [x] **Completion**: UI matches adapted design guide, loading indicator works, clean and readable

### Error Handling
- [x] Display API errors as system messages in the chat
- [x] Handle network failures gracefully (show message, re-enable input)
- [x] **Completion**: errors display in-chat rather than silently failing

### Commit
- [x] Commit: `"functional chat UI with source display"`
