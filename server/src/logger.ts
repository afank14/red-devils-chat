import pino from "pino";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const logsDir = path.resolve(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const transports = pino.transport({
  targets: [
    {
      target: "pino-pretty",
      options: { colorize: true, destination: 1 },
      level: process.env.LOG_LEVEL ?? "info",
    },
    {
      target: "pino/file",
      options: { destination: path.join(logsDir, "app.log"), mkdir: true },
      level: process.env.LOG_LEVEL ?? "info",
    },
  ],
});

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" }, transports);

export function generateTraceId(): string {
  return crypto.randomUUID();
}

export function generateRequestId(): string {
  return `req-${crypto.randomUUID().slice(0, 8)}`;
}

export type ToolLogFields = {
  traceId: string;
  requestId: string;
  event: "tool_start" | "tool_end" | "error";
  tool: string;
  category: "tool" | "agent" | "api" | "embedding" | "error";
  input: unknown;
  output?: string;
  success?: boolean;
  durationMs?: number;
  error?: string;
};

export function truncateOutput(output: string, maxLen = 500): string {
  return output.length > maxLen ? output.slice(0, maxLen) + "…" : output;
}

export default logger;
