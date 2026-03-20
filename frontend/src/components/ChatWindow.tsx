import { useState, useMemo, useCallback } from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import type { ChatMessage, ChatResponse, ChatError } from "../types/chat";

const API_URL = "http://localhost:3000/api/chat";

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const conversationId = useMemo(() => crypto.randomUUID(), []);

  const handleSend = useCallback(
    async (message: string) => {
      const userMessage: ChatMessage = { role: "user", content: message };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, conversationId }),
        });

        if (!res.ok) {
          const errBody = (await res.json().catch(() => null)) as ChatError | null;
          const errMsg = errBody?.error ?? `Server error (${res.status})`;
          setMessages((prev) => [
            ...prev,
            { role: "system", content: errMsg },
          ]);
          return;
        }

        const data = (await res.json()) as ChatResponse;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: "Unable to reach the server. Please check that the backend is running.",
          },
        ]);
      } finally {
        setIsLoading(false);
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

      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
