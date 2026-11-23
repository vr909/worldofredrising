# Design Brief — The Institute

> **In one line:** a green, misty, terraformed valley cradled by red Martian stone, lit at golden hour and
> presented like a museum diorama you lean over.

Agents: this file is the art director. If a choice isn't covered here, pick the option that best serves
the five principles, and say what you chose in your report.

---

## 1. Principles

1. **The book is the art director.** Every canon detail (80 m cliffs, the square keep in the NW wall, the
   marble-sword citadel) must be visible. Inventions must not contradict canon and are flagged.
2. **Legibility over literalism.** Landmarks are about **4× true scale**. Silhouettes must read at overview distance.
3. **Museum diorama.** A finished slab with strata-cut sides on a dark table, soft tilt-shift focus,
   placards for text. Nothing looks like a game HUD.
4. **Calm, then wonder.** Quiet UI with restrained colour; motion only to explain or reveal.
5. **One palette, two seasons.** Summer and winter are two states of one design, not two designs.

## 2. Art direction

**Mood references (verbal, no copying):** tabletop war-game terrain and museum relief models; golden-hour
landscape painting with warm light and cool shadows; soft stylised greens of hand-painted animation backgrounds;
the engraved typography of antique maps.

**What makes it *Red Rising* and not generic fantasy:**
- **Green inside red.** The valley is lush and terraformed; the 6 km canyon walls around it are raw
  Martian rock in rust and ochre strata. This contrast is the signature image.
