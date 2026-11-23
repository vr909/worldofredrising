# Architecture — The Institute

## 1. Stack and why

| Choice | Why |
|---|---|
| **TypeScript (strict)** | Contracts between agents are types; the compiler catches drift before review does. |
| **Vite** | Instant dev server, `?raw` GLSL imports, static build for GitHub Pages. |
| **React + React Three Fiber (R3F) + drei** | Each scene system is a component in its own folder, so it can be its own ticket. drei gives CameraControls, Text, Html, Instances. |
| **three.js r187** | The 3D engine underneath; custom `ShaderMaterial`s for the painterly look. |
| **@react-three/postprocessing** | Tilt-shift, bloom, vignette, grading (M4). |
| **zustand** | Tiny global store; the only bridge between UI and scene. |
| **zod** | Validates lore content in tests. |
| **Vitest + Playwright (screenshot tool)** | Unit/contract tests plus visual verification agents can see. |
| **GitHub Actions → GitHub Pages** | Free hosting; each push to `main` deploys. |

Explicitly **not** used: game engines, heavy asset pipelines, downloaded 3D models, texture packs. Everything
is procedural from the layout. That keeps the repo small, avoids licensing questions and lets agents
change things in code.

## 2. Folder map and ownership

Ownership = who may **write** a path. Everyone may read everything. "Lead" = the Opus orchestrator.

| Path | Purpose | Owner |
|---|---|---|
| `src/world/` | **Contracts:** types, layout, houses, geometry helpers | Lead (frozen) |
| `src/render/palette.ts`, `src/render/uniforms.ts` | Design tokens, shared shader uniforms | Lead |
| `src/state/` | Store and URL params | Lead |
| `src/scene/Scene.tsx`, `src/App.tsx`, `src/main.tsx` | Composition root | Lead (merges one-line additions) |
| `src/styles/theme.css` | UI tokens | Lead |
| `src/terrain/heightfield.ts` (internals), `src/terrain/gen/`, `HeightfieldContext.tsx` | Terrain generation | T01 |
| `src/terrain/Terrain.tsx`, `terrainGeometry.ts`, `terrainMaterial.ts`, `shaders/`, `Slab.tsx` | Terrain look | T02 |
| `src/water/` | Rivers, sea, loch, ice | T03 |
| `src/atmosphere/` (except `weather/`) | Sky, light, fog, mist, moons, clouds | T04 |
| `src/landmarks/` (except `olympus/`) | Castle kit and recipes, towers, bridge, fort | T05 |
| `src/landmarks/olympus/` | Olympus | T06 |
| `src/vegetation/` | Forests, groves, orchards, reeds | T07 |
| `src/sigils/` | Sigil SVGs and banners | T08 |
| `src/content/` | Lore | T09 |
| `src/camera/` | Camera rig, shots, intro | T10 |
| `src/ui/` | HUD, placards, index, minimap | T11 |
| `src/labels/` | In-world labels, hover/selection markers | T12 |
| `src/atmosphere/weather/` | Snowfall, season orchestration | T13 |
| `src/post/` | Post-processing | T15 |
| `src/perf/`, `scripts/perf.mjs` | Device detection, adaptive quality, demand rendering | T14 (M2-A also: terrain shaders, MistLayer/Atmosphere, Water for perf flags) |
| `src/map2d/` | Flat 2D map view (and M3 minimap) | T17 |
| `scripts/`, `.github/`, `docs/` (except `docs/learning/`) | Tooling, CI, specs | Lead |

Two tickets never own the same file. If a ticket needs a change in someone else's file, it says so in its
report under **Requested changes**, and the lead does it.

## 3. Coordinates and units

- **1 world unit = 1 display kilometre.** Heights are display km too (already artistically tuned; no global exaggeration).
- **+x east, −z north, +y up.** Origin = valley centre. The default camera looks north.
- Layout points are `[x, z]` pairs (`Vec2`). Angles in the layout are compass degrees (0 = north, clockwise).
- Valley floor: x ∈ [−45, 45], z ∈ [−33, 33]. Canyon walls: 6 km deep strips beyond x = ±45, 6 km tall.
- Sea level = 0. River surfaces are given by `Heightfield.riverSurfaceAt(riverId, u)` (u = 0 source → 1 mouth).
- Olympus floats at `riverSurfaceAt('argos', 0.55) + site.height`.

## 4. Data flow

```
docs/research/institute-canon.md  (human-readable canon, page refs)
            │  (lead translates)
            ▼
src/world/layout.ts + houses.ts ──────────────┐   (frozen contract)
            │                                 │
            ▼                                 ▼
src/terrain/heightfield.ts  ──► Heightfield ──► Terrain · Water · Landmarks · Vegetation · Labels · Camera shots
            (generated once, before Canvas mounts; provided by HeightfieldContext)

src/state/store.ts  ◄──► UI (src/ui)            UI and scene never import each other
        ▲    │
        │    └──► Scene systems (selection, season, layers, camera requests)
        └──────── Scene systems (hover/select on click)

src/render/uniforms.ts (sharedUniforms) ──► every custom shader (time, season 0..1, sun, fog)
src/content/places.ts (PLACES) ──► UI placards, hover cards, index, labels
```

