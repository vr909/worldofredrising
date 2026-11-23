# Task Board

How to read a ticket: **Owns** = files only this ticket may write. **Reads** = contracts to build against.
**Done when** = acceptance criteria the lead checks in review. Every ticket also inherits the
**Definition of Done** at the bottom.

Planning style: **rolling wave.** M1 tickets are fully specified and ready to run. M2–M4 tickets are scoped
but get refined at the start of their milestone with what we learn (expect changes).

| Ticket | Milestone | Title | Model | Depends on | Status |
|---|---|---|---|---|---|
| T01 | M1 | Terrain generator v2 | Sonnet | — | Ready |
| T02 | M1 | Painterly terrain material + diorama slab | Sonnet | — (uses baseline heightfield) | Ready |
| T03 | M1 | Water: rivers, sea, loch, ice | Sonnet | — | Ready |
| T04 | M1 | Sky, light, fog, mist, moons | Sonnet | — | Ready |
| T09 | M1 | Lore content for every place | Sonnet | — | Ready |
| T05 | M2 | Castle kit + per-House recipes, towers, bridge, fort | Sonnet | T01 | Scoped |
| T06 | M2 | Olympus | Sonnet | T04 | Scoped |
| T07 | M2 | Vegetation | Sonnet | T01, T02 | Scoped |
| T08 | M2 | Sigils + banners | Sonnet | — | Scoped |
| T10 | M3 | Camera: intro, hero shots, flights, keys | Sonnet | T05, T06 | Scoped |
| T11 | M3 | UI: placards, index, minimap, gate, about, mobile | Sonnet | T08, T09 | Scoped |
| T12 | M3 | In-world labels + hover/selection markers | Sonnet | T05, T08 | Scoped |
| T13 | M3 | Weather + season orchestration | Sonnet | T02, T03, T07 | Scoped |
| T14 | M4 | Performance + quality tiers + mobile | Sonnet | all | Scoped |
| T15 | M4 | Post-processing + colour grade | Sonnet | M3 | Scoped |
| T16 | M4 | Accessibility + no-WebGL fallback | Sonnet | T11 | Scoped |
| L-n | all | Lead: review, merge, art-direction pass, journal, milestone demo | Opus | — | Ongoing |

**Why these M1 tickets can run in parallel:** they touch disjoint folders and meet only through frozen
contracts (`Heightfield`, `sharedUniforms`, `palette`, layout). T02/T03 develop against the baseline
heightfield; when T01 lands, they automatically get better ground. T09 (content) touches no rendering code at all.

---

## M1 — The Land

