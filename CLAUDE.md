# CLAUDE.md

## Project Context
Read `aiDocs/context.md` for full project context, tech stack, and current focus.

## Behavioral Guidelines

### Before Writing Code
- Ask my opinion before starting complex or architectural work
- Confirm the approach if there are multiple valid paths
- Read existing code before modifying — understand what's there first

### While Writing Code
- Don't overengineer — keep it simple, solve the current problem
- Follow existing patterns in the codebase
- Use TypeScript with proper types — no `any` unless truly necessary
- Error handling in tools: always catch, never throw — return error strings
- Use math.js for calculations, never `eval()` or `Function()`
- Keep functions small and focused

### When Uncertain
- Flag uncertainty instead of guessing — say "I'm not sure about X" rather than confidently providing wrong info
- If a LangChain API or import path is unclear, check the reference docs in `ai/guides/reference/` before guessing
- When in doubt about assignment requirements, ask

### Code Quality
- Structured logging with pino for all tool calls
- Meaningful variable and function names
- No unnecessary comments — code should be self-documenting
- Keep commits incremental and meaningful (5+ commits required for assignment)
