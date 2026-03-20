import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { SYSTEM_PROMPT } from "./system-prompt.js";
import ragSearchTool from "../tools/rag-search.js";
import calculatorTool from "../tools/calculator.js";
import getTavilySearch from "../tools/web-search.js";
import { initVectorStore } from "../rag/vector-store.js";
import logger, { generateTraceId, generateRequestId } from "../logger.js";
import { ToolLoggingHandler } from "./callbacks.js";

const RECURSION_LIMIT = 10;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 50;

// Lazy-initialized after dotenv loads
let agent: ReturnType<typeof createAgent> | null = null;

const sessionStore = new Map<string, BaseMessage[]>();

function getSessionHistory(conversationId: string): BaseMessage[] {
  if (!sessionStore.has(conversationId)) {
    sessionStore.set(conversationId, []);
  }
  return sessionStore.get(conversationId)!;
}

function trimHistory(history: BaseMessage[]): BaseMessage[] {
  if (history.length <= MAX_HISTORY_LENGTH) return history;
  return history.slice(history.length - MAX_HISTORY_LENGTH);
}

export interface AgentResponse {
  answer: string;
  conversationId: string;
  traceId: string;
}

export async function invokeAgent(
  message: string,
  conversationId: string
): Promise<AgentResponse> {
  if (!agent) {
    throw new Error("Agent not initialized. Call initAgent() first.");
  }

  const traceId = generateTraceId();
  const requestId = generateRequestId();
  const childLogger = logger.child({ traceId, requestId });

  const history = getSessionHistory(conversationId);

  childLogger.info(
    {
      event: "agent_start",
      category: "agent",
      messageCount: history.length + 1,
      conversationId,
    },
    "agent invoked"
  );

  const start = Date.now();

  try {
    history.push(new HumanMessage(message));
    const trimmed = trimHistory(history);

    const toolCallback = new ToolLoggingHandler(childLogger);
    const result = await agent.invoke(
      { messages: trimmed },
      { recursionLimit: RECURSION_LIMIT, callbacks: [toolCallback] }
    );

    const lastMessage = result.messages[result.messages.length - 1];
    const answer =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    history.push(new AIMessage(answer));

    const durationMs = Date.now() - start;
    childLogger.info(
      {
        event: "agent_end",
        category: "agent",
        success: true,
        durationMs,
        conversationId,
      },
      "agent completed"
    );

    return { answer, conversationId, traceId };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    childLogger.error(
      {
        event: "agent_end",
        category: "agent",
        success: false,
        durationMs,
        error: errorMsg,
        conversationId,
      },
      "agent failed"
    );

    // Remove the human message we pushed if agent failed
    if (history.length > 0 && history[history.length - 1] instanceof HumanMessage) {
      history.pop();
    }

    throw err;
  }
}

export async function initAgent(): Promise<void> {
  const llm = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
  });

  agent = createAgent({
    model: llm,
    tools: [ragSearchTool, calculatorTool, getTavilySearch()],
    prompt: SYSTEM_PROMPT,
  });

  await initVectorStore();
  logger.info({ event: "agent_ready", category: "agent" }, "agent initialized");
}

export function initAgentForStream() {
  if (!agent) {
    throw new Error("Agent not initialized. Call initAgent() first.");
  }
  return agent;
}

export { sessionStore, getSessionHistory, trimHistory, MAX_MESSAGE_LENGTH, MAX_HISTORY_LENGTH };
