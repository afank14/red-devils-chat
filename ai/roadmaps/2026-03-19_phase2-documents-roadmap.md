# Phase 2: Document Corpus — Roadmap

> **Plan**: See [2026-03-19_phase2-documents-plan.md](./2026-03-19_phase2-documents-plan.md) for the reasoning behind each task.
> **Parent**: See [2026-03-19_high-level-plan.md](./2026-03-19_high-level-plan.md) for overall project phases.

> **Principle**: No over-engineering, no cruft, no legacy-compatibility features. Write the documents, nothing more.

---

## Document Writing

- [ ] Write `documents/club-history.md` — founding through modern era, chronological with clear era headers (H2 per era), key events and dates
  - **Criteria**: Covers 1878 founding, Munich 1958, Busby era, Ferguson era, Treble 1999, post-Ferguson era. Sections stay under 800 chars each.

- [ ] Write `documents/player-legends.md` — 15+ player profiles with narrative and stat lines (goals, appearances, assists, years, position)
  - **Criteria**: Each player has a brief narrative plus explicit stat numbers. Stats written in unambiguous format (e.g., "253 goals in 559 appearances").

- [ ] Write `documents/trophy-cabinet.md` — all major trophies organized by competition, with season, opponent, and scoreline
  - **Criteria**: Separate H2 sections for League Titles, Champions League, FA Cup, League Cup, other honors. Total counts stated clearly at top of each section.

- [ ] Write `documents/iconic-matches.md` — 8-12 famous matches with date, competition, teams, scoreline, scorers, venue, and narrative
  - **Criteria**: Each match is its own H3 section. Includes the 1999 CL final, 1968 European Cup final, and at least 6 others.

- [ ] Write `documents/managerial-history.md` — every permanent manager with tenure, matches, win rate, trophies, and philosophy
  - **Criteria**: Covers Mangnall through current manager. Busby and Ferguson sections are the most detailed. Stat lines are consistent across entries.

- [ ] Write `documents/old-trafford.md` — stadium history, capacity, Stretford End, rivalries, supporter culture, traditions
  - **Criteria**: Covers construction, expansions, current capacity. Includes at least 3 rivalries and cultural elements (Munich clock, Holy Trinity).

- [ ] Write `documents/player-stats-reference.md` — structured stat tables for calculator-friendly retrieval
  - **Criteria**: Uses markdown tables with consistent column headers (`Player | Goals | Appearances | Ratio | Years`). Includes tables for: all-time top scorers (10+), appearance records, season records. Numbers are explicit (no "over 200" — use exact figures).

## Quality Review

- [ ] Verify consistent formatting across all documents — same header hierarchy, same table column patterns, same stat format
  - **Criteria**: Any two player stat entries from different documents use the same structure.

- [ ] Verify chunk-friendliness — no stat tables buried inside narrative paragraphs, no sections over 1000 chars without subsection breaks
  - **Criteria**: Spot-check 3 documents. Each major section could be split at a header boundary without losing context.

- [ ] Verify calculator chain readiness — stat documents have explicit numbers that the agent can extract and pass to the calculator
  - **Criteria**: For a query like "Rooney vs Ronaldo goals-per-game ratio", the documents contain the exact goal and appearance numbers needed for calculation.

## Commit

- [ ] Commit: **"curated document corpus"**
  - **Criteria**: 5+ documents in `documents/` with consistent formatting. Stat documents have structured tables with explicit numbers. All documents use clear H2/H3 section headers.
