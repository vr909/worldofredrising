# Journal 01: M1 "The Land"

*Phase: M1 · Lead: Opus · Builders: 5 × Sonnet in parallel worktrees · Human: product owner*

## What happened

1. **Pipeline first.** Before launching anyone, the lead pushed M0 to `main` so CI and the GitHub Pages deploy
   ran once for real. Both passed, so hosting stopped being a risk before any feature work. The lead also
   fixed the screenshot tool's fixed port, which would have made five parallel agents collide.
2. **Five builders, one wave.** T01 (terrain shape), T02 (terrain look), T03 (water), T04 (sky/atmosphere) and
   T09 (lore) ran at the same time, each in its own git worktree, each briefed from the playbook template plus
   ticket-specific "taste notes" naming the exact flaws visible in the M0 graybox.
3. **Review and merge in arrival order.** Each branch: scope check (diff touches only owned paths) →
   screenshots → code skim → merge → `npm run check` on the integration branch → push.
4. **Integration review.** The first render of all five together found problems that no single branch showed.
5. **Round 2.** Numbered fixes went back to the same agents (which keeps their context), after each merged the
   integration branch so it could see everyone else's work.
6. **Interrupted by a usage limit.** All four round-2 agents stopped mid-start when the account hit its
   5-hour limit. Their worktrees were clean and nothing was lost. After the reset, each was resumed with a
   short "here's your exact state, continue" message.

### The numbers (round 1)

| Ticket | Wall time | Tool calls | Subagent tokens | Result |
|---|---|---|---|---|
| T03 Water | 7 min | 37 | 142 k | Merged first time |
| T04 Atmosphere | 10 min | 44 | 163 k | Merged; 2 follow-ups |
| T02 Terrain look | 13 min | 43 | 152 k | Merged; 7 follow-ups (mostly blocked on T01's data) |
| T09 Lore | 18 min | 86 | 329 k | Merged first time; **caught a lead error** |
| T01 Terrain shape | 21 min | 79 | 277 k | Merged; 2 follow-ups |
| **Total** | **21 min elapsed** (vs ~69 min sequential) | 289 | **≈ 1.06 M** | 0 merge conflicts |

## What went well

- **Zero merge conflicts across five branches.** Exclusive file ownership plus frozen contracts did their job.
  Every branch's `git diff --name-only` stayed inside its folder.
- **Contracts held under replacement.** T01 rewrote the entire terrain generator, and T02, T03 and T04,
  developed against the old one, kept working unchanged. That's the `Heightfield` interface paying off.
- **A builder corrected the lead.** T09 fact-checked the golden example instead of copying it, and found that
  in winter Cassius, not Darrow, holds Mars Castle (p.280). The brief said "verify every fact against the
  text", and that instruction mattered more than the example itself.
- **Performance became a spec, not a hope.** T01 hit 0.8 s for the high-detail grid against a 2.5 s budget,
  because the budget was written into the ticket with numbers.

## What went wrong (and the fix)

| Problem | Root cause | Fix / lesson |
|---|---|---|
| T02's huge dark table hid T04's sky and moons in the overview | **The lead's spec** asked for both "slab on a dark table" and "sky with moons" without checking how they meet from the overview camera | Replace the table with a small plinth. **Lesson:** specs can each be correct and still contradict each other. Only a combined render shows it. |
| T02 couldn't show canyon strata or AO darkening | Its input data (wall weights, AO) only arrived with T01. The tickets were *parallel in files* but *sequential in data*. | Re-check T02 after T01. **Lesson:** "can run in parallel" ≠ "can be *judged* in parallel". Plan a merge-and-look checkpoint. |
| Summer plains rendered khaki | Palette chosen as hex swatches; warm sun + ACES tone mapping shifted them | Lead re-tuned greens **in the scene**. **Lesson:** judge colours in context. |
| Nobody could see the mid-freeze look | The screenshot tool only did season 0 or 1 | Added `?seasonT=` and `view@0.5` shots. **Lesson:** if agents can't observe something, they can't verify it, so give them the instrument. |
| Mist read as cotton or snow | Mist was tuned against the baseline terrain's blobby hills | Re-tune on T01's real glens in round 2. |
| Round 2 interrupted by a usage limit | Five parallel agents burn the budget about 5× faster | Work survives in worktrees; resume with SendMessage. **Lesson:** parallelism trades money and rate limits for wall-clock time. Size waves to the budget. |

## Decisions and why

| Decision | Why |
|---|---|
| Merge each ticket as it arrives, before the others finish | Keeps the integration branch moving; later tickets merge onto a known-good base |
| Hold round-2 feedback until T01 landed | Feedback on terrain-dependent looks (mist, snow, walls) would have tuned agents to terrain that was about to be replaced |
| Continue the same agents for round 2 rather than spawn new ones | They keep their context (their own code, earlier decisions), so a short, precise message is enough |
| Lead makes palette and tooling changes before round 2 | Shared files are lead-owned; doing them first means every agent's round-2 merge includes them |

## Before and after

*(Filled in after round 2: M0 graybox vs M1 final, overview and Mars.)*

## What we'd do differently

- Run a **"combined-camera" spec check** before launch: for each hero view, list every system that's
  visible in it and whether their requirements interact (table vs sky would have been caught).
- Mark **data dependencies** in the task table separately from file dependencies.
- Launch the most data-upstream ticket (T01) with the highest priority, and give downstream "look" tickets a
  first milestone of "works on the interface", then a second pass once the real data lands.
