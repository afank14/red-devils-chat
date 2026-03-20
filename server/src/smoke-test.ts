import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";
import logger from "./logger.js";

async function smokeTest() {
  let passed = 0;
  let failed = 0;

  // Test 1: OpenAI Chat
  try {
    const llm = new ChatOpenAI({ model: "gpt-4o" });
    const response = await llm.invoke("Say 'hello' and nothing else.");
    logger.info({ response: response.content }, "OpenAI Chat OK");
    passed++;
  } catch (err) {
    logger.error({ err }, "OpenAI Chat FAILED");
    failed++;
  }

  // Test 2: OpenAI Embeddings
  try {
    const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
    const result = await embeddings.embedQuery("test");
    logger.info({ dimensions: result.length }, "OpenAI Embeddings OK");
    passed++;
  } catch (err) {
    logger.error({ err }, "OpenAI Embeddings FAILED");
    failed++;
  }

  // Test 3: Tavily Search
  try {
    const tavily = new TavilySearch({ maxResults: 1 });
    const result = await tavily.invoke({ query: "Manchester United latest news" });
    logger.info({ resultLength: result.length }, "Tavily Search OK");
    passed++;
  } catch (err) {
    logger.error({ err }, "Tavily Search FAILED");
    failed++;
  }

  logger.info({ passed, failed }, "Smoke test complete");
}

smokeTest();
