<!-- Generated with context7 (library: /websites/football-data) -->

# football-data.org API Reference

> Reference documentation for integrating the football-data.org REST API (v4) into our Manchester United chatbot as a LangChain tool for live Premier League data.

---

## 1. API Overview

**football-data.org** provides a RESTful API for football (soccer) data covering major competitions worldwide. It includes standings, fixtures, results, team squads, and top scorers.

**Base URL:** `https://api.football-data.org/v4`

### Free Tier vs Paid

| Feature | Free Tier | Paid Tiers |
|---|---|---|
| Rate limit | **10 requests/minute** | Higher limits |
| Competitions | ~13 major leagues (includes Premier League) | All competitions |
| Data | Standings, matches, scorers, teams | Extended stats, lineups, odds |
| Filters | Basic date/status filters | Full filter support |
| Cost | Free | Starts at ~$10/month |

The **free tier is sufficient** for our use case. It covers the Premier League (`PL`) and provides standings, match results, fixtures, team info, and top scorers.

### Competitions Available on Free Tier

| Code | Competition |
|---|---|
| `PL` | Premier League |
| `BL1` | Bundesliga |
| `SA` | Serie A |
| `PD` | La Liga |
| `FL1` | Ligue 1 |
| `CL` | Champions League |
| `ELC` | Championship |
| `PPL` | Primeira Liga |
| `DED` | Eredivisie |
| `BSA` | Brasileiro Serie A |
| `WC` | FIFA World Cup |
| `EC` | European Championship |

---

## 2. Authentication

All requests require an API key passed via the `X-Auth-Token` HTTP header.

### Getting a Free API Key

