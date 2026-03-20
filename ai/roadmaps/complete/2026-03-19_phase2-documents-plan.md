# Phase 2: Document Corpus — Plan

> **Roadmap**: See [2026-03-19_phase2-documents-roadmap.md](./2026-03-19_phase2-documents-roadmap.md) for the execution checklist.
> **Parent**: See [2026-03-19_high-level-plan.md](./2026-03-19_high-level-plan.md) for overall project phases.

> **Principle**: No over-engineering, no cruft, no legacy-compatibility features. Write clean, well-structured documents. Don't build tooling around them — just write the markdown files.

---

## What

Write 5-7 curated Manchester United markdown documents that form the RAG knowledge base. These are the source of truth for the agent's historical and statistical knowledge. Retrieval quality depends entirely on document quality — this phase is about content, not code.

---

## How

### Document Topics

Each document covers a distinct domain of Manchester United knowledge. Minimal overlap between documents so the retriever pulls from the right source:

1. **Club History & Timeline** (`club-history.md`) — Founding as Newton Heath in 1878, name change to Manchester United, the Busby era, Munich air disaster, the rise under Ferguson, the Treble, the Glazer era, and modern era through to current day. Chronological narrative with clear era headers.

2. **Player Legends & Statistics** (`player-legends.md`) — Profiles of 15-20 iconic players across eras. Each profile includes a brief narrative plus a stat line (goals, appearances, assists where available, years active, position). Players like Best, Charlton, Law, Cantona, Giggs, Scholes, Beckham, Rooney, Ronaldo, Van Nistelrooy, Schmeichel, Vidic, Ferdinand, etc.

3. **Trophy Cabinet** (`trophy-cabinet.md`) — Every major trophy organized by competition. For each: season, competition name, final opponent, scoreline where relevant. Separate sections for league titles, European Cups/Champions League, FA Cups, League Cups, and other honors. Include total counts prominently.

4. **Iconic Matches** (`iconic-matches.md`) — 8-12 of the most famous matches in club history. Each entry includes date, competition, teams, scoreline, scorers, venue, and a brief narrative of why it matters. The 1999 Champions League final, 1968 European Cup final, 8-2 vs Arsenal, key derby victories, etc.

5. **Managerial History** (`managerial-history.md`) — Every permanent manager from Ernest Mangnall onward. For each: tenure dates, matches managed, win rate (or approximate), trophies won, brief description of philosophy and era. Emphasis on Busby and Ferguson sections given their significance.

6. **Old Trafford & Club Culture** (`old-trafford.md`) — Stadium history (construction, expansions, capacity over time), the Stretford End, key rivalries (Liverpool, City, Leeds), supporter traditions, chants, the Munich clock, the Holy Trinity statue.

7. **Player Statistics Reference** (`player-stats-reference.md`) — Structured stat tables designed specifically for calculator-friendly retrieval. Tables organized by category: all-time top scorers, appearance records, season records, goals-per-game ratios. This is the document the agent pulls from when it needs numbers for calculation.

### Formatting Strategy

All documents follow the same structural conventions so the text splitter handles them consistently:

**Headers**: Use markdown H1 for document title, H2 for major sections, H3 for subsections. The RecursiveCharacterTextSplitter splits on `\n\n` first, then `\n`, so clear header hierarchy keeps related content in the same chunk.

**Section sizing**: Keep individual sections under 800 characters where possible. If a section runs longer, break it into subsections with H3 headers. This ensures the splitter doesn't cut a section in half — it splits at the header boundary instead.

**Stat tables**: Use markdown tables with consistent column headers across documents. For example, player stat tables always use: `| Player | Goals | Appearances | Ratio | Years |`. This consistency means the retriever returns clean, parseable data regardless of which document the chunk comes from.

**No front matter or metadata blocks**: The RAG pipeline derives metadata from the filename. Don't add YAML front matter — it would get chunked and embedded, polluting the vector space with non-content text.

**Cross-reference awareness**: Documents can reference each other by topic (e.g., club-history.md might mention "See Player Legends for full stats") but should not depend on each other for completeness. Each document stands alone.

---

## Technical Considerations

**Chunk-friendliness**: The text splitter (RecursiveCharacterTextSplitter, 1000 chars, 200 overlap) splits on markdown boundaries. Writing with this in mind: keep paragraphs focused on a single topic, use headers to signal topic changes, and avoid burying key facts inside long narrative paragraphs. A stat table in the middle of a narrative paragraph will get split badly — put tables in their own sections.

**Calculator input quality**: The agent's calculator tool chain works by: (1) RAG retrieves a chunk with stats, (2) agent extracts numbers, (3) agent calls calculator. For this chain to work, stat documents need numbers in clear, unambiguous formats. Write "253 goals in 559 appearances" not "scored over 250 goals in his time at the club."

**Embedding relevance**: OpenAI's text-embedding-3-small embeds meaning, not keywords. Write naturally — "Wayne Rooney is Manchester United's all-time leading goalscorer" will embed well for queries about "top scorer", "most goals", "leading goalscorer", etc. No need for keyword stuffing.

**Retrieval testing foresight**: In Phase 4, we'll test retrieval with known queries. Write documents now with those test queries in mind. If someone asks "How many Champions League titles has United won?", the trophy-cabinet.md should have a clear section with that exact information in a retrievable chunk.