### T01 · Terrain generator v2
**Owns:** `src/terrain/heightfield.ts` (internals only; the exported `Heightfield` interface, `HeightfieldOptions`,
`generateHeightfield` signature and `pointAlong` stay), `src/terrain/gen/**`, `src/terrain/HeightfieldContext.tsx`,
`src/terrain/heightfield.test.ts` (add tests; don't weaken existing ones).
**Reads:** `src/world/*`, DESIGN §4–5, canon doc §2–5.
**Goal:** replace the baseline generator with terrain that looks like the book's valley and is fast.
**Requirements:**
1. **Western mountains:** ridged multifractal peaks 2–4 km with valleys between ridges, highest toward the
   canyon wall; snowy upper zone (just height; colour is T02). Foothill band (1–2 km wide) where they meet the plains.
2. **Highlands:** craggy dwarf mountains 0.6–1.6 km, **U-shaped grassy glens** (flat-bottomed valleys) and
   gulches; a **bowl-like glen around Mars Castle** with greater hills cupping it north and south (p.166).
3. **Postern Hills:** rolling hills 0.2–0.8 km with rocky tops. **Greatwoods:** gentle undulation 0.15–0.5.
   **Plains:** near-flat with subtle swells and river terraces. **Marshes:** flats at ~0.02 with shallow
   pools (set `surface.water`). **South Sea:** shelf then deeper floor (−0.1 → −0.6).
4. **Canyon walls:** continuous sheer terraced cliffs rising to 6 km from the valley edge (no trough between
   the mountains and the wall), with horizontal ledges every ~0.4–0.7 km and buttress/erosion variation along the wall.
5. **Landmark sites** per `site.ground`: `hill` = plateau with steep sides (Mars: cliffs on N, E and S; gentle
   ramp on the W leading to the west gate, p.166); `gorge` = two rock faces flanking the site (Jupiter, p.353);
   `river` = level banks on both sides of the river (Ceres); `flat` = levelled pad blended smoothly;
   `underground` = a hillside face with a level ledge facing `facingDeg` for a cave mouth (Pluto). Plateau tops are
   flat within ±0.01 over `site.radius`.
6. **Rivers:** banks always above the water surface; bed below it; carved valleys widen downstream; no
   ribbon is ever hidden under terrain (check `riverSurfaceAt` against neighbouring ground). Monotonic profiles.
7. **Baked lighting data:** fill `surface.ao` (horizon-based AO or similar) so glens and gulches darken softly.
   Optionally add a sun-shadow channel (propose it in your report; don't change the interface yourself).
8. **Splat weights** consistent with DESIGN §5 (slope rock, region blends, sand near the sea, wall stone).
9. **Performance:** generate in a **Web Worker** (`generateHeightfieldAsync` in `gen/`, used by `HeightfieldContext`),
   high tier 0.125 km ≤ 2.5 s, medium 0.2 km ≤ 1 s on a laptop. Use spatial acceleration (bounding boxes per
   region/river, coarse SDF rasters), no per-sample allocations. Deterministic for a seed.
10. Update `CELL_SIZE` in `HeightfieldContext` to the tier values in ARCHITECTURE §7.
**Done when:** all contract tests plus your new ones pass (site flatness, Mars cliffs, wall continuity, river
banks, determinism); `npm run shot -- overview castle-mars castle-jupiter castle-ceres western-mountains highlands`
shows the features above; timing numbers in your report.

### T02 · Painterly terrain material + diorama slab
**Owns:** `src/terrain/Terrain.tsx`, `src/terrain/terrainGeometry.ts`, `src/terrain/terrainMaterial.ts`,
`src/terrain/shaders/**`, `src/terrain/Slab.tsx` (new). The lead will add `<Slab/>` to `Scene.tsx` if you export it separately.
**Reads:** `Heightfield` (attributes splatA/splatB/ao/water), `sharedUniforms`, `palette`, DESIGN §2, §3, §5.
**Goal:** make the ground look hand-painted and Martian, in both seasons.
**Requirements:** DESIGN §5 steps 1–8, exactly. In detail:
1. A custom material (ShaderMaterial or `onBeforeCompile` on MeshStandardMaterial), driven by palette
   uniforms for SUMMER and WINTER, blended by `uSeason`.
2. Snow logic: summer snowline about 2.8 km with noise; winter snow on slope < ~40°, sweeping downhill as `uSeason` rises.
3. Canyon strata bands on wall stone; brush noise; macro colour variation; wet shorelines.
4. Uses the shared fog (`uFogColor`, `uFogDensity`) and matches the built-in fog on other objects.
5. **Diorama slab** (`Slab.tsx`): side skirts on all four edges down to `-BOUNDS.slabDepth`, with strata
   cross-section (soil cap, rock bands; water layer at the sea's cut). A dark matte table plane below with a soft contact shadow.
6. Keep `receiveShadow`; keep the mesh raycastable (named `terrain`).
**Done when:** `npm run shot -- overview overview-winter castle-mars western-mountains south-sea`
matches DESIGN §12 terrain items; summer vs winter screenshot pair shows the snow logic; no banding or tiling.

### T03 · Water: rivers, sea, loch, ice
**Owns:** `src/water/**`.
**Reads:** `RIVERS`, `REGIONS` (sea, lake, marsh), `Heightfield.riverSurfaceAt`, `surface.water`, `sharedUniforms`, palette water tokens.
**Goal:** stylised water you want to look at, which freezes in winter.
**Requirements:**
1. Rivers: ribbon meshes (extend `riverGeometry.ts`) with a shader showing flow direction (scrolling streaks
   along `uv.x` with `uTime`), soft foam at the edges, deeper colour in the middle, width taper source→mouth,
   gentle sparkle toward the sun. Joins at confluences look seamless (no overlapping bright seams).
2. Sea: depth-tinted (use the heightfield to bake a depth/shore-distance texture) with shoreline foam bands
   that slowly breathe, a fresnel sky tint, and the Argos delta blending into it.
3. Loch and marsh pools: still water, darker, with reed-edge darkening.
4. **Winter (`uSeason` → 1):** rivers and loch fade to ice (pale, faint crack pattern, no flow, slight snow
   drift on top); the sea keeps open water with shore ice. The transition should look like freezing (edges first), not a crossfade.
5. Match the scene fog. Water must never z-fight with terrain (use polygonOffset or small lifts) and must never float above the banks.
**Done when:** `npm run shot -- overview castle-ceres argos south-sea highland-loch overview-winter castle-ceres-winter`
look right; no z-fighting on any river from those views.

### T04 · Sky, light, fog, mist, moons
**Owns:** `src/atmosphere/**` except `src/atmosphere/weather/`. Keep `SharedUniformsDriver` working (same export and behaviour; you may extend it).
**Reads:** palette, `sharedUniforms`, DESIGN §2–3, §9; `LANDMARKS` (Olympus position), `REGIONS` (highlands).
**Goal:** golden-hour Mars sky and air that make the valley feel deep and alive.
**Requirements:**
1. Sky dome: gradient zenith→horizon from palette (season-blended), warm glow around the sun direction,
   faint high-altitude cloud bands. **Two small moons** (Phobos larger and closer, Deimos tiny) placed so
   they're visible from the overview without cluttering it.
2. Light rig: tune sun intensity, hemisphere fill, tone-mapping exposure for summer and winter (winter sun lower and paler).
   Shadow camera: tight frustum following the camera target for landmark shadows.
3. Fog: keep exponential fog for distance, add **height fog** (thicker in low areas) where possible via
   shared uniforms (coordinate through your report if another system's shader needs a chunk; provide a reusable GLSL chunk in `src/atmosphere/shaders/`).
4. **Mist:** soft drifting banks in the highland glens and over the marshes (instanced soft-particle sprites or
   layered noise planes; depth-faded so there are no hard intersections), burning off a little toward the plains.
5. **Cloud collar** around Olympus: a ring of soft cloud below the floating mountain (it will be built in T06;
   anchor to the `olympus` landmark position and altitude).
6. Performance: ≤ 10 draw calls total for atmosphere; transparent sorting stable while orbiting.
**Done when:** `npm run shot -- overview overview-winter castle-mars olympus highlands` show a clean
graded sky, mist in the glens, moons visible in overview, no hard transparent edges.

### T09 · Lore content for every place
**Owns:** `src/content/**` (you may add optional fields to `schema.ts` and a `houses.ts` with House lore).
**Reads:** `docs/CONTENT_GUIDE.md` (**required**), `docs/research/institute-canon.md`, the reference PDF
(path in the ticket prompt; never copy it into the repo), `src/world/layout.ts`.
**Goal:** a placard for every landmark, named region and named river, written to the golden examples' standard.
**Requirements:**
1. Entries for all `LANDMARKS` (18), regions with `labelled: true` plus the marshes and loch, and the rivers Argos,
   Furor and Metas. Match the voice and length of the two golden examples (`castle-mars`, `olympus`).
2. `src/content/houses.ts`: per House: proctor (if named), notable students, fate in Book 1, with page refs; schema in `schema.ts`.
3. Every inferred entry has an `inference` note explaining the textual clues (see canon doc §4).
4. Verify every fact against the text, with page numbers. When the text and the printed map disagree, say so in the description.
5. Quotes: ≤ 2 per place, ≤ 25 words each. Prose is your own paraphrase.
**Done when:** `npm run test` passes the content tests; a lead spot-check of 5 random facts against the cited pages finds no errors.

---

## M2 — The Houses (scoped; refined at M1 review)

- **T05 Castle kit.** Modular procedural parts (curtain wall with crenellations, round and square towers, keep,
  gatehouse, spires, colonnade, river-spanning hall, tiered walls, cave mouth) merged per castle (≤ 3 draw calls).
  Recipes per landmark from canon: Mars (4 spires, 50 m square keep in NW wall, west gate, 30 m walls on cliffs),
  Jupiter (3-tier walls bowing outward between rock faces, postern gate), Ceres (spans river, long walls,
  orchard yard), Minerva (sprawling sandstone with an inner town), Diana (forest fortress), Apollo, Juno,
  inferred Houses (Vulcan forge-fortress with chimneys, Neptune sea-castle on a headland, Venus, Mercury,
  Bacchus), Pluto (cave mouth with hidden gate), Phobos/Deimos towers (Deimos "massive"), Metas bridge, Pass Fort.
  Winter snow on roofs. Hover/selection highlight (rim glow).
- **T06 Olympus.** Floating inverted mountain with craggy underside, snowy upper slopes, bone-pale marble citadel
  "like a marble sword" (slender spire), high balconies and terraces, warm window glow, tiny medBots orbiting. No doors, no dock.
- **T07 Vegetation.** Instanced conifers (North Woods, highland firs), oak/broadleaf (Greatwoods, glens), olive
  groves (Minerva), orchards (Ceres), vineyards (Bacchus, inferred), reeds (marsh). Scatter by region/splat/slope,
  clear of water and sites; wind sway; winter snow caps and bare broadleaf; tiered densities.
- **T08 Sigils & banners.** 13 original SVG sigils per DESIGN §11 + `src/sigils/index.ts` export; waving cloth
  banners above castles using a sigil texture; reusable `<Sigil id/>` React component for the UI.

## M3 — The Experience (scoped)

- **T10 Camera.** Intro flight (South Sea → up-canyon → overview, ~7 s, skippable, reduced-motion cut),
  hand-tuned `SHOT_OVERRIDES` for every landmark and region, arcing flights, keyboard controls, min height above
  ground, idle drift (optional), hash-sync on selection.
- **T11 UI.** Full DESIGN §6–7: placard, hover card, index/search, season switch, layers menu, minimap with
  Mars inset, entry gate, About/credits, mobile bottom sheet, URL hash.
- **T12 Labels.** Region names laid on the land (Cinzel, large, tracked), castle name tags with sigil chip, LOD
  and fade by distance, simple declutter, selection ring on the ground in House colour, hover outline.
- **T13 Weather & seasons.** Snowfall near the camera in winter; season transition audit across systems;
  optional "thaw" polish; respects reduced motion.

## M4 — Polish & Ship (scoped)

- **T14 Performance.** Auto quality tier (drei PerformanceMonitor), budgets verified, phone emulation screenshots, bundle analysis.
- **T15 Post-processing.** Tilt-shift focused on the camera target (diorama feel), gentle bloom (Olympus
  windows, water glints), vignette, colour grade, SMAA; per-tier settings.
- **T16 Accessibility.** Keyboard pass, focus order, ARIA, contrast, no-WebGL fallback (index + minimap + placards).
- **L-launch (Lead).** README with screenshots, social preview image, About/credits, disclaimer, final deploy, retrospective.

---

## Definition of Done (every ticket)

1. Only files you **own** are changed (plus new files inside your owned folders).
2. `npm run check` is green.
3. You ran `npm run shot -- <views from your ticket>`, **looked at every image**, fixed what was wrong, and
   the run printed no browser errors.
4. No new dependencies unless allowed by the ticket.
5. Code follows ARCHITECTURE §10; book-driven choices cite pages in comments.
6. One commit (or a few logical ones) on your branch, message prefixed with the ticket id, e.g. `T03: stylised river shader`.
7. Final report (see `docs/AGENT_PLAYBOOK.md` §3) with: summary, files changed, screenshot list with one-line
   notes, known issues, **Requested changes** to files you don't own, and anything you decided that the spec didn't cover.
