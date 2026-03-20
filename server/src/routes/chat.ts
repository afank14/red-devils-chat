import { Router, Request, Response } from "express";
import { invokeAgent, MAX_MESSAGE_LENGTH } from "../agent/agent.js";
import logger, { generateRequestId, generateTraceId } from "../logger.js";

const router = Router();

const CONVERSATION_ID_MAX_LENGTH = 100;
const CONVERSATION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

router.post("/api/chat", async (req: Request, res: Response) => {
  const requestId = generateRequestId();
  const traceId = generateTraceId();
  const childLogger = logger.child({ requestId, traceId });

  childLogger.info(
    { event: "api_request", category: "api", body: { message: req.body?.message?.slice(0, 100), conversationId: req.body?.conversationId } },
    "chat request received"
  );

  const start = Date.now();

  try {
    const { message, conversationId } = req.body ?? {};

    // Validate message
    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "message is required and must be a non-empty string" });
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: `message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` });
      return;
    }

    // Validate conversationId
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

    const result = await invokeAgent(message, conversationId);

    const durationMs = Date.now() - start;
    childLogger.info(
      { event: "api_response", category: "api", success: true, durationMs },
      "chat response sent"
    );

    res.json({
      answer: result.answer,
      conversationId: result.conversationId,
      traceId: result.traceId,
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    childLogger.error(
      { event: "api_response", category: "api", success: false, durationMs, error: errorMsg },
      "chat request failed"
    );

    res.status(500).json({ error: "An internal error occurred. Please try again." });
  }
});

export default router;
