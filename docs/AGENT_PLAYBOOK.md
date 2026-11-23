# Agent Playbook — how the lead runs the build

This is the operating manual for the multi-agent phase: how tickets become agent runs, how work is
reviewed and merged, and how we keep agents from colliding. It's also a teaching document. See
`docs/learning/` for the reasoning behind each rule.

## 1. Roles

| Role | Model | Responsibilities |
|---|---|---|
| **Lead / orchestrator** | Opus | Owns contracts and docs, writes ticket prompts, launches agents, reviews diffs and screenshots, merges, does integration and art-direction passes, writes the journal, demos milestones to the human. |
| **Builder agents** | Sonnet | One ticket each, in an isolated git worktree. Build, self-verify (tests + screenshots), report. |
| **Human (product owner)** | — | Decisions, milestone reviews, taste. Approves merges to `main`. |

## 2. Lifecycle of a ticket

```
 TASKS.md ticket ──► lead writes prompt (template §4) ──► Sonnet agent in worktree
        ▲                                                        │ build → check → shot → look → fix
        │                                                        ▼
 lead refines ticket ◄── changes requested ◄── lead review ◄── report + branch
                                                   │ approve
                                                   ▼
                                  merge into integration branch → re-run check + shots
                                                   │ milestone complete
                                                   ▼
                     integration/art pass → journal + deep dive → merge to main → Pages deploy → human review
```

**Parallelism rule:** launch together only tickets with disjoint **Owns** sets. Merge in dependency order;
after each merge, re-run `npm run check` and the milestone's screenshot set on the integration branch.

## 3. What a builder's final report must contain

```
## T0X report
Summary: 2–4 sentences.
Files changed: list.
Verification: `npm run check` result; `npm run shot` views + one-line note per image; browser errors (should be none).
Decisions not covered by the spec: list with reasons.
Known issues / follow-ups: list.
Requested changes (files I don't own): exact proposed edits.
Canon additions (T09 only): facts + pages.
```

## 4. Ticket prompt template (what the lead sends each agent)

```
You are a builder agent on "World of Red Rising" (repo root = your working directory, a git worktree).
Your ticket: <T0X title>. Read, in this order: CLAUDE.md, docs/TASKS.md (section T0X and the Definition of
Done), docs/ARCHITECTURE.md, docs/DESIGN.md (sections listed in your ticket), and the files under "Reads".

Scope: you may ONLY modify files listed under "Owns" for T0X. Everything else is read-only; if you need
a change elsewhere, put it under "Requested changes" in your report.

Environment notes: <e.g. PDF path for T09; global Playwright is available; run `npm ci` first if node_modules is missing>.

Work loop: implement → `npm run check` → `npm run shot -- <views>` → open and look at every PNG with the Read
tool → fix → repeat until the "Done when" criteria and DESIGN checklist items are met. Commit on your branch
with messages prefixed "T0X:". Finish with the report format in docs/AGENT_PLAYBOOK.md §3.

Taste notes from the lead: <specific guidance, pitfalls, what "great" looks like for this ticket>.
```

## 5. Review checklist (lead)

1. **Scope:** `git diff --stat <base>..<branch>` touches only owned paths.
2. **Contracts:** no changes to frozen interfaces; tests not weakened.
3. **Check:** `npm run check` green on the branch *and* after merging into integration.
4. **Visual:** re-run the ticket's screenshot views; compare against DESIGN §12; compare before/after.
5. **Code:** readable, no per-frame allocations, disposes resources, no `any`, comments cite canon.
6. **Report honesty:** claims in the report match what the diff and the screenshots show.
7. Decide: **merge**, **merge + follow-up ticket**, or **send back** with specific numbered fixes (continue the same agent so it keeps its context).

## 6. Conflict avoidance

- Exclusive ownership (ARCHITECTURE §2) is the main tool. Shared files are lead-only.
- Frozen contracts mean agents can work against interfaces that won't move under them.
- Golden examples (content, later a reference castle recipe) mean agents copy a pattern instead of
  inventing a new one each time.
- If two tickets turn out to need the same file, the lead splits the change: lead edits the shared part first, then agents continue.

## 7. When things go wrong

| Symptom | Response |
|---|---|
| Agent says done but screenshots are poor | Send back with concrete, numbered visual fixes and a reference to the DESIGN item. |
| Agent edits files outside scope | Revert those hunks; turn the useful parts into Requested changes. |
| Spec was wrong or ambiguous | Fix the spec first (TASKS/DESIGN), then re-brief. Log it in the journal; it's a lesson. |
| Integration breaks after merge | Lead fixes integration glue; if it's a contract gap, update the contract and its tests. |
| Agent stuck in a loop | Stop it, summarise what it learned, start a fresh agent with a narrower ticket. |

## 8. Lessons folded in after M1

1. **Combined review is its own step.** After merging a wave, render the milestone's hero views with *everything*
   merged before sending any follow-ups. Most M1 issues only appeared in combination.
2. **Hold dependent feedback.** Don't send look feedback that depends on another ticket's data (terrain → mist,
   snow, walls) until that data has landed; otherwise the agent tunes to throwaway inputs.
3. **Contracts need semantics, not just types.** For every shared data channel, write down its ranges, whether
   values may overlap, and how they combine (see `SurfaceChannels`). Two agents filled that gap differently in M1.
4. **Give agents the instrument for every requirement.** If a requirement can't be screenshotted (e.g. a
   transition), add a debug parameter first (`?seasonT=`), then ask for it.
5. **Size waves to the budget.** Five parallel agents hit the account's usage limit. Default to waves of ~3; work
   in worktrees survives interruptions. Resume with SendMessage stating the agent's exact state (HEAD, merged or
   not, uncommitted changes).
6. **Screenshots are slow with high-detail terrain in software GL (20–75 s per view).** Ask agents to shoot a
   few views per call and to use `SHOT_SIZE=1200x750` while iterating.
7. **"Looked at every image" is checked.** If a report admits a view wasn't opened, the lead opens it before merging.
8. **Every note in a report becomes a decision.** Not just "Requested changes": each "Known issue", "Decision" or
   aside gets triaged into the backlog or an explicit "won't do". (M1: a builder flagged a missing loch; it was
   only fixed after the human found it.)
9. **Measure budgets every milestone.** Run the frame-cost probe at each milestone gate, not only in the final perf ticket.
10. **Verify every worktree's base commit right after launch.** In M2 one of three worktrees was created from a
    stale commit, so that builder read an outdated ticket and lacked new store fields. Check with
    `git -C .claude/worktrees/agent-<id> log -1`; if it's behind, tell the agent to merge the integration branch first.
11. **Ask builders to commit WIP checkpoints.** Usage limits can stop every agent mid-task. Committed checkpoints
    make resuming precise ("you're at commit X, continue with Y") and protect against lost work.
