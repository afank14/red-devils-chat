import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { Serialized } from "@langchain/core/load/serializable";
import type { Logger } from "pino";
import { truncateOutput } from "../logger.js";

export class ToolLoggingHandler extends BaseCallbackHandler {
  name = "ToolLoggingHandler";
  private logger: Logger;
  private toolTimers = new Map<string, number>();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async handleToolStart(
    tool: Serialized,
    input: string,
    runId: string
  ): Promise<void> {
    this.toolTimers.set(runId, Date.now());
    const toolName = tool.id?.[tool.id.length - 1] ?? "unknown";
    this.logger.info(
      {
        event: "tool_start",
        category: "tool",
        tool: toolName,
        input: truncateOutput(input),
        runId,
      },
      `tool ${toolName} called`
    );
  }

  async handleToolEnd(output: string, runId: string): Promise<void> {
    const start = this.toolTimers.get(runId);
    const durationMs = start ? Date.now() - start : undefined;
    this.toolTimers.delete(runId);
    this.logger.info(
      {
        event: "tool_end",
        category: "tool",
        output: truncateOutput(output),
        success: true,
        durationMs,
        runId,
      },
      "tool completed"
    );
  }

  async handleToolError(err: Error, runId: string): Promise<void> {
    const start = this.toolTimers.get(runId);
    const durationMs = start ? Date.now() - start : undefined;
    this.toolTimers.delete(runId);
    this.logger.error(
      {
        event: "tool_end",
        category: "tool",
        error: err.message,
        success: false,
        durationMs,
        runId,
      },
      "tool failed"
    );
  }
}
