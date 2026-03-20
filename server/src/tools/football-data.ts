import { tool } from "@langchain/core/tools";
import { z } from "zod";
import logger, { truncateOutput } from "../logger.js";

const API_BASE = "https://api.football-data.org/v4";
const TEAM_ID = 66; // Manchester United
const COMPETITION = "PL";

// Simple response cache (5 min TTL)
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// Simple rate limiter: max 10 requests per 60 seconds
let requestTimestamps: number[] = [];
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(): boolean {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (requestTimestamps.length >= RATE_LIMIT) return false;
  requestTimestamps.push(now);
  return true;
}

async function fetchFootballData(endpoint: string): Promise<unknown> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return { error: "Football Data API key not configured" };
  }

  const cached = getCached(endpoint);
  if (cached) return cached;

  if (!checkRateLimit()) {
    return { error: "Rate limit exceeded (10 requests/minute). Please try again shortly." };
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "X-Auth-Token": apiKey },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { error: `Football Data API returned ${res.status}: ${text.slice(0, 200)}` };
  }

  const data = await res.json();
  setCache(endpoint, data);
  return data;
}

interface Standing {
  position: number;
  team: { name: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalDifference: number;
}

interface Match {
  utcDate: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
  competition: { name: string };
}

interface Player {
  name: string;
  position: string;
  nationality: string;
}

interface Scorer {
  player: { name: string };
  team: { name: string };
  goals: number;
  assists: number | null;
  playedMatches: number;
}

function formatStandings(data: { standings?: { table: Standing[] }[] }): string {
  const table = data.standings?.[0]?.table;
  if (!table) return "No standings data available.";

  const header = "| Pos | Team | P | W | D | L | GD | Pts |";
  const sep = "|-----|------|---|---|---|---|----|-----|";
  const rows = table.map(
    (s) => `| ${s.position} | ${s.team.name} | ${s.playedGames} | ${s.won} | ${s.draw} | ${s.lost} | ${s.goalDifference} | ${s.points} |`
  );
  return [header, sep, ...rows].join("\n");
}

function formatMatches(matches: Match[], label: string, limit: number): string {
  if (!matches.length) return `No ${label} found.`;
  const limited = matches.slice(0, limit);
  return limited
    .map((m) => {
      const date = new Date(m.utcDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const score = m.score?.fullTime?.home != null
        ? `${m.score.fullTime.home}-${m.score.fullTime.away}`
        : "vs";
      return `${date}: ${m.homeTeam.name} ${score} ${m.awayTeam.name} (${m.competition.name})`;
    })
    .join("\n");
}

function formatSquad(data: { squad?: Player[] }): string {
  const squad = data.squad;
  if (!squad?.length) return "No squad data available.";
  const byPosition: Record<string, Player[]> = {};
  for (const p of squad) {
    const pos = p.position ?? "Unknown";
    (byPosition[pos] ??= []).push(p);
  }
  return Object.entries(byPosition)
    .map(([pos, players]) => `**${pos}**: ${players.map((p) => `${p.name} (${p.nationality})`).join(", ")}`)
    .join("\n\n");
}

function formatScorers(data: { scorers?: Scorer[] }, limit: number): string {
  const scorers = data.scorers;
  if (!scorers?.length) return "No scorer data available.";
  const limited = scorers.slice(0, limit);
  const header = "| # | Player | Team | Goals | Assists | Matches |";
  const sep = "|---|--------|------|-------|---------|---------|";
  const rows = limited.map(
    (s, i) => `| ${i + 1} | ${s.player.name} | ${s.team.name} | ${s.goals} | ${s.assists ?? "-"} | ${s.playedMatches} |`
  );
  return [header, sep, ...rows].join("\n");
}

const footballDataTool = tool(
  async ({ query_type, limit }: { query_type: string; limit?: number }): Promise<string> => {
    const start = Date.now();
    const effectiveLimit = limit ?? 10;
    logger.info(
      { event: "tool_start", tool: "football_data", category: "tool", input: { query_type, limit: effectiveLimit } },
      "football data called"
    );

    try {
      let result: string;

      switch (query_type) {
        case "standings": {
          const data = await fetchFootballData(`/competitions/${COMPETITION}/standings`) as { error?: string; standings?: { table: Standing[] }[] };
          if (data.error) { result = `Error: ${data.error}`; break; }
          result = `Premier League Standings (current season):\n\n${formatStandings(data)}`;
          break;
        }
        case "fixtures": {
          const data = await fetchFootballData(`/teams/${TEAM_ID}/matches?status=SCHEDULED&limit=${effectiveLimit}`) as { error?: string; matches?: Match[] };
          if (data.error) { result = `Error: ${data.error}`; break; }
          result = `Manchester United Upcoming Fixtures:\n\n${formatMatches(data.matches ?? [], "upcoming fixtures", effectiveLimit)}`;
          break;
        }
        case "results": {
          const data = await fetchFootballData(`/teams/${TEAM_ID}/matches?status=FINISHED&limit=${effectiveLimit}`) as { error?: string; matches?: Match[] };
          if (data.error) { result = `Error: ${data.error}`; break; }
          const matches = (data.matches ?? []).reverse();
          result = `Manchester United Recent Results:\n\n${formatMatches(matches, "recent results", effectiveLimit)}`;
          break;
        }
        case "squad": {
          const data = await fetchFootballData(`/teams/${TEAM_ID}`) as { error?: string; squad?: Player[] };
          if (data.error) { result = `Error: ${data.error}`; break; }
          result = `Manchester United Squad:\n\n${formatSquad(data)}`;
          break;
        }
        case "scorers": {
          const data = await fetchFootballData(`/competitions/${COMPETITION}/scorers?limit=${effectiveLimit}`) as { error?: string; scorers?: Scorer[] };
          if (data.error) { result = `Error: ${data.error}`; break; }
          result = `Premier League Top Scorers:\n\n${formatScorers(data, effectiveLimit)}`;
          break;
        }
        default:
          result = `Error: Unknown query type "${query_type}". Use one of: standings, fixtures, results, squad, scorers.`;
      }

      const durationMs = Date.now() - start;
      logger.info(
        { event: "tool_end", tool: "football_data", category: "tool", input: { query_type }, output: truncateOutput(result), success: true, durationMs },
        "football data success"
      );
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorMsg = `Error: ${err instanceof Error ? err.message : String(err)}`;
      logger.error(
        { event: "tool_end", tool: "football_data", category: "tool", input: { query_type }, error: errorMsg, success: false, durationMs },
        "football data failed"
      );
      return errorMsg;
    }
  },
  {
    name: "football_data",
    description:
      "Fetches live Premier League data from the Football Data API: current standings/table, Manchester United upcoming fixtures, recent match results, squad roster, and top scorers. Use this for any question about current-season Premier League standings, upcoming or recent Man United matches, the current squad, or who's leading the scoring charts.",
    schema: z.object({
      query_type: z
        .enum(["standings", "fixtures", "results", "squad", "scorers"])
        .describe("Type of data to fetch: 'standings' for PL table, 'fixtures' for upcoming matches, 'results' for recent results, 'squad' for current roster, 'scorers' for top scorers"),
      limit: z
        .number()
        .optional()
        .describe("Max number of results to return (default 10). Applies to fixtures, results, and scorers."),
    }),
  }
);

export default footballDataTool;
