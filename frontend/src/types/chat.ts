export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  answer: string;
  conversationId: string;
  traceId: string;
}

export interface ChatError {
  error: string;
}
