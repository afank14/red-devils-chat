import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import ToolIndicator from "./ToolIndicator";
import type { ChatMessage } from "../types/chat";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  activeTool: string | null;
}

export default function MessageList({ messages, isLoading, activeTool }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, activeTool]);

  // Show a "thinking" indicator when loading but no tool is active yet
  // and no tokens have started streaming
  const lastMsg = messages[messages.length - 1];
  const isStreaming = lastMsg?.role === "assistant" && isLoading;
  const showThinking = isLoading && !activeTool && !isStreaming;

  return (
    <main className="chat-messages">
      {messages.length === 0 && (
        <div className="welcome-msg">
          <p>Ask me anything about Manchester United — history, players, stats, trophies, or the latest news.</p>
        </div>
      )}
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      {activeTool && <ToolIndicator label={activeTool} />}
      {showThinking && <ToolIndicator label="Thinking…" />}
      <div ref={bottomRef} />
    </main>
  );
}