1. Go to [https://www.football-data.org/client/register](https://www.football-data.org/client/register)
2. Create a free account
3. Your API key will be available in your account dashboard

### Usage

```
X-Auth-Token: YOUR_API_KEY
```

Example with curl:

```bash
curl -H "X-Auth-Token: YOUR_API_KEY" \
  https://api.football-data.org/v4/competitions/PL/standings
```

---

## 3. Key Endpoints for Our Use Case

### 3.1 Premier League Standings

```
GET /v4/competitions/PL/standings
```

Returns the current Premier League table.

**Query Parameters:**
- `season` (optional) — 4-digit year for the season start, e.g. `2025` for 2025/26. Defaults to current season.

**Example Response:**

```json
{
  "competition": {
    "id": 2021,
    "name": "Premier League",
    "code": "PL"
  },
  "season": {
    "id": 2287,
    "startDate": "2025-08-16",
    "endDate": "2026-05-24",
    "currentMatchday": 29
  },
  "standings": [
    {
      "stage": "REGULAR_SEASON",
      "type": "TOTAL",
      "table": [
        {
          "position": 1,
          "team": {
            "id": 57,
            "name": "Arsenal FC",
            "shortName": "Arsenal",
            "tla": "ARS",
            "crest": "https://crests.football-data.org/57.png"
          },
          "playedGames": 29,
          "form": "W,W,D,W,W",
          "won": 20,
          "draw": 5,
          "lost": 4,
          "points": 65,
          "goalsFor": 58,
          "goalsAgainst": 22,
          "goalDifference": 36
        }
      ]
    }
  ]
}
```

The `standings` array includes three objects with `type`: `"TOTAL"`, `"HOME"`, and `"AWAY"`.

---

### 3.2 Premier League Matches

```
GET /v4/competitions/PL/matches
```

Returns all matches for the current Premier League season (fixtures and results).

**Query Parameters:**
- `season` — e.g. `2025`
- `matchday` — specific matchday number (1-38)
- `status` — filter by match status: `SCHEDULED`, `TIMED`, `IN_PLAY`, `PAUSED`, `FINISHED`, `POSTPONED`, `CANCELLED`
- `dateFrom` — ISO date `YYYY-MM-DD`
- `dateTo` — ISO date `YYYY-MM-DD`

**Example: Get upcoming PL matches**

```
GET /v4/competitions/PL/matches?status=SCHEDULED
```

**Example: Get matches in a date range**

```
GET /v4/competitions/PL/matches?dateFrom=2026-03-01&dateTo=2026-03-31
```

**Example Response (single match):**

```json
{
  "matches": [
    {
      "id": 431001,
      "utcDate": "2026-03-14T15:00:00Z",
      "status": "FINISHED",
      "matchday": 28,
      "stage": "REGULAR_SEASON",
      "homeTeam": {
        "id": 66,
        "name": "Manchester United FC",
        "shortName": "Man United",
        "tla": "MUN",
        "crest": "https://crests.football-data.org/66.png"
      },
      "awayTeam": {
        "id": 57,
        "name": "Arsenal FC",
        "shortName": "Arsenal",
        "tla": "ARS",
        "crest": "https://crests.football-data.org/57.png"
      },
      "score": {
        "winner": "HOME_TEAM",
        "duration": "REGULAR",
        "fullTime": {
          "home": 2,
          "away": 1
        },
        "halfTime": {
          "home": 1,
          "away": 0
        }
      },
      "referees": [
        {
          "id": 11580,
          "name": "Michael Oliver",
          "type": "REFEREE"
        }
      ]
    }
  ]
}
```

---

### 3.3 Team Matches

```
GET /v4/teams/{id}/matches
```

Returns matches for a specific team across all competitions.

**For Manchester United:** `GET /v4/teams/66/matches`

**Query Parameters:**
- `competitions` — comma-separated competition codes, e.g. `PL` or `PL,CL`
- `status` — `SCHEDULED`, `FINISHED`, etc.
- `dateFrom` / `dateTo` — ISO date range
- `season` — e.g. `2025`
- `limit` — max number of results (default varies)

**Example: Manchester United's last 5 finished PL matches**

```
GET /v4/teams/66/matches?competitions=PL&status=FINISHED&limit=5
```

**Example: Manchester United's upcoming fixtures**

```
GET /v4/teams/66/matches?status=SCHEDULED&limit=5
```

---

### 3.4 Team Info & Squad

```
GET /v4/teams/{id}
```

Returns team details including the current squad roster.

**For Manchester United:** `GET /v4/teams/66`

**Example Response:**

```json
{
  "id": 66,
  "name": "Manchester United FC",
  "shortName": "Man United",
  "tla": "MUN",
  "crest": "https://crests.football-data.org/66.png",
  "address": "Sir Matt Busby Way Manchester M16 0RA",
  "website": "http://www.manutd.com",
  "founded": 1878,
  "clubColors": "Red / White",
  "venue": "Old Trafford",
  "coach": {
    "id": 70000,
    "name": "Ruben Amorim",
    "nationality": "Portugal"
  },
  "squad": [
    {
      "id": 7907,
      "name": "André Onana",
      "position": "Goalkeeper",
      "dateOfBirth": "1996-04-02",
      "nationality": "Cameroon"
    },
    {
      "id": 152,
      "name": "Bruno Fernandes",
      "position": "Midfield",
      "dateOfBirth": "1994-09-08",
      "nationality": "Portugal"
    }
  ],
  "runningCompetitions": [
    {
      "id": 2021,
      "name": "Premier League",
      "code": "PL"
    }
  ]
}
```

---

### 3.5 Top Scorers

```
GET /v4/competitions/PL/scorers
```

Returns the top scorers for the Premier League season.

**Query Parameters:**
- `season` — e.g. `2025`
- `limit` — number of results (default 10)

**Example Response:**

```json
{
  "competition": {
    "id": 2021,
    "name": "Premier League",
    "code": "PL"
  },
  "season": {
    "id": 2287,
    "startDate": "2025-08-16",
    "endDate": "2026-05-24"
  },
  "scorers": [
    {
      "player": {
        "id": 1234,
        "name": "Erling Haaland",
        "nationality": "Norway",
        "position": "Centre-Forward",
        "dateOfBirth": "2000-07-21"
      },
      "team": {
        "id": 65,
        "name": "Manchester City FC",
        "shortName": "Man City"
      },
      "playedMatches": 28,
      "goals": 22,
      "assists": 5,
      "penalties": 4
    }
  ]
}
```

---

### 3.6 Other Useful Endpoints

| Endpoint | Description |
|---|---|
| `GET /v4/competitions/PL` | Competition metadata (current season, matchday) |
| `GET /v4/competitions/PL/teams` | All teams in the PL this season |
| `GET /v4/persons/{id}` | Player details |
| `GET /v4/matches` | Matches across all competitions (useful for "matches today") |
| `GET /v4/matches/{id}` | Single match details (head2head available via `?include=head2head`) |

---

## 4. Response Formats

All responses are JSON with `Content-Type: application/json`.

### Common Response Patterns

**Filters metadata** — Most list responses include a `filters` object showing what was applied:

```json
{
  "filters": {
    "season": "2025",
    "matchday": "28"
  },
  "resultSet": {
    "count": 10,
    "competitions": "PL",
    "first": "2025-08-16",
    "last": "2026-05-24",
    "played": 280,
    "wins": 0,
    "draws": 0,
    "losses": 0
  }
}
```

**Error Response:**

```json
{
  "message": "The resource you are looking for does not exist.",
  "errorCode": 404
}
```

**Rate Limit Exceeded:**

```json
{
  "message": "You reached your request limit. Wait 60 seconds.",
  "errorCode": 429
}
```

### Response Headers

- `X-Requests-Available-Minute` — remaining requests this minute
- `X-RequestCounter-Reset` — seconds until the counter resets
- `X-API-Version` — API version (v4)

---

## 5. Manchester United Specific

### Team ID

**Manchester United's team ID is `66`.**

### Filtering for United Data

```
# United's matches this season
GET /v4/teams/66/matches?season=2025&competitions=PL

# United's upcoming fixtures
GET /v4/teams/66/matches?status=SCHEDULED&competitions=PL&limit=5

# United's recent results
GET /v4/teams/66/matches?status=FINISHED&competitions=PL&limit=5

# United's squad
GET /v4/teams/66

# Full PL standings (find United's row by team.id === 66)
GET /v4/competitions/PL/standings
```

### Other Relevant Team IDs

| Team | ID |
|---|---|
| Manchester United | 66 |
| Manchester City | 65 |
| Arsenal | 57 |
| Liverpool | 64 |
| Chelsea | 61 |
| Tottenham | 73 |
| Newcastle | 67 |
| Aston Villa | 58 |
| West Ham | 563 |

---

## 6. TypeScript Integration

### Type Definitions

```typescript
// types/football-data.ts

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Score {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface Match {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  matchday: number;
  stage: string;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
}

export interface StandingEntry {
  position: number;
  team: Team;
  playedGames: number;
  form: string;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface Standing {
  stage: string;
  type: 'TOTAL' | 'HOME' | 'AWAY';
  table: StandingEntry[];
}

export interface Competition {
  id: number;
  name: string;
  code: string;
}

export interface Season {
  id: number;
  startDate: string;
  endDate: string;
  currentMatchday: number;
}

export interface StandingsResponse {
  competition: Competition;
  season: Season;
  standings: Standing[];
}

export interface MatchesResponse {
  competition: Competition;
  matches: Match[];
  resultSet: {
    count: number;
    played: number;
  };
}

export interface Player {
  id: number;
  name: string;
  position: string;
  dateOfBirth: string;
  nationality: string;
}

export interface Scorer {
  player: Player;
  team: Team;
  playedMatches: number;
  goals: number;
  assists: number;
  penalties: number;
}

export interface ScorersResponse {
  competition: Competition;
  season: Season;
  scorers: Scorer[];
}

export interface TeamResponse {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  address: string;
  website: string;
  founded: number;
  clubColors: string;
  venue: string;
  coach: {
    id: number;
    name: string;
    nationality: string;
  };
  squad: Player[];
  runningCompetitions: Competition[];
}
```

### API Client

```typescript
// lib/football-data-client.ts

const BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const MAN_UNITED_ID = 66;

if (!API_KEY) {
  console.warn('FOOTBALL_DATA_API_KEY is not set — football data tool will not work.');
}

async function fetchFootballData<T>(endpoint: string): Promise<T> {
  if (!API_KEY) {
    throw new Error('FOOTBALL_DATA_API_KEY environment variable is not set.');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'X-Auth-Token': API_KEY,
    },
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get('X-RequestCounter-Reset') || '60';
    throw new Error(
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Football Data API error ${response.status}: ${(error as any).message || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

export async function getStandings(): Promise<StandingsResponse> {
  return fetchFootballData<StandingsResponse>('/competitions/PL/standings');
}

export async function getMatches(params?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  matchday?: number;
}): Promise<MatchesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params?.matchday) searchParams.set('matchday', String(params.matchday));
  const qs = searchParams.toString();
  return fetchFootballData<MatchesResponse>(
    `/competitions/PL/matches${qs ? `?${qs}` : ''}`
  );
}

export async function getTeamMatches(params?: {
  status?: string;
  limit?: number;
  competitions?: string;
}): Promise<MatchesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.competitions) searchParams.set('competitions', params.competitions);
  const qs = searchParams.toString();
  return fetchFootballData<MatchesResponse>(
    `/teams/${MAN_UNITED_ID}/matches${qs ? `?${qs}` : ''}`
  );
}

export async function getTeamInfo(): Promise<TeamResponse> {
  return fetchFootballData<TeamResponse>(`/teams/${MAN_UNITED_ID}`);
}

export async function getTopScorers(limit = 10): Promise<ScorersResponse> {
  return fetchFootballData<ScorersResponse>(
    `/competitions/PL/scorers?limit=${limit}`
  );
}
```

---

## 7. LangChain Tool Wrapper

```typescript
// tools/football-data-tool.ts

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  getStandings,
  getMatches,
  getTeamMatches,
  getTeamInfo,
  getTopScorers,
} from '../lib/football-data-client';

const MAN_UNITED_ID = 66;

// ── Formatting helpers ──────────────────────────────────────────────

function formatStandings(data: any): string {
  const table = data.standings
    .find((s: any) => s.type === 'TOTAL')
    ?.table;

  if (!table) return 'No standings data available.';

  const header = `Premier League Standings (Matchday ${data.season.currentMatchday})\n`;
  const rows = table.map((entry: any) => {
    const isUnited = entry.team.id === MAN_UNITED_ID ? ' ◄' : '';
    return `${String(entry.position).padStart(2)}. ${entry.team.shortName.padEnd(18)} ${String(entry.playedGames).padStart(2)}GP  ${String(entry.won).padStart(2)}W ${String(entry.draw).padStart(2)}D ${String(entry.lost).padStart(2)}L  GD:${entry.goalDifference > 0 ? '+' : ''}${entry.goalDifference}  ${String(entry.points).padStart(2)}pts  Form: ${entry.form}${isUnited}`;
  });

  return header + rows.join('\n');
}

function formatMatch(m: any): string {
  const date = new Date(m.utcDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (m.status === 'FINISHED') {
    return `${date}: ${m.homeTeam.shortName} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.shortName}`;
  }
  return `${date}: ${m.homeTeam.shortName} vs ${m.awayTeam.shortName} (${m.status})`;
}

function formatMatches(data: any, label: string): string {
  if (!data.matches || data.matches.length === 0) {
    return `No ${label} found.`;
  }
  const header = `${label} (${data.matches.length} matches)\n`;
  return header + data.matches.map(formatMatch).join('\n');
}

function formatSquad(data: any): string {
  const lines = [
    `${data.name}`,
    `Manager: ${data.coach?.name || 'Unknown'}`,
    `Venue: ${data.venue}`,
    `Founded: ${data.founded}`,
    '',
    'Squad:',
  ];

  const grouped: Record<string, any[]> = {};
  for (const player of data.squad || []) {
    const pos = player.position || 'Unknown';
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(player);
  }

  const positionOrder = ['Goalkeeper', 'Defence', 'Midfield', 'Offence'];
  for (const pos of positionOrder) {
    if (grouped[pos]) {
      lines.push(`\n  ${pos}:`);
      for (const p of grouped[pos]) {
        lines.push(`    - ${p.name} (${p.nationality})`);
      }
    }
  }

  return lines.join('\n');
}

function formatScorers(data: any): string {
  const header = `Premier League Top Scorers (${data.season?.startDate?.slice(0, 4) || ''}/${data.season?.endDate?.slice(0, 4) || ''}):\n`;
  const rows = data.scorers.map(
    (s: any, i: number) =>
      `${String(i + 1).padStart(2)}. ${s.player.name} (${s.team.shortName}) — ${s.goals} goals, ${s.assists ?? 0} assists in ${s.playedMatches} games`
  );
  return header + rows.join('\n');
}

// ── The LangChain Tool ──────────────────────────────────────────────

export const footballDataTool = new DynamicStructuredTool({
  name: 'football_data',
  description:
    'Get current Premier League football data: standings, Manchester United fixtures/results, squad info, or top scorers. Use this when the user asks about current-season match results, upcoming fixtures, league table positions, player stats, or squad information.',
  schema: z.object({
    query_type: z
      .enum(['standings', 'fixtures', 'results', 'squad', 'scorers'])
      .describe(
        'Type of data to fetch: "standings" for PL table, "fixtures" for upcoming Man Utd matches, "results" for recent Man Utd results, "squad" for Man Utd squad, "scorers" for PL top scorers'
      ),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe('Number of results to return (for fixtures, results, scorers)'),
  }),
  func: async ({ query_type, limit }) => {
    try {
      switch (query_type) {
        case 'standings': {
          const data = await getStandings();
          return formatStandings(data);
        }

        case 'fixtures': {
          const data = await getTeamMatches({
            status: 'SCHEDULED',
            limit: limit || 5,
            competitions: 'PL',
          });
          return formatMatches(data, 'Upcoming Manchester United Fixtures');
        }

        case 'results': {
          const data = await getTeamMatches({
            status: 'FINISHED',
            limit: limit || 5,
            competitions: 'PL',
          });
          return formatMatches(data, 'Recent Manchester United Results');
        }

        case 'squad': {
          const data = await getTeamInfo();
          return formatSquad(data);
        }

        case 'scorers': {
          const data = await getTopScorers(limit || 10);
          return formatScorers(data);
        }

        default:
          return `Unknown query type: ${query_type}. Use one of: standings, fixtures, results, squad, scorers.`;
      }
    } catch (error) {
      if (error instanceof Error) {
        return `Error fetching football data: ${error.message}`;
      }
      return 'An unknown error occurred while fetching football data.';
    }
  },
});
```

