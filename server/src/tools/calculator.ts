import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { evaluate } from "mathjs";
import logger, { truncateOutput } from "../logger.js";

const MAX_EXPRESSION_LENGTH = 1000;

const calculatorTool = tool(
  async ({ expression }: { expression: string }): Promise<string> => {
    const start = Date.now();
    const logFields = {
      event: "tool_start" as const,
      tool: "calculator",
      category: "tool" as const,
      input: { expression },
    };
    logger.info(logFields, "calculator called");

    if (!expression.trim() || expression.length > MAX_EXPRESSION_LENGTH) {
      const durationMs = Date.now() - start;
      const errorMsg = !expression.trim()
        ? "Error: empty expression"
        : `Error: expression too long (max ${MAX_EXPRESSION_LENGTH} characters)`;
      logger.error(
        {
          event: "tool_end",
          tool: "calculator",
          category: "tool",
          input: { expression },
          error: errorMsg,
          success: false,
          durationMs,
        },
        "calculator failed"
      );
      return errorMsg;
    }

    try {
      const result = String(evaluate(expression));
      const durationMs = Date.now() - start;
      logger.info(
        {
          event: "tool_end",
          tool: "calculator",
          category: "tool",
          input: { expression },
          output: truncateOutput(result),
          success: true,
          durationMs,
        },
        "calculator success"
      );
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorMsg = `Error: ${err instanceof Error ? err.message : String(err)}`;
      logger.error(
        {
          event: "tool_end",
          tool: "calculator",
          category: "tool",
          input: { expression },
          error: errorMsg,
          success: false,
          durationMs,
        },
        "calculator failed"
      );
      return errorMsg;
    }
  },
  {
    name: "calculator",
    description:
      "Evaluates a math expression and returns the numeric result. Use for arithmetic, percentages, ratios, goals-per-game calculations, and stat comparisons. Input should be a valid math expression like '253/510' or '(25 + 30) / 2'.",
    schema: z.object({
      expression: z
        .string()
        .describe("The math expression to evaluate, e.g. '253/510'"),
    }),
  }
);

export default calculatorTool;
