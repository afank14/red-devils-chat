# Tavily API Reference

## 1. Overview

Tavily is an AI-optimized search API built specifically for LLM agents and RAG applications. Unlike traditional search APIs (Google, Bing) that return link lists designed for humans, Tavily returns clean, extracted content optimized for LLM consumption -- reducing the need for scraping, parsing, and filtering.

Key characteristics:
- Returns extracted page content, not just links and snippets
- Optimized for relevance in AI agent workflows
- Built-in domain filtering for source quality control
- Simple REST API with strong LangChain integration
- Low-latency responses suitable for real-time agent loops

**Why we use it:** Red Devils Chat needs current information (transfer news, recent results) that isn't in the curated document corpus. Tavily provides this via the Web Search tool in the ReAct agent loop.

### Pricing (as of 2025)

| Plan | Price | API Calls | Features |
|------|-------|-----------|----------|
| **Free (Researcher)** | $0/month | 1,000 searches/month | Basic & advanced search, API access |
| **Bootstrap** | $40/month | 5,000 searches/month | Higher rate limits |
| **Scale** | $200/month | 20,000 searches/month | Priority support |
| **Enterprise** | Custom | Custom | SLA, dedicated support |

The free tier is sufficient for development and demo purposes. Sign up at [https://tavily.com](https://tavily.com).

---

## 2. API Key Setup

### Getting a Key

1. Create an account at [https://app.tavily.com](https://app.tavily.com)
2. Navigate to the dashboard -- your API key is displayed on the main page
3. Copy the key (format: `tvly-xxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Environment Variable

Store the key as `TAVILY_API_KEY` in your `.env` file:

```bash
# .env
TAVILY_API_KEY=tvly-your-api-key-here
```

LangChain's Tavily integration automatically reads from this environment variable -- no explicit key passing is required in code.

**Important:** Never commit `.env` to version control. Ensure `.gitignore` includes `.env`.

---

## 3. LangChain Integration (Primary Usage)

This is how Red Devils Chat uses Tavily. LangChain wraps the Tavily API as a tool that the ReAct agent can invoke directly.

### Package & Import

There are two options. The `@langchain/community` package includes `TavilySearchResults`:

```bash
npm install @langchain/community
```

```typescript
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
```

Alternatively, Tavily has a dedicated LangChain package:

```bash
npm install @langchain/tavily
```

```typescript
import { TavilySearch } from "@langchain/tavily";
```

**For this project:** Use `TavilySearch` from `@langchain/tavily` — this is the package recommended in the course slides and has more config options (topic, timeRange, etc.). `TavilySearchResults` from `@langchain/community` is the older integration. Key difference: `TavilySearch` uses `.invoke({ query: "..." })` while `TavilySearchResults` uses `.invoke({ input: "..." })`.

### Basic Setup

```typescript
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

const webSearchTool = new TavilySearchResults({
  maxResults: 5,
});

// The tool reads TAVILY_API_KEY from process.env automatically
```

### Configuration Options

**TavilySearchResults** (community):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxResults` | `number` | `5` | Number of search results to return (1-10) |
| `kwargs` | `object` | `{}` | Additional parameters passed to the Tavily API |

```typescript
const webSearchTool = new TavilySearchResults({
  maxResults: 5,
  kwargs: {
    searchDepth: "advanced",
    includeDomains: ["manutd.com", "bbc.co.uk"],
    excludeDomains: ["reddit.com"],
  },
});
```

**TavilySearch** (official @langchain/tavily — more options):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxResults` | `number` | `5` | Number of results |
| `topic` | `"general" \| "news" \| "finance"` | `"general"` | Search category |
| `searchDepth` | `"basic" \| "advanced"` | `"basic"` | Search thoroughness |
| `includeDomains` | `string[]` | `[]` | Whitelist domains |
| `excludeDomains` | `string[]` | `[]` | Blacklist domains |
| `includeAnswer` | `boolean` | `false` | Include AI summary |
| `includeRawContent` | `boolean` | `false` | Include raw HTML |
| `includeImages` | `boolean` | `false` | Include images |
| `timeRange` | `"day" \| "week" \| "month" \| "year"` | - | Recency filter |

```typescript
import { TavilySearch } from "@langchain/tavily";

const webSearchTool = new TavilySearch({
  maxResults: 5,
  topic: "news",
  searchDepth: "basic",
  includeDomains: ["manutd.com", "bbc.co.uk"],
  excludeDomains: ["reddit.com"],
});
```

### Using as a ReAct Agent Tool

```typescript
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatAnthropic({ model: "claude-sonnet-4-20250514" });

const webSearchTool = new TavilySearchResults({
  maxResults: 5,
});

// Pass as one of the agent's tools
const agent = createReactAgent({
  llm,
  tools: [webSearchTool, calculatorTool, ragTool],
});

// The agent will invoke web search when it determines
// the query needs current/live information
const result = await agent.invoke({
  messages: [{ role: "user", content: "What is the latest Man United transfer news?" }],
});
```

### Tool Invocation (Standalone)

You can also invoke the tool directly for testing:

```typescript
const results = await webSearchTool.invoke("Manchester United latest transfer news 2026");
// Returns a JSON string of search results
console.log(JSON.parse(results));
```

---

## 4. Domain Filtering for Sports Sources

For Red Devils Chat, we want to bias search results toward authoritative football/Manchester United sources. Tavily supports `includeDomains` and `excludeDomains` parameters.

### Recommended Configuration

```typescript
const webSearchTool = new TavilySearchResults({
  maxResults: 5,
  kwargs: {
    includeDomains: [
      "manutd.com",              // Official club site
      "bbc.co.uk/sport",         // BBC Sport
      "premierleague.com",       // Official Premier League
      "skysports.com",           // Sky Sports
      "goal.com",                // Goal.com
      "theathletic.com",         // The Athletic
      "espn.com",                // ESPN
      "transfermarkt.com",       // Transfer data
    ],
    excludeDomains: [
      "reddit.com",              // User-generated, unverified
      "twitter.com",             // Rumour mill
      "facebook.com",            // Social media noise
    ],
  },
});
```

### How Domain Filtering Works

- **`includeDomains`**: When set, Tavily ONLY returns results from these domains. This is a strict whitelist. Use this when you want guaranteed source quality.
- **`excludeDomains`**: Blocks results from these domains but allows all others. Use this for a softer filter that still allows diverse sources.

**Trade-off:** Using `includeDomains` improves source quality but may reduce result count for niche queries. For general football news, the recommended list above provides good coverage. If a search returns too few results, consider using `excludeDomains` instead (blacklist approach) or removing the filter for that specific query.

### Alternative: System Prompt Guidance

Instead of (or in addition to) domain filtering, instruct the agent via the system prompt:

```typescript
const systemPrompt = `When using the web search tool, prefer results from authoritative
sports sources: manutd.com, BBC Sport, premierleague.com, Sky Sports.
Avoid citing unverified social media posts or fan forums.`;
```

This gives the agent flexibility while still guiding source selection.

---

## 5. Direct API Usage (REST)

If you need to call Tavily outside of LangChain (for testing, debugging, or custom integrations):

### Endpoint

```
POST https://api.tavily.com/search
```

### Request

```typescript
const response = await fetch("https://api.tavily.com/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`,
  },
  body: JSON.stringify({
    query: "Manchester United transfer news January 2026",
    search_depth: "basic",            // "basic" (faster) or "advanced" (more thorough)
    max_results: 5,                   // 1-20, default 5
    include_domains: ["bbc.co.uk", "skysports.com"],  // optional whitelist
    exclude_domains: ["reddit.com"],  // optional blacklist
    include_answer: false,            // whether to include an AI-generated summary
    include_raw_content: false,       // whether to include full page HTML
    include_images: false,            // whether to include image results
  }),
});

const data = await response.json();
```

### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `api_key` | `string` | Yes | - | Your Tavily API key |
| `query` | `string` | Yes | - | The search query |
| `search_depth` | `string` | No | `"basic"` | `"basic"` for fast results, `"advanced"` for more comprehensive (uses more credits) |
| `max_results` | `number` | No | `5` | Number of results (1-20) |
| `include_domains` | `string[]` | No | `[]` | Only return results from these domains |
| `exclude_domains` | `string[]` | No | `[]` | Never return results from these domains |
| `include_answer` | `boolean` | No | `false` | Include AI-generated answer summary |
| `include_raw_content` | `boolean` | No | `false` | Include raw HTML content of pages |
| `include_images` | `boolean` | No | `false` | Include image results |

---

## 6. Response Format

### REST API Response

```json
{
  "query": "Manchester United transfer news January 2026",
  "answer": null,
  "results": [
    {
      "title": "Manchester United complete signing of...",
      "url": "https://www.bbc.co.uk/sport/football/...",
      "content": "Manchester United have completed the signing of... The deal is reported to be worth...",
      "score": 0.9845,
      "raw_content": null
    },
    {
      "title": "United transfer roundup: Latest ins and outs",
      "url": "https://www.skysports.com/football/...",
      "content": "Sky Sports rounds up the latest transfer activity at Old Trafford...",
      "score": 0.9123,
      "raw_content": null
    }
  ],
  "response_time": 1.23
}
```

### Result Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Page title of the search result |
| `url` | `string` | URL of the source page |
| `content` | `string` | Extracted, cleaned text content from the page (not just a snippet -- this is the key Tavily advantage) |
| `score` | `number` | Relevance score from 0 to 1 (higher = more relevant) |
| `raw_content` | `string \| null` | Full HTML content if `include_raw_content` was `true` |

### LangChain Tool Output

When used via `TavilySearchResults` in LangChain, the tool returns a JSON string array:

```typescript
// The tool returns a string like:
'[{"title":"...","url":"...","content":"...","score":0.98}, ...]'

// The agent receives this as a tool observation and uses it to formulate its response
```

Each result's `content` field contains extracted page text (not a short snippet), making it directly usable by the LLM without additional scraping.

---

## 7. Rate Limits

### Free Tier (Researcher Plan)

| Limit | Value |
|-------|-------|
| Monthly API calls | 1,000 searches/month |
| Rate limit | ~60 requests/minute |
| `search_depth: "advanced"` | Counts as 2 API credits per call |
| Max results per query | Up to 20 |

### Important Notes

- The monthly quota resets on your account anniversary date
- `search_depth: "advanced"` uses 2x credits (each advanced search counts as 2 calls)
- There is no hard per-second rate limit on the free tier, but rapid bursts may be throttled
- Monitor usage at [https://app.tavily.com](https://app.tavily.com) dashboard
- For development, 1,000 calls/month is plenty -- a typical dev session uses 20-50 searches

### Handling Rate Limits in Code

```typescript
try {
  const results = await webSearchTool.invoke(query);
  return JSON.parse(results);
} catch (error) {
  if (error.message?.includes("429") || error.message?.includes("rate limit")) {
    console.error("Tavily rate limit reached. Falling back to cached results or informing user.");
    return { error: "Web search temporarily unavailable. Please try again later." };
  }
  throw error;
}
```

---

## Quick Reference

```typescript
// Minimal setup for Red Devils Chat
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

const webSearchTool = new TavilySearchResults({
  maxResults: 5,
  kwargs: {
    includeDomains: [
      "manutd.com",
      "bbc.co.uk/sport",
      "premierleague.com",
      "skysports.com",
    ],
  },
});

// Requires TAVILY_API_KEY in .env
// Tool name exposed to agent: "tavily_search_results_json"
// Returns: JSON string of [{title, url, content, score}, ...]
```

---

## Links

- Tavily website: [https://tavily.com](https://tavily.com)
- API documentation: [https://docs.tavily.com](https://docs.tavily.com)
- LangChain integration docs: [https://js.langchain.com/docs/integrations/tools/tavily_search](https://js.langchain.com/docs/integrations/tools/tavily_search)
- Dashboard (usage monitoring): [https://app.tavily.com](https://app.tavily.com)
- npm package: [@langchain/community](https://www.npmjs.com/package/@langchain/community)