### Registering the Tool with the Agent

```typescript
// In your agent setup file
import { footballDataTool } from './tools/football-data-tool';

const tools = [
  // ...other tools (retrieval, etc.)
  footballDataTool,
];

const agent = createReactAgent({
  llm,
  tools,
  // ...
});
```

---

## 8. Rate Limiting & Error Handling

### Free Tier Limits

- **10 requests per minute** (rolling window)
- Exceeding this returns HTTP `429 Too Many Requests`

### Response Headers for Rate Tracking

| Header | Description |
|---|---|
| `X-Requests-Available-Minute` | Remaining requests in the current minute |
| `X-RequestCounter-Reset` | Seconds until the request counter resets |

### Rate Limiter Implementation

```typescript
// lib/rate-limiter.ts

class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 10, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the window
    this.requests = this.requests.filter((t) => now - t < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // 100ms buffer
      console.log(`Rate limit: waiting ${waitTime}ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForSlot(); // Recheck
    }

    this.requests.push(now);
  }
}

export const footballApiLimiter = new RateLimiter(10, 60_000);
```

### Integrating the Rate Limiter into the Client

```typescript
// Update fetchFootballData in lib/football-data-client.ts

import { footballApiLimiter } from './rate-limiter';

async function fetchFootballData<T>(endpoint: string): Promise<T> {
  if (!API_KEY) {
    throw new Error('FOOTBALL_DATA_API_KEY environment variable is not set.');
  }

  // Wait for an available slot before making the request
  await footballApiLimiter.waitForSlot();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'X-Auth-Token': API_KEY },
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get('X-RequestCounter-Reset') || '60';
    const waitMs = parseInt(retryAfter, 10) * 1000;
    console.warn(`429 received — retrying in ${retryAfter}s`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return fetchFootballData<T>(endpoint); // Retry once
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Football Data API error ${response.status}: ${(error as any).message || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
```

### Caching Strategy

Since data does not change every second, consider caching responses:

```typescript
// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return Promise.resolve(cached.data as T);
  }

  return fetcher().then((data) => {
    cache.set(key, { data, expiry: Date.now() + ttlMs });
    return data;
  });
}

