import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getVectorStore } from "../rag/vector-store.js";
import logger, { truncateOutput } from "../logger.js";

const MAX_QUERY_LENGTH = 500;
const TOP_K = 4;

const ragSearchTool = tool(
  async ({ query }: { query: string }): Promise<string> => {
    const start = Date.now();
    logger.info(
      {
        event: "tool_start",
        tool: "rag_search",
        category: "tool",
        input: { query },
      },
      "rag search called"
    );

    if (!query.trim()) {
      const durationMs = Date.now() - start;
      const errorMsg = "Error: empty search query";
      logger.error(
        {
          event: "tool_end",
          tool: "rag_search",
          category: "tool",
          input: { query },
          error: errorMsg,
          success: false,
          durationMs,
        },
        "rag search failed"
      );
      return errorMsg;
    }

    if (query.length > MAX_QUERY_LENGTH) {
      const durationMs = Date.now() - start;
      const errorMsg = `Error: query too long (max ${MAX_QUERY_LENGTH} characters)`;
      logger.error(
        {
          event: "tool_end",
          tool: "rag_search",
          category: "tool",
          input: { query },
          error: errorMsg,
          success: false,
          durationMs,
        },
        "rag search failed"
      );
      return errorMsg;
    }

    try {
      const vectorStore = getVectorStore();
      const results = await vectorStore.similaritySearch(query, TOP_K);

      if (results.length === 0) {
        const durationMs = Date.now() - start;
        const output = "No relevant documents found for this query.";
        logger.info(
          {
            event: "tool_end",
            tool: "rag_search",
            category: "tool",
            input: { query },
            output,
            success: true,
            durationMs,
          },
          "rag search empty"
        );
        return output;
      }

      const formatted = results
        .map((doc, i) => {
          const source = doc.metadata.documentName ?? "Unknown";
          return `[${i + 1}] Source: ${source}\n${doc.pageContent}`;
        })
        .join("\n\n");

      const durationMs = Date.now() - start;
      logger.info(
        {
          event: "tool_end",
          tool: "rag_search",
          category: "tool",
          input: { query },
          output: truncateOutput(formatted),
          success: true,
          durationMs,
          resultCount: results.length,
        },
        "rag search success"
      );

      return formatted;
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorMsg = `Error: ${err instanceof Error ? err.message : String(err)}`;
      logger.error(
        {
          event: "tool_end",
          tool: "rag_search",
          category: "tool",
          input: { query },
          error: errorMsg,
          success: false,
          durationMs,
        },
        "rag search failed"
      );
      return errorMsg;
    }
  },
  {
    name: "rag_search",
    description:
      "Searches the Manchester United knowledge base for historical facts, player statistics, trophy records, match details, managerial history, and club culture. Use this for any question about Manchester United's history, players, trophies, or records. Returns relevant passages with source document citations.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search query describing what information to find, e.g. 'Wayne Rooney career goals and appearances'"
        ),
    }),
  }
);

export default ragSearchTool;
