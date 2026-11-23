# Product Brief — The Institute (World of Red Rising, World #1)

## Vision

**Stand above the valley where Darrow became the Reaper.** A beautiful, explorable 3D diorama of the
Institute from *Red Rising*: the misty highlands of House Mars, the Argos running to the South Sea, the
Greatwoods, the floating mountain of Olympus. Built so a reader can say *"that's exactly how I pictured it"*,
and so every detail can be traced back to the page.

The repo is called *World of Red Rising* because the Institute is the first of several worlds (Lykos, Agea,
Luna…). Decisions here should make World #2 cheaper: reusable terrain, castle kit, lore schema, UI shell.

## Audience

**Primary: readers who have finished Red Rising (Book 1).** Fans who want to see the geography they
imagined, settle "where was Ceres relative to Mars?", and relive the campaign. Spoilers for Book 1 are fine;
nothing from later books.

Secondary: you (the builder), as a learning project and portfolio piece. People will share it, so it must be
fast to load, work on a phone and look great in a screenshot.

## Jobs to be done

1. **Orient:** "Show me the whole valley and where each House is." → overview, labels, sigils.
2. **Inspect:** "What did Mars Castle actually look like?" → click to fly in to a detailed miniature and a lore placard.
3. **Recall:** "What happened here?" → events listed by season on each placard, with page references.
4. **Compare seasons:** "What did the valley look like when the Argos froze?" → summer/winter switch.
5. **Trust:** "Is this from the book or made up?" → canon / inferred / invented badges, plus "why here?" notes.

## Experience principles

1. **The book is the art director.** Canon first. Every invention is labelled, never hidden.
2. **Legibility over literalism.** True scale makes castles invisible from orbit, so landmarks are
   exaggerated about 4× and terrain is tuned for readability. We say so in the About panel.
3. **A museum diorama, not a video game.** Calm camera, placards not HUD clutter, a model you lean over.
4. **Wonder first, information on demand.** Arriving should feel like a reveal. Text only when asked.
5. **Fast and kind.** Interactive within ~5 s on broadband; usable on a phone; keyboard and reduced-motion friendly.

## v1 scope (decided)

| In | Notes |
|---|---|
| Living diorama: orbit/zoom/pan over the whole valley | Canyon walls frame it; diorama slab edges |
| All 13 Houses' castles + Olympus + Phobos, Deimos, Metas bridge, Pass Fort | 7 canon, 6 inferred (incl. Pluto underground) |
| Regions, rivers, South Sea, loch, marshes | Named in-world labels |
| Click/tap → cinematic fly-to + lore placard | Facts, events by season, ≤2 short quotes, sources |
| Summer / winter switch | Snow, frozen rivers, palette, snowfall |
| Place index + search, layers (labels, banners, inferred) | |
| Intro flight + spoiler notice | Skippable; reduced-motion = cut |
| Minimap inset (valley + where it sits on Mars) | |
| Deep links (`#castle-mars`), GitHub Pages hosting | |

**Not in v1 (roadmap):** story timeline scrubber (banners change hands, armies move) → **v2**; descend-and-walk
at ground level → v3; audio/ambience; other books/worlds; multiplayer or annotations.

## Success criteria

- **Fidelity:** every canon fact in `docs/research/institute-canon.md` §2–5 is visible or stated in the app.
- **Beauty gate:** the lead's screenshot review at each milestone (overview, Mars, Olympus, winter) passes the DESIGN.md checklist.
- **Performance:** ≥ 55 fps on a 2020+ laptop at 1080p (high tier); ≥ 30 fps on a recent phone (low tier);
  first interactive render ≤ 5 s on broadband; JS ≤ 1.5 MB gzipped.
- **Accessibility:** all places reachable by keyboard via the index; lore readable without WebGL; contrast AA.
- **Quality:** `npm run check` green; no browser console errors in screenshot runs.

## Milestones (you review at each)

| Milestone | Theme | Demo you'll get |
|---|---|---|
| **M0** Foundations | Research, decisions, contracts, skeleton, pipeline | This plan + graybox (done) |
| **M1** The Land | Terrain, materials, water, sky, lore content | Live link: a beautiful empty valley in two seasons |
| **M2** The Houses | Castles, Olympus, forests, sigils & banners | Live link: the populated valley |
| **M3** The Experience | Camera & intro, UI & placards, labels, weather | Live link: the full interactive v1 candidate |
| **M4** Polish & Ship | Post-processing, performance, a11y, launch | v1 public launch |

## Risks

| Risk | Mitigation |
|---|---|
| It works but isn't beautiful | Design brief with concrete recipes; screenshot gates; lead art-direction pass each milestone |
| Agents collide or drift | Exclusive file ownership per ticket; frozen contracts; golden examples; lead review before merge |
| Phone performance | Quality tiers from day one; budgets in ARCHITECTURE.md §7 |
| Copyright | No scans/art in repo; our own sigils; paraphrase + ≤25-word quotes with citations; fan-project disclaimer |
| Canon disputes | Confidence badges + "why here?" notes; canon doc with page refs |
| Scope creep (timeline, walking) | Explicitly v2+; data model ready (events have seasons) |
