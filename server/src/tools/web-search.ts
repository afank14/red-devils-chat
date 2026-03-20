import { TavilySearch } from "@langchain/tavily";
import logger, { truncateOutput } from "../logger.js";

const MAX_QUERY_LENGTH = 500;

let _tavilySearch: TavilySearch | null = null;

function getTavilySearch(): TavilySearch {
  if (!_tavilySearch) {
    _tavilySearch = new TavilySearch({
      maxResults: 5,
      includeDomains: [
        "manutd.com",
        "bbc.co.uk/sport",
        "premierleague.com",
        "skysports.com",
        "espn.com",
      ],
    });
  }
  return _tavilySearch;
}

async function invokeWebSearch(query: string): Promise<string> {
  const start = Date.now();
  logger.info(
    {
      event: "tool_start",
      tool: "tavily_search",
      category: "tool",
      input: { query },
    },
    "web search called"
  );

  if (!query.trim() || query.length > MAX_QUERY_LENGTH) {
    const durationMs = Date.now() - start;
    const errorMsg = !query.trim()
      ? "Error: empty search query"
      : `Error: query too long (max ${MAX_QUERY_LENGTH} characters)`;
    logger.error(
      {
        event: "tool_end",
        tool: "tavily_search",
        category: "tool",
        input: { query },
        error: errorMsg,
        success: false,
        durationMs,
      },
      "web search failed"
    );
    return errorMsg;
  }

  try {
    const tavily = getTavilySearch();
    const result = await tavily.invoke({ query });
    const output = typeof result === "string" ? result : JSON.stringify(result);
    const durationMs = Date.now() - start;
    logger.info(
      {
        event: "tool_end",
        tool: "tavily_search",
        category: "tool",
        input: { query },
        output: truncateOutput(output),
        success: true,
        durationMs,
      },
      "web search success"
    );
    return output;
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = `Error: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(
      {
        event: "tool_end",
        tool: "tavily_search",
        category: "tool",
        input: { query },
        error: errorMsg,
        success: false,
        durationMs,
      },
      "web search failed"
    );
    return errorMsg;
  }
}

export { getTavilySearch, invokeWebSearch };
export default getTavilySearch;
