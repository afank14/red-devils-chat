# Chatbot UI Guide

A reference for the chatbot interface design — covering design tokens, component structure, CSS, and customisation notes.

---

## Fonts

Import from Google Fonts in your `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
```

| Role | Family | Weight |
|---|---|---|
| Headings / bot name | DM Serif Display | Regular |
| Body / UI | DM Sans | 300 (light), 400, 500 |

---

## Design Tokens

All colours and core values are defined as CSS custom properties on `:root`. Swap these to re-theme the entire UI in one place.

```css
:root {
  /* Backgrounds */
  --bg:         #0e0d0c;   /* Page background */
  --surface:    #181714;   /* Chat shell surface */
  --bubble-ai:  #1e1c19;   /* AI message bubble */
  --bubble-usr: #2a2720;   /* User message bubble */

  /* Borders */
  --border:     #2b2925;

  /* Accent (gold) */
  --accent:     #e8b86d;
  --accent-dim: #a07a3e;

  /* Text */
  --text:       #f0ece4;   /* Primary text */
  --muted:      #7a7268;   /* Timestamps, labels, placeholders */

  /* Misc */
  --radius:     18px;      /* Bubble border radius */

  /* Typography */
  --font-head:  'DM Serif Display', Georgia, serif;
  --font-body:  'DM Sans', sans-serif;
}
```

---

## Layout

The UI is a single flex column capped at `760px` wide and `740px` tall (or `82vh`, whichever is smaller).

```
┌─────────────────────────────────┐
│           .chat-header          │  flex-shrink: 0
├─────────────────────────────────┤
│                                 │
│         .chat-messages          │  flex: 1  (scrolls)
│                                 │
├─────────────────────────────────┤
│           .chat-footer          │  flex-shrink: 0
└─────────────────────────────────┘
```

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-weight: 300;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.chat-shell {
  width: 100%;
  max-width: 760px;
  height: min(82vh, 740px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.03);
  background: var(--surface);
}
```

---

## Components

### Header

Contains the bot avatar, name, online status, and action buttons.

```html
<header class="chat-header">
  <div class="avatar">✦</div>
  <div class="header-info">
    <div class="header-name">Aria</div>
    <div class="header-status">
      <span class="status-dot"></span>
      Online — typically replies instantly
    </div>
  </div>
  <div class="header-actions">
    <button class="icon-btn" title="Search">⌕</button>
    <button class="icon-btn" title="More options">⋯</button>
  </div>
</header>
```

```css
.chat-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 28px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: linear-gradient(180deg, #1e1c19 0%, var(--surface) 100%);
}

.avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #c97b34);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(232,184,109,.15);
}

.header-info { flex: 1; }

.header-name {
  font-family: var(--font-head);
  font-size: 17px;
  letter-spacing: .01em;
  color: var(--text);
}

.header-status {
  font-size: 12px;
  color: var(--muted);
  margin-top: 1px;
  display: flex; align-items: center; gap: 5px;
}

/* Animated green dot */
.status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #6fcf97;
  box-shadow: 0 0 6px #6fcf97;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: .4; }
}

.header-actions { display: flex; gap: 8px; }

.icon-btn {
  width: 34px; height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s;
  font-size: 15px;
}
.icon-btn:hover { border-color: var(--accent-dim); color: var(--accent); }
```

---

### Message Feed

The scrollable area that holds all messages.

```html
<main class="chat-messages" id="messages">
  <!-- date dividers, .msg rows go here -->
</main>
```

```css
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 28px 28px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  scroll-behavior: smooth;
}