- **Mars details.** Two small moons (Phobos, Deimos) in the sky. A slightly blue-violet zenith.
  At .37g, built and grown things are a touch **taller and slimmer** (slender towers, tall thin conifers;
  the book's deerling are "thinner and faster").
- **Roman pretension.** Gold-society architecture leans classical: columns, marble, colonnades on Olympus;
  military Roman for House castles. Typography is Roman capitals.
- **Mist.** The highlands are almost always misty; mist pools in glens and gulches and burns off the plains.

**Stylisation level:** painterly-stylised, not low-poly-cartoon and not photoreal. Soft forms, simplified
textures, rich colour gradients, readable silhouettes, gentle procedural brush noise. Avoid hard black
outlines, pure saturated primaries, glossy plastic materials and visible tiling.

## 3. Colour system

Source of truth in code: `src/render/palette.ts` (scene), `src/world/houses.ts` (Houses),
`src/styles/theme.css` (UI). Change values there and here together.

### Scene — summer (golden hour)
| Token | Hex | Use |
|---|---|---|
| skyZenith / skyHorizon | `#6F8FB0` / `#EBCDA3` | Sky gradient; horizon matches fog |
| sun | `#FFD9A3` | Key light, azimuth 235° (SW), elevation 24° |
| fog | `#DCCBB0` | Warm aerial perspective |
| grass / meadow | `#86A35A` / `#A2AC66` | Plains, glens (greener after M1 review: the warm sun + ACES pushed them to khaki) |
| forestFloor | `#4F6B3F` | Under trees |
| highlandMoss | `#71894F` | Highlands |
| rock / highRock | `#8A7E70` / `#A39A8E` | Slopes > ~35°, peaks |
| sandstone | `#C9A877` | Postern Hills, Minerva |
| sand / marsh | `#D8C79A` / `#7C8A62` | Shores / marshes |
| canyon strata | `#6E3F2A → #C49A74` (6 bands) | Canyon walls, slab sides |
| water deep / shallow / foam | `#2F5F7A` / `#5E9AA8` / `#E8F1EE` | |

### Scene — winter
Paler and cooler: sky `#8DA3BA → #E4E1DA`, fog `#D9DFE4`, sun `#FFF0DA` (lower intensity). Snow `#F7F8F8`
covers all ground with slope below ~40°; rock faces and canyon walls stay visible with snow on their ledges.
Rivers and the loch freeze to `#CFE3EA` ice; the sea keeps open water with ice along the shore.

### Houses
Each House has `color` (banners, roofs, UI chips) and `colorDeep` (trim, text on parchment). The 13 colours
are distinct in hue **and** value so they work for colour-blind users; never rely on colour alone (always
pair it with the sigil or a name).

### UI
Ink `#1B1A17`, parchment `#F1E9D6`, gold `#C8A24A`, blood `#9B2226` (Mars/Darrow accents only), glass
`rgba(27,26,23,.72)` with a gold hairline. Confidence badges: canon `#2F6B4F`, inferred `#8A6A1E`, invented `#6B2F5B`.

## 4. Scale and composition

- Units: display km. Valley 90 × 66, walls 6 high, Olympus about 2.6 above the Argos.
- **Landmark exaggeration ×4** (already included in `site.radius`). A castle is about 1–3 km across in world units.
- Camera FOV **35°** (a narrow lens flattens perspective the way you see a model on a table).
- **Overview composition:** looking north from above the South Sea. The canyon walls frame left and right,
  the Argos leads the eye from the sea to the North Woods, Olympus sits just left of centre, the highlands
  top-right. Hold the rule of thirds: horizon/wall-tops around the upper third.
- **Hero shots:** low (20–30° elevation), from in front of the main gate, castle on a third line, landscape behind.

## 5. Terrain and materials recipe

**Terrain shader (T02):**
1. Base colour = splat blend of the palette (grass/meadow/forest/rock/sand/marsh/sandstone/moss), with
   low-frequency colour variation (±6% hue/value macro noise at around 3–8 km) so fields don't look flat.
2. Slope rock: blend to rock above ~32° slope, highRock above 2.4 km.
3. Snow: summer snowline about 2.8 km with noisy edge; winter (uSeason → 1) snow everywhere slope < 40°.
   Ledges keep snow. Transition sweeps down from the peaks, never a global crossfade.
4. Lighting: wrap/half-Lambert diffuse (soft, painterly), warm key light, cool hemisphere fill, baked AO
   from `surface.ao`, gentle rim brightening on ridges facing the sun.
5. Painterly touch: subtle procedural brush/stroke noise modulating value (±4%) at around 0.3 km.
   No texture tiling visible from any distance.
6. Canyon walls: horizontal strata bands (CANYON_STRATA) perturbed by noise, darker crevices, warm highlights.
7. Water-adjacent ground darkens and smooths (wet shoreline) using `surface.water` proximity.
8. Fog: exponential-squared, coloured by uFogColor; slightly height-dependent (thicker low in valleys).

**Diorama slab:** the terrain's edges drop straight down to `-slabDepth` showing a strata cross-section
(same bands as the canyon, with a soil layer on top), sitting on a dark matte "table" plane with a soft
contact shadow. The sea's cut face shows a layer of water (lighter blue) above the strata.

**Architecture materials:** stone tinted per region (grey granite for highlands, sandstone for Minerva,
dark basalt for Jupiter and Vulcan, white marble for Olympus), roofs and banners in House colour, soft AO,
painterly value noise. Snow on roofs and crenellations in winter.

**Foliage:** clustered, slender silhouettes; per-instance hue/value jitter; slight wind sway; conifers
dark and cool, broadleaf warmer, olive silver-green. In winter conifers get snow caps and broadleaf trees go bare.

## 6. UI layout

```
Desktop (≥ 900px)
┌──────────────────────────────────────────────────────────────────────────┐
│ WORLD OF RED RISING                                    [⌕ Places] [≡]    │
│ THE INSTITUTE                                       ┌──────────────────┐ │
│                                                     │ ▼ sigil  MARS    │ │
│                                                     │ Seat of House…   │ │
│                 (3D diorama, full bleed)            │ [CANON]          │ │
│                                                     │ description…     │ │
│                                                     │ Facts · Events   │ │
│ ┌────────┐                                          │ Sources · Next → │ │
│ │minimap │              ( Summer | Winter )         └──────────────────┘ │
│ └────────┘                                                               │
└──────────────────────────────────────────────────────────────────────────┘
Mobile (< 900px): title shrinks to one line; placard becomes a bottom sheet (peek 35% → full);
minimap hidden behind the ≡ menu; season switch above the sheet.
```

## 7. Components

- **Placard (lore panel):** parchment card, 380–420 px wide. Header band in the House colour with the sigil on
  the left, title in Cinzel caps, subtitle in italic Garamond, confidence badge. Body: description paragraphs;
  facts as a two-column table with gold hairlines; events as a vertical timeline with season chips
  (☀ Summer, ❄ Winter, ≋ Thaw); quotes as a pull-quote with page number; "Why here?" box for inferred
  places; footer listing "Sources: pp. 164, 166…" and "Visit next" related links.
- **Hover card:** a small glass tooltip near the cursor with sigil, name and summary.
- **Season switch:** a pill segmented control; the active segment is gold. Switching animates the world over 2.5 s.
- **Place index:** ⌕ opens a searchable list grouped as Houses / Landmarks / Regions / Rivers. Enter flies there.
- **Minimap:** a stylised 2D painted map (generated from the layout) with House triangles, the camera's view
  footprint, click to fly; a small inset of Mars showing where the valley sits.
- **Entry gate:** title, one line of context, a spoiler note ("Best after you've finished *Red Rising*"),
  an "Enter the valley" button. Then the intro flight.
- **About:** what is canon vs inferred, the 4× scale note, credits, fan-project disclaimer.

## 8. Typography

- **Display:** Cinzel 500/700, uppercase, tracking 0.12–0.32em. Titles, labels, buttons.
- **Body:** EB Garamond 400/600 + italic, 17 px / 1.5 on desktop, 16 px on mobile.
- **In-world labels:** Cinzel, tracking 0.3em, parchment fill with a soft ink halo. Region names large and
  laid flat on the land like a printed map; castle names smaller, upright, with a sigil chip.
- Scale: 12 (kicker) · 14 (UI) · 17 (body) · 22 (placard title) · 34 (app title).

## 9. Motion

- UI: 280 ms `cubic-bezier(.22,.61,.36,1)`; panels slide 16 px and fade.
- Camera fly-to: 1.2–3.0 s based on distance; ease-in-out; long flights arc upward so you see the land pass.
- Intro: about 7 s from high over the South Sea to the overview. Any input skips it.
- Season: 2.5 s; snow sweeps downhill; snowfall fades in.
- Ambient: mist drifts, water flows, banners wave, trees sway. Everything slow.
- **Reduced motion:** cuts instead of flights, no ambient camera motion, season changes instantly.

## 10. Accessibility

Keyboard: Tab through UI, `/` opens the index, Esc closes or deselects, arrows/WASD pan, +/− zoom.
Visible focus rings (gold). Text contrast ≥ 4.5:1. Every 3D-only affordance has a UI equivalent: the place
index lists everything, and placards are fully readable as HTML. If WebGL is missing, show the minimap and index.

## 11. Sigils

Device: a **downward-pointing triangle** (the House shield), solid `colorDeep`, with a single-colour
parchment glyph inside. 64-unit grid, filled silhouettes (no strokes), readable at 16 px. Briefs are in
`src/world/houses.ts` → `sigil`. **Original designs.** Take inspiration from the subject, but never trace the book's art.

## 12. Screenshot review checklist (used at every milestone gate)

- [ ] Overview: valley reads instantly; walls frame it; Argos leads the eye; no muddy haze; horizon clean.
- [ ] Red-and-green contrast present; palette matches tokens; no pure black and no oversaturation.
- [ ] Mars hero: cliffs, keep in NW wall, west gate, Metas just south, bridge visible.
- [ ] Olympus: floats with clear air underneath; marble sword silhouette; snow; cloud collar.
- [ ] Winter: snow logic believable (rock shows, ledges white), rivers frozen, mood cold but still beautiful.
- [ ] No z-fighting, floating objects, seams, popping, tiling or aliasing shimmer.
- [ ] Text crisp; UI aligned to 8 px grid; nothing overlaps.
