# Phase 6 Roadmap: Web UI

> **Plan:** See `2026-03-19_phase6-web-ui-plan.md` for the detailed implementation approach.
> **High-level plan:** See `2026-03-19_high-level-plan.md` for full project phases.
> **Principle:** No over-engineering, no cruft, no legacy-compatibility features. Keep it simple.

---

## Tasks

### Chat Component Structure
- [ ] Create `frontend/src/types/chat.ts` — define message types (`{ role: "user" | "assistant", content: string, sources?: Source[] }`)
- [ ] Create `frontend/src/components/ChatWindow.tsx` — container managing message state array and `conversationId`
- [ ] Create `frontend/src/components/MessageList.tsx` — renders messages, auto-scrolls to bottom on new messages
- [ ] Create `frontend/src/components/MessageBubble.tsx` — renders single message, uses `react-markdown` for assistant messages
- [ ] Create `frontend/src/components/ChatInput.tsx` — text input + send button, disables during processing, submits on Enter
- [ ] Create `frontend/src/components/SourceCitation.tsx` — displays source document names/sections below RAG responses
- [ ] Update `frontend/src/App.tsx` to render `ChatWindow`

### API Connection
- [ ] Install `react-markdown` if not already present
- [ ] Generate `conversationId` via `crypto.randomUUID()` on component mount
- [ ] Implement `fetch` POST to `/api/chat` with `{ message, conversationId }` body
- [ ] Parse JSON response and add assistant message (with sources) to message list
- [ ] **Completion**: user can type a message and see a response from the agent

### Markdown Rendering
- [ ] Render assistant messages through `react-markdown`
- [ ] Verify common formatting works: bold, lists, headers, inline code
- [ ] **Completion**: markdown renders correctly in responses (e.g., bold stats, bulleted lists)

### Source Citations
- [ ] Parse source data from API response
- [ ] Render `SourceCitation` component below assistant messages that include sources
- [ ] Style citations distinctly (smaller text, muted color, "Sources:" label)
- [ ] **Completion**: source citations display below RAG-based responses with document name and section

### Styling (based on `ai/guides/external/chatbotUI_claude.md`)
- [ ] Set up CSS custom properties (design tokens) — adapt guide's color palette to Man United branding
- [ ] Add Google Fonts (DM Serif Display + DM Sans) or chosen font pairing
- [ ] Style chat shell layout (flex column: header, scrollable messages, input footer, max-width 760px)
- [ ] Style header (bot avatar, name "Red Devils Chat", status indicator)
- [ ] Style message bubbles (ai vs user distinction, speech-direction corners, entrance animation)
- [ ] Style input area (auto-resize textarea, send button with accent color, disable states)
- [ ] Add typing indicator (animated dots, hidden by default)
- [ ] Add loading indicator that shows while the agent processes
- [ ] Disable input field and send button during processing
- [ ] Basic responsive layout (doesn't break on smaller screens)
- [ ] Optional: add suggested reply chips for common queries
- [ ] **Completion**: UI matches adapted design guide, loading indicator works, clean and readable

### Error Handling
- [ ] Display API errors as system messages in the chat
- [ ] Handle network failures gracefully (show message, re-enable input)
- [ ] **Completion**: errors display in-chat rather than silently failing

### Commit
- [ ] Commit: `"functional chat UI with source display"`
