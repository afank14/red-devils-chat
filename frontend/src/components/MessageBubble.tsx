import Markdown from "react-markdown";
import type { ChatMessage } from "../types/chat";

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="msg system">
        <div className="msg-body">
          <div className="bubble system-bubble">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`msg ${isUser ? "user" : "ai"}`}>
      <div className="msg-avatar">{isUser ? "👤" : "⚽"}</div>
      <div className="msg-body">
        {!isUser && <span className="msg-name">Red Devils Chat</span>}
        <div className="bubble">
          {isUser ? (
            message.content
          ) : (
            <Markdown>{message.content}</Markdown>
          )}
        </div>
        <span className="msg-time">
          {new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