// Usage — cache standings for 5 minutes
export async function getStandingsCached(): Promise<StandingsResponse> {
  return getCached('standings', 5 * 60_000, () =>
    fetchFootballData<StandingsResponse>('/competitions/PL/standings')
  );
}
```

**Recommended cache TTLs:**

| Data | TTL |
|---|---|
| Standings | 5 minutes |
| Match results | 2 minutes (during matchday), 30 minutes otherwise |
| Fixtures | 30 minutes |
| Squad / team info | 24 hours |
| Top scorers | 10 minutes |

---

## 9. Environment Setup

Add the API key to your `.env` file:

```bash
# .env
FOOTBALL_DATA_API_KEY=your_api_key_here
```

Make sure `.env` is in `.gitignore` (it should already be).

Load it in your app (if using Next.js, `FOOTBALL_DATA_API_KEY` is automatically available in server-side code via `process.env`). For other setups, use `dotenv`:

```typescript
import 'dotenv/config';

// Now process.env.FOOTBALL_DATA_API_KEY is available
```

### Validation at Startup

```typescript
// config.ts
export function validateFootballDataConfig(): void {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    console.warn(
      '⚠ FOOTBALL_DATA_API_KEY is not set. The football data tool will be unavailable.'
    );
  }
}
```

### Quick Connectivity Test

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Auth-Token: $FOOTBALL_DATA_API_KEY" \
  https://api.football-data.org/v4/competitions/PL

# Should return 200
```
