import { Router, Request, Response } from "express";
import { initAgentForStream, getSessionHistory, trimHistory, MAX_MESSAGE_LENGTH } from "../agent/agent.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import logger, { generateRequestId, generateTraceId, truncateOutput } from "../logger.js";
import { ToolLoggingHandler } from "../agent/callbacks.js";

const router = Router();

const CONVERSATION_ID_MAX_LENGTH = 100;
const CONVERSATION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post("/api/chat/stream", async (req: Request, res: Response) => {
  const requestId = generateRequestId();
  const traceId = generateTraceId();
  const childLogger = logger.child({ requestId, traceId });

  // Validate input
  const { message, conversationId } = req.body ?? {};

  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required and must be a non-empty string" });
    return;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` });
    return;
  }
  if (typeof conversationId !== "string" || !conversationId.trim()) {
    res.status(400).json({ error: "conversationId is required and must be a non-empty string" });
    return;
  }
  if (conversationId.length > CONVERSATION_ID_MAX_LENGTH) {
    res.status(400).json({ error: `conversationId exceeds maximum length of ${CONVERSATION_ID_MAX_LENGTH} characters` });
    return;
  }
  if (!CONVERSATION_ID_PATTERN.test(conversationId)) {
    res.status(400).json({ error: "conversationId must contain only alphanumeric characters, hyphens, and underscores" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const history = getSessionHistory(conversationId);
  history.push(new HumanMessage(message));
  const trimmed = trimHistory(history);

  const toolCallback = new ToolLoggingHandler(childLogger);
  let fullAnswer = "";
  let aborted = false;
  const abortController = new AbortController();

  // Detect client disconnect (listen on response, not request)
  res.on("close", () => {
    aborted = true;
    abortController.abort();
    childLogger.info({ event: "stream_client_disconnect", category: "api" }, "client disconnected");
  });

  childLogger.info(
    { event: "stream_start", category: "api", conversationId, messageCount: trimmed.length },
    "stream started"
  );

  const start = Date.now();

  try {
    const agent = initAgentForStream();

    const stream = agent.streamEvents(
      { messages: trimmed },
      { version: "v2" as const, recursionLimit: 10, callbacks: [toolCallback], signal: abortController.signal }
    );

    for await (const event of stream) {
      if (aborted) break;

      if (event.event === "on_chat_model_stream") {
        const content = event.data?.chunk?.content;
        const toolCallChunks = event.data?.chunk?.tool_call_chunks;
        const hasToolCall = toolCallChunks && toolCallChunks.length > 0;

        if (content && !hasToolCall) {
          fullAnswer += content;
          sendSSE(res, "token", { content });
        }
      } else if (event.event === "on_tool_start") {
        const toolName = event.name ?? "unknown";
        const input = event.data?.input;
        sendSSE(res, "tool_start", { tool: toolName, input: typeof input === "string" ? input.slice(0, 200) : input });
      } else if (event.event === "on_tool_end") {
        const toolName = event.name ?? "unknown";
        sendSSE(res, "tool_end", { tool: toolName });
      }
    }

    if (!aborted) {
      // Push full response to session memory
      if (fullAnswer) {
        history.push(new AIMessage(fullAnswer));
      }

      sendSSE(res, "done", { traceId, conversationId });

      const durationMs = Date.now() - start;
      childLogger.info(
        { event: "stream_end", category: "api", success: true, durationMs, answerLength: fullAnswer.length },
        "stream completed"
      );
    }
  } catch (err) {
    if (aborted) return; // Client already gone

    const errorMsg = err instanceof Error ? err.message : String(err);

    // Remove the human message we pushed if streaming failed
    if (history.length > 0 && history[history.length - 1] instanceof HumanMessage) {
      history.pop();
    }

    sendSSE(res, "error", { error: "An error occurred while processing your request." });

    const durationMs = Date.now() - start;
    childLogger.error(
      { event: "stream_end", category: "api", success: false, durationMs, error: errorMsg },
      "stream failed"
    );
  } finally {
    if (!aborted) {
      res.end();
    }
  }
});

export default router;