/* Slim custom scrollbar */
.chat-messages::-webkit-scrollbar       { width: 4px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
```

#### Date Divider

```html
<div class="date-divider">Today</div>
```

```css
.date-divider {
  display: flex; align-items: center; gap: 12px;
  color: var(--muted);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.date-divider::before,
.date-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}
```

---

### Message Rows

Each message is a `.msg` row containing an avatar and a body. Add the `.ai` or `.user` modifier to flip alignment and style.

```html
<!-- AI message -->
<div class="msg ai">
  <div class="msg-avatar">✦</div>
  <div class="msg-body">
    <span class="msg-name">Aria</span>
    <div class="bubble">Hello! How can I help?</div>
    <span class="msg-time">9:41 AM</span>
  </div>
</div>

<!-- User message -->
<div class="msg user">
  <div class="msg-avatar">👤</div>
  <div class="msg-body">
    <div class="bubble">What makes a great landing page?</div>
    <span class="msg-time">9:43 AM</span>
  </div>
</div>
```

```css
/* Entrance animation applied to every new message */
@keyframes msgIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.msg {
  display: flex;
  gap: 12px;
  animation: msgIn .28s cubic-bezier(.22,1,.36,1) both;
}
.msg.user { flex-direction: row-reverse; }

.msg-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 14px;
  display: flex; align-items: center; justify-content: center;
}
.msg.ai   .msg-avatar { background: linear-gradient(135deg, var(--accent), #c97b34); }
.msg.user .msg-avatar { background: #2e2b27; border: 1px solid var(--border); }

.msg-body {
  max-width: 72%;
  display: flex; flex-direction: column; gap: 4px;
}
.msg.user .msg-body { align-items: flex-end; }

.msg-name {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: .04em;
  text-transform: uppercase;
}

/* Bubble shared styles */
.bubble {
  padding: 13px 17px;
  border-radius: var(--radius);
  font-size: 14.5px;
  line-height: 1.65;
  position: relative;
}

/* AI bubble — flat top-left corner creates a "speech from left" feel */
.msg.ai .bubble {
  background: var(--bubble-ai);
  border: 1px solid var(--border);
  border-top-left-radius: 4px;
  color: var(--text);
}

/* User bubble — flat top-right corner */
.msg.user .bubble {
  background: var(--bubble-usr);
  border: 1px solid #3a3630;
  border-top-right-radius: 4px;
  color: var(--text);
}

.msg-time {
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 2px;
}
```

---

### Typing Indicator

Hidden by default (`display:none`). Toggle to `display:flex` while waiting for a response.

```html
<div class="msg ai typing" id="typing-indicator" style="display:none">
  <div class="msg-avatar">✦</div>
  <div class="msg-body">
    <div class="bubble">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  </div>
</div>
```

```css
.typing .bubble {
  display: flex; gap: 5px; align-items: center;
  padding: 14px 18px;
}

.dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--muted);
}
.dot:nth-child(1) { animation: blink 1.2s 0.0s infinite; }
.dot:nth-child(2) { animation: blink 1.2s 0.2s infinite; }
.dot:nth-child(3) { animation: blink 1.2s 0.4s infinite; }

@keyframes blink {
  0%, 80%, 100% { opacity: .3; transform: scale(1); }
  40%           { opacity: 1;  transform: scale(1.3); }
}
```

---

### Suggested Reply Chips

Render below an AI message to offer quick-tap options. Remove after the user sends a message.

```html
<div class="suggestions">
  <button class="suggestion-chip">Tell me what you can do</button>
  <button class="suggestion-chip">Help me write something</button>
  <button class="suggestion-chip">Brainstorm ideas</button>
</div>
```

```css
.suggestions {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-top: 4px;
}

.suggestion-chip {
  padding: 6px 13px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 12.5px;
  cursor: pointer;
  transition: all .18s;
}
.suggestion-chip:hover {
  background: rgba(232,184,109,.08);
  border-color: var(--accent-dim);
}
```

---

### Input Area (Footer)

Auto-resizing textarea flanked by an attach button and a send button.

```html
<footer class="chat-footer">
  <div class="input-row">
    <button class="attach-btn" title="Attach file">⊕</button>
    <textarea
      id="chat-input"
      rows="1"
      placeholder="Message Aria…"
      onkeydown="handleKey(event)"
      oninput="autoResize(this)"
    ></textarea>
    <button class="send-btn" id="send-btn" disabled>➤</button>
  </div>
  <p class="footer-hint">AI can make mistakes — always verify important information.</p>
</footer>
```

```css
.chat-footer {
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--surface);
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: #141210;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 10px 12px;
  transition: border-color .2s;
}
.input-row:focus-within { border-color: var(--accent-dim); }

.attach-btn {
  background: none; border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 18px; padding: 4px;
  transition: color .18s;
  line-height: 1;
  flex-shrink: 0;
}
.attach-btn:hover { color: var(--accent); }

#chat-input {
  flex: 1;
  background: none; border: none; outline: none;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14.5px;
  font-weight: 300;
  resize: none;
  max-height: 120px;
  line-height: 1.5;
  padding: 3px 0;
}
#chat-input::placeholder { color: var(--muted); }

.send-btn {
  width: 36px; height: 36px;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: #0e0d0c;
  cursor: pointer;
  font-size: 17px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all .18s;
  transform-origin: center;
}
.send-btn:hover    { background: #f0c97e; transform: scale(1.05); }
.send-btn:active   { transform: scale(.95); }
.send-btn:disabled { background: var(--border); color: var(--muted); cursor: default; transform: none; }

.footer-hint {
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  margin-top: 10px;
  letter-spacing: .02em;
}
```

---

## JavaScript Snippets

### Auto-resize textarea

```js
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
```

### Send on Enter (Shift+Enter for newline)

```js
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}
```

### Append a message programmatically

```js
function appendMessage(text, role /* 'ai' | 'user' */) {
  const row = document.createElement('div');
  row.className = `msg ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'ai' ? '✦' : '👤';

  const body = document.createElement('div');
  body.className = 'msg-body';
  if (role === 'user') body.style.alignItems = 'flex-end';

  if (role === 'ai') {
    const name = document.createElement('span');
    name.className = 'msg-name';
    name.textContent = 'Aria'; // ← your bot name
    body.appendChild(name);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  const time = document.createElement('span');
  time.className = 'msg-time';
  time.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  body.appendChild(bubble);
  body.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(body);

  // Insert before the typing indicator so it stays at the bottom
  const typingEl = document.getElementById('typing-indicator');
  msgs.insertBefore(row, typingEl);
  msgs.scrollTop = msgs.scrollHeight;
}
```

### Show / hide the typing indicator

```js
const typingEl = document.getElementById('typing-indicator');

// Show while waiting for a response
typingEl.style.display = 'flex';
msgs.scrollTop = msgs.scrollHeight;

// Hide once response arrives
typingEl.style.display = 'none';
```

---

## Customisation Notes

| What to change | Where |
|---|---|
| Bot name | `.header-name` text + `msg-name` label in `appendMessage()` |
| Bot avatar glyph / image | `.avatar` and `.msg.ai .msg-avatar` content |
| Accent colour | `--accent` and `--accent-dim` in `:root` |
| Shell size | `max-width` and `height` on `.chat-shell` |
| Bubble max width | `max-width` on `.msg-body` (currently `72%`) |
| Footer disclaimer | `.footer-hint` paragraph text |
| Connect a real API | Replace the `replies[]` stub in `handleSend()` with a `fetch()` call to your backend |