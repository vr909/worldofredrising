# Deep dive 01 — Anatomy of a multi-agent build

*Why the planning phase looked the way it did, and the mental model behind it.*

## The core problem: agents don't share a brain

When one developer builds a project, the design lives in their head and stays consistent automatically.
When five agents build it in parallel, each starts **cold**: it knows only what it's told plus what it can read.
Two things go wrong:

1. **Divergence.** Agent A assumes heights are in metres and Agent B in kilometres. Agent C invents its own
   colour for House Mars. Each one is locally reasonable and globally broken.
2. **Collision.** Two agents edit the same file. Even if git merges it cleanly, each one's assumptions about
   that file are now stale.

Almost every practice in this repo exists to fight one of those two problems.

## The five tools

### 1. Contracts: shared truth that cannot drift
A *contract* is an interface everyone builds against and nobody changes casually: `src/world/layout.ts`
(where everything is), the `Heightfield` interface (how high the ground is), `sharedUniforms` (what time and
season it is in every shader), the store (how UI and scene talk), the content schema.
Contracts turn "five agents agreeing with each other" (n² conversations) into "five agents agreeing with one
file" (n conversations). **Tests guard them** (`layout.test.ts`, `heightfield.test.ts`, `content.test.ts`),
so a broken contract fails loudly instead of rendering a castle in the sea.

### 2. Ownership: each file has exactly one writer
ARCHITECTURE §2 gives every path one owner. A ticket's **Owns** list is the only place its agent may write.
Shared files (`Scene.tsx`, the store) belong to the lead, who makes the tiny edits that wire things together.
That's why the scene is split one system per folder: the code structure follows the team structure
(Conway's law, used on purpose).

### 3. Specs with acceptance criteria: "done" is defined before work starts
A ticket that says "make the water nice" gets a different answer from every agent and no way to judge it.
A ticket that says "flow streaks along uv.x with uTime, foam at edges, freezes edges-first in winter, no
z-fighting from these five views" can be checked. The **Definition of Done** adds the universal checks
(green build, screenshots inspected, report written).

### 4. Feedback loops agents can use themselves
An agent that can't see its output will report "done" for code that compiles but looks wrong.
So the project gives agents eyes and a conscience:
- `npm run check`: types, lint, tests, build in one command.
- `npm run shot -- <views>`: renders real screenshots in headless Chrome and prints browser errors. The agent
  *must look at the images.* This is the single most important thing for visual work.

### 5. Golden examples: show, don't tell
Two lore entries (`castle-mars`, `olympus`) were written by the lead to the exact standard. A content agent
copying a concrete example matches voice, length and citation style far better than one reading three
paragraphs of style rules. (The flip side: examples get copied *including their mistakes*, so they get the
most careful review.)

## Who does what, and why that split

| | Lead (Opus) | Builders (Sonnet) |
|---|---|---|
| Good at | Ambiguity, trade-offs, cross-cutting design, judging quality | Fast, focused execution of a well-defined task |
| Gets | Decisions, contracts, specs, review, integration, taste | One ticket, a worktree, clear acceptance criteria |
| Cost profile | Expensive per token, so spent on leverage | Cheaper, so spent on volume |

The pattern is **plan expensive, execute cheap, review expensive.** Mistakes in planning multiply across
every agent, so that's where the strongest model goes. Mistakes in one ticket are contained, cheap to
redo and caught in review.

## Parallelism is a property of the plan, not the team

You can only run tickets in parallel if their write sets don't overlap and they depend only on contracts that
already exist. That's why M0 built the graybox first. T02 (terrain look) can start *before* T01 (terrain
generator) finishes because the baseline heightfield already satisfies the interface. When T01 lands, T02's
work instantly sits on better ground with no coordination.

```
             contracts + graybox (M0)
            /      |       |       \        \
         T01     T02     T03     T04      T09      ← run in parallel (disjoint folders)
            \      |       |       /        /
             lead review + merge, in order
                         |
                 M1 integration pass
```

## Worktrees: the mechanical side of isolation

Each builder runs in a **git worktree**: a second checkout of the same repo in another folder, on its own
branch. Agents can't step on each other's uncommitted files, the lead can diff each branch against the base,
and merging is ordinary `git merge`. A bad branch can be thrown away at no cost.

## Rolling-wave planning

Only M1 is fully specified. M2–M4 are scoped but deliberately coarse, because what we learn in M1
(how fast terrain generation really is, whether the painterly shader needs a different splat layout) will
change them. Detailed plans for distant work are mostly fiction; detailed plans for the next step are leverage.

## Try this yourself

- Open `docs/TASKS.md` and pick T03. Find every contract it reads. Could it be built without talking to T01–T04? Why?
- Open `src/world/layout.test.ts`. Delete the Metas bridge from the layout and run `npm run test`. Which tests catch it, and which don't?
- Look at `docs/images/m0-overview.jpg`. Write three numbered, checkable fixes you'd send an agent. That's a review.
