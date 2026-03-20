import { useState, useMemo, useCallback, useRef } from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import type { ChatMessage } from "../types/chat";

const STREAM_URL = "http://localhost:3000/api/chat/stream";

interface SSEEvent {
  event: string;
  data: string;
}

function parseSSEChunk(text: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const blocks = text.split("\n\n");
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = "";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7);
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (event && data) events.push({ event, data });
  }
  return events;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const conversationId = useMemo(() => crypto.randomUUID(), []);

  const handleSend = useCallback(
    async (message: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ChatMessage = { role: "user", content: message };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setActiveTool(null);

      let buffer = "";
      let fullAnswer = "";
      let assistantAdded = false;

      try {
        const res = await fetch(STREAM_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, conversationId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          const errMsg = errBody?.error ?? `Server error (${res.status})`;
          setMessages((prev) => [...prev, { role: "system", content: errMsg }]);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No readable stream");

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lastDoubleNewline = buffer.lastIndexOf("\n\n");
          if (lastDoubleNewline === -1) continue;

          const complete = buffer.slice(0, lastDoubleNewline + 2);
          buffer = buffer.slice(lastDoubleNewline + 2);

          const events = parseSSEChunk(complete);
          for (const evt of events) {
            try {
              const payload = JSON.parse(evt.data);

              if (evt.event === "token" && payload.content) {
                fullAnswer += payload.content;
                // Clear tool indicator when first real token arrives
                setActiveTool(null);

                if (!assistantAdded) {
                  // First token — add the assistant message
                  assistantAdded = true;
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: fullAnswer },
                  ]);
                } else {
                  // Subsequent tokens — update the last message
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: fullAnswer,
                    };
                    return updated;
                  });
                }
              } else if (evt.event === "tool_start") {
                setActiveTool(formatToolName(payload.tool));
              } else if (evt.event === "tool_end") {
                // Don't clear activeTool here — keep it visible until
                // the next tool_start or first token arrives.
                // This ensures fast tools (calculator <5ms) are still visible.
              } else if (evt.event === "error") {
                setMessages((prev) => [
                  ...prev,
                  { role: "system", content: payload.error },
                ]);
              }
            } catch {
              // Skip unparseable events
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!assistantAdded) {
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: "Unable to reach the server. Please check that the backend is running.",
            },
          ]);
        }
      } finally {
        setIsLoading(false);
        setActiveTool(null);
      }
    },
    [conversationId]
  );

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <div className="avatar">⚽</div>
        <div className="header-info">
          <div className="header-name">Red Devils Chat</div>
          <div className="header-status">
            <span className="status-dot"></span>
            Online — powered by GPT-4o
          </div>
        </div>
      </header>

      <MessageList messages={messages} isLoading={isLoading} activeTool={activeTool} />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}

function formatToolName(tool: string): string {
  switch (tool) {
    case "rag_search": return "Searching knowledge base…";
    case "calculator": return "Calculating…";
    case "TavilySearch":
    case "tavily_search": return "Searching the web…";
    default: return `Using ${tool}…`;
  }
}
