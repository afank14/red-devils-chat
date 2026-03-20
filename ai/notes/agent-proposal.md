# Agent Proposal: Autonomous Scheduling Agent for Stride

## The Feature

Stride is an AI-powered daily planner that turns a user's task list and Google Calendar into an optimized daily schedule. Currently, the "Plan my day" flow works as a single AI call: it reads the user's tasks and calendar, then outputs a schedule. But this is a **one-shot generation** — if something goes wrong (a conflict, an ambiguous task, an external dependency), the system can't recover on its own.

We propose replacing this with an **autonomous scheduling agent** that can reason through multi-step scheduling decisions and take actions on the user's behalf.

## Why an Agent Pattern Fits

Scheduling is inherently an **iterative, tool-using problem** — exactly the kind of task where agents outperform single-shot prompts:

1. **Multiple tool calls in sequence.** The agent would need to: (a) fetch the user's task list from Supabase, (b) read their Google Calendar for existing events, (c) reason about priorities, durations, and constraints, (d) find open time slots, and (e) write events back to Google Calendar. No single API call accomplishes this — the agent must chain tools together, and the output of one step (e.g., discovering a 2-hour meeting block) informs the next (e.g., splitting a long task around it).

2. **Conditional logic and error recovery.** What if the calendar API returns a rate-limit error? What if two tasks have a hard dependency ("study for exam" before "take exam")? What if the user's calendar is completely full? An agent can detect these situations, reason about alternatives, and retry or ask for clarification — a static pipeline cannot.

3. **Dynamic re-planning.** Stride already envisions a "re-schedule the rest of my day" feature. An agent is the natural pattern here: it observes the current state (what's done, what's overdue, what's left), decides what to move, and executes the changes. This is a loop of perception, reasoning, and action — the textbook agent pattern.

4. **Multi-modal input resolution.** When a user adds a task via photo or voice memo, the agent could first call a vision/transcription tool to interpret the input, then decide whether the result is a single task or multiple, estimate durations, and *then* proceed to schedule — all within one autonomous workflow rather than a fragile chain of microservices.

## What the Agent Would Look Like

- **Tools available:** `getTaskList`, `getCalendarEvents`, `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent`, `askUserForClarification`
- **Loop:** The agent iterates over unscheduled tasks, finds optimal slots by checking calendar availability, places them, and verifies no conflicts were introduced. If a conflict is detected, it re-adjusts.
- **Guardrails:** Maximum iteration count (prevent runaway loops), user confirmation before writing to Google Calendar (the agent proposes, the user approves), and scoped permissions (only today's calendar, only the user's own tasks).

## Why Not Just a Pipeline?

A traditional pipeline (fetch → compute → write) works for the happy path but breaks down at the edges. An agent handles the long tail: tasks with no clear duration, overlapping constraints, calendar sync failures, and ambiguous inputs. The agent pattern gives Stride the ability to **reason through complexity** rather than failing silently or producing a bad schedule.
