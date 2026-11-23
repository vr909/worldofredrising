# CLAUDE.md — rules for every agent working in this repo

World of Red Rising: explorable 3D worlds from Pierce Brown's *Red Rising*. World #1 is **the Institute**:
a painterly, interactive 3D diorama of the valley, built with Vite + React Three Fiber + TypeScript.

## Read first
1. `docs/PRODUCT.md` (what and why) · 2. `docs/ARCHITECTURE.md` (how, ownership, contracts) ·
3. `docs/DESIGN.md` (look and feel) · 4. `docs/TASKS.md` (your ticket + Definition of Done) ·
5. `docs/research/institute-canon.md` (what the book says, with pages).

## Non-negotiables
- **Only edit files your ticket Owns** (ARCHITECTURE §2). Need something else changed? Put it under
  "Requested changes" in your report.
- **Never change frozen contracts:** `src/world/*`, the `Heightfield` interface, `src/state/store.ts`,
  `src/render/uniforms.ts`, `src/content/schema.ts` existing fields. Never weaken a test.
- **Canon first.** Book-driven choices cite the PDF page in a comment. Inventions must not contradict
  canon and must be labelled `invented`/`inferred` where users see them.
- **Copyright:** never commit the book PDF, scans or traced artwork. Quotes ≤ 25 words with a page.
  Sigils are original designs.
- **No new dependencies** unless your ticket allows them. No network assets; everything is procedural or in-repo.
- **Verify visually:** after any visual change run `npm run shot -- <views>` and open every PNG with the Read
  tool before saying you're done. Browser errors = not done.
- `npm run check` must be green before you report.

## Commands
```
npm ci                     # install
npm run dev                # dev server
npm run format             # prettier (check fails on unformatted code)
npm run check              # format check + typecheck + lint + test + build (must pass)
npm run shot -- overview castle-mars overview-winter   # screenshots → screenshots/*.png
npm run layout:preview     # 2D map of the layout → docs/images/layout-preview.svg
```
Views for `shot`: `overview`, any place id from `src/world/layout.ts`, and `<view>-winter`.

## Conventions
TypeScript strict, no `any`. World units = display km; +x east, −z north. Pure logic in `.ts` with tests.
GLSL in `.glsl` files imported with `?raw`; custom materials include fog, tonemapping and colorspace chunks.
Memoise geometry/materials; no allocations inside `useFrame`. Commit messages start with your ticket id.
