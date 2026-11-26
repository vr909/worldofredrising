# Deep dive 03: Kitbashing, procedural architecture from a parts kit

*How 18 different castles, towers and bridges were built in code by one builder in one ticket, without
downloading a single 3D model, and why that approach suits multi-agent work.*

## The idea: kit + recipes

Model makers call it **kitbashing**: build many unique things from one box of standard parts. T05 did the
code version:

```
src/landmarks/kit.ts      the parts box: wall segments, towers, cones, domes, arches, slits, merlons, rocks…
src/landmarks/mars.ts     a recipe: "a 16-sided curtain wall on the plateau rim, a keep at the NW vertex,
src/landmarks/canon.ts    spires at vertices 1/4/7/10, a gatehouse at the west…"
src/landmarks/others.ts   recipes for the remaining Houses, towers, bridge and fort
src/landmarks/build.ts    the registry: landmark id → recipe → merged geometry
```

A recipe is a short script of kit calls in **castle-local coordinates**: −z is the gate direction, and units
are display km. `build.ts` places and rotates the result in the world from the layout's `position` and
`facingDeg`. Recipes never know where they are on the map, which is why the same "gatehouse" call serves
Mars facing west and Ceres facing south.

## Why this beats downloaded models here

| | Asset models | Kit + recipes |
|---|---|---|
| Style consistency across 18 buildings | Hard (different artists) | Automatic (same parts, same materials) |
| Fits our *terrain* (cliffs, gorges, rivers) | Needs manual placement | Recipes query the ground (`k.gy()`, `k.rim()`) |
| Change "all roofs 10% taller" | Edit 18 files | Edit one part |
| Licensing, file size | Tracking + MBs | None + a few KB of code |
| An agent can edit it | Only via a 3D tool | Yes: it's TypeScript |

The last row is the multi-agent argument. A builder agent can read, reason about and change a recipe, and can
verify the change with the screenshot tool. It can't open a 3D modelling program.

## Three techniques worth stealing

**1. The ground decides, the recipe adapts.** Mars's curtain wall isn't a fixed circle. The recipe marches
outward along 16 directions (`k.rim(...)`) to find where the plateau ends, smooths those radii, and stands the
wall *on the cliff edge*. Wall pieces sink to the lowest ground beneath them so they never float. The book's
"three walls stand atop eighty-meter stone cliffs" (p.166) becomes a *query against the terrain*, not a hard-coded shape.

**2. Bake the lighting detail into the vertices.** Every part goes through one function that transforms it
into castle space and writes **vertex colours**: darker at the base (fake ambient occlusion), plus a little
per-part brightness jitter so walls don't look stamped. That costs nothing at runtime, and it's the
difference between "plastic toy" and "painted miniature".

**3. Merge by material, not by part.** Hundreds of parts end up in **three buckets** per castle: `stone`,
`roof` (House colour) and `trim`. Each bucket is merged into one geometry, so a castle is ≤ 3 draw calls and all
17 landmarks are 49. Draw calls, not triangles, are usually what kills performance on weak devices. The same
thinking made all banners one instanced draw call and all trees six.

## Data that other systems can use

A good kit produces information as well as geometry. When T08 needed to hang banners, T05 added a tiny
feature: `Kit.pole()` *records an anchor* every time it places a pole, and `bannerAnchors()` exports those
positions in world space. The banner builder never had to know how any castle was built. That's the
contract pattern from deep dive 01 at small scale: **expose facts, not internals**.

## Where kitbashing struggles (honest notes from M2)

- **Organic shapes.** Olympus's first version came out as a smooth dome. Kits of primitives are great for
  architecture and poor for mountains. Round 2 switched to faceted, slope-coloured triangles to get a
  rocky peak.
- **Invisible scale.** At the overview, 0.3 km castles are a few pixels wide. Kits add detail you only see up
  close; banners (one big colour cue each) did more for legibility from far away than any wall detail.
- **"Done" needs eyes.** Eight castles changed after their last screenshot in round 1. The fix wasn't better code but the
  rule "re-shoot after every change", plus the lead rendering the views a builder skipped.

## Try this yourself

1. In `src/landmarks/mars.ts`, change `SPIRES = new Set([1, 4, 7, 10])` to five spires. Run
   `npm run shot -- castle-mars`. Notice the banners move with them: anchors come from the poles.
2. In `src/world/layout.ts`, change Mars's `facingDeg` from 270 to 180, and the whole castle (gate, keep, the
   terrain ramp) turns to face south. Change it back, because the book says west.
3. Find `groundMin` in `kit.ts`. Why does sinking a wall to the *lowest* ground under it look right, while
   the *highest* would look wrong?