## 5. Contracts (frozen; change only through the lead)

1. **Layout** (`src/world/types.ts`, `layout.ts`, `houses.ts`). Ids are stable forever (they appear in URLs).
2. **Heightfield** interface (`src/terrain/heightfield.ts`): `heightAt`, `normalAt`, `riverSurfaceAt`,
   `regionAt`, `heights`, `surface.{splatA,splatB,ao,water}`, grid fields. Internals are free to change.
3. **Store** (`src/state/store.ts`): `selectedId`, `hoveredId`, `season`, `layers`, `quality`,
   `cameraRequest`, `entered`, `ready`, `viewMode`, `perf` (PerfFlags: T14 writes, systems read), and their actions.
4. **Shared uniforms** (`src/render/uniforms.ts`): `uTime`, `uSeason` (animated 0..1, read this and not the
   store, inside render code), `uSunDirection`, `uSunColor`, `uFogColor`, `uFogDensity`.
5. **Interaction:** any clickable 3D object calls `select(id)` on click and `hover(id)`/`hover(null)` on
   pointer over/out, with `e.stopPropagation()`. The camera moves **only** via `cameraRequest` or user input.
6. **Shots** (`src/camera/shots.ts`): `resolveShot(id, hf)` gives a shot for any place id; `SHOT_OVERRIDES` holds hand-tuned ones.
7. **Content** (`src/content/schema.ts`): `PlaceContent` fields are stable; additions are optional fields only.
8. **Scene composition:** each system exports one top-level component; the lead adds it to `Scene.tsx`.
9. **Ready signal:** the app sets `body[data-ready="true"]` after the heightfield is built and frames have rendered.
   Systems that load asynchronously must not block it for more than 2 s.

## 6. Rendering

- R3F defaults: sRGB output, ACES Filmic tone mapping. Palette hex values are sRGB; `new Color(hex)` converts to linear.
- **Custom shaders:** prefer extending built-in materials via `onBeforeCompile` or write a `ShaderMaterial`
  that ends with `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`, and with
  `fog: true` + `#include <fog_*>` chunks, so it matches the rest of the scene. Put GLSL in
  `*.glsl` files imported with `?raw`. Pass `sharedUniforms` entries by reference.
- **Shadows:** one directional sun. The terrain gets baked AO and sun shadowing from the heightfield (T01/T02);
  realtime shadow maps are for landmarks/trees near the camera only (tight shadow frustum that follows the target).
- **Draw calls:** merge or instance aggressively. A castle should be ≤ 3 draw calls; forests are instanced.
- **Transparency:** mist, clouds and water use depth-tested transparency with sorted render order; avoid many overlapping big transparent planes.

## 7. Performance budgets and quality tiers

| | High | Medium | Low (phones) |
|---|---|---|---|
| Heightfield cell | 0.125 km | 0.2 km | 0.33 km |
| Terrain triangles | ≤ 1.2 M | ≤ 0.5 M | ≤ 0.2 M |
| Tree instances | ≤ 60 k | ≤ 25 k | ≤ 8 k |
| Draw calls | ≤ 250 | ≤ 180 | ≤ 120 |
| Shadows | landmark + trees near target | landmarks only | none (baked only) |
| Post FX | full | no AO | vignette + grade only |
| DPR | [1, 2] | 1 | 1 (0.85 if needed) |
| Target | 55+ fps @1080p laptop | 45+ fps | 30+ fps phone |

Startup: heightfield generation ≤ 2.5 s high / ≤ 1 s medium (Web Worker in T01). JS ≤ 1.5 MB gzipped.

## 8. Verification

- `npm run check` = typecheck + lint + unit tests + production build. **Must be green to merge.**
- **Contract tests** (`src/world/layout.test.ts`, `src/terrain/heightfield.test.ts`, `src/content/content.test.ts`) protect cross-system invariants.
- `npm run shot -- <views>` renders views to `screenshots/*.png` and prints browser errors. Views are any
  place id, `overview`, plus `-winter` variants. **Agents must look at their screenshots before reporting done.**
- `npm run layout:preview` regenerates `docs/images/layout-preview.svg` (the 2D layout map).

## 9. Build and deploy

- `npm run build` → `dist/` (relative base `./`, so it works under `/worldofredrising/`).
- `.github/workflows/ci.yml`: `npm ci && npm run check` on every push and PR.
- `.github/workflows/deploy.yml`: on push to `main`, build and deploy to GitHub Pages.
- Branching: the lead integrates on the session branch; tickets run on their own worktree branches; milestones
  merge to `main` (which deploys).

## 10. Conventions

- TypeScript strict; no `any` (use `unknown` + narrowing); no non-null `!` on values that can really be missing.
- Pure logic (geometry, generation, layout maths) lives in `.ts` files without React/three imports where
  possible, and gets unit tests.
- Components: one exported system component per folder; memoise geometry/materials with `useMemo`;
  dispose what you create when inputs change; no per-frame allocations in `useFrame`.
- Comments explain *why* (and cite canon pages for book-driven choices).
- **No new npm dependencies** unless the ticket lists them as allowed.
- No network assets: everything procedural or authored as code/SVG in the repo.
