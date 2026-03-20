import pino from "pino";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { Writable } from "stream";

const logsDir = path.resolve(process.cwd(), "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, "app.log");
const fileStream = fs.createWriteStream(logFilePath, { flags: "a" });

// Tee stream: writes every log line to both stdout and the log file.
// stdout gets raw JSON (piped through pino-pretty externally if desired),
// file gets raw JSON for grep/jq parsing.
const tee = new Writable({
  write(chunk: Buffer, _encoding, callback) {
    process.stdout.write(chunk);
    fileStream.write(chunk, callback);
  },
});

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" }, tee);

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
