# Deep dive 02: Procedural terrain and painterly shading

*How a list of polygons from a book map becomes a hand-painted valley, using the code T01 and T02 wrote in M1.*

There are two halves, matching the two tickets:

1. **Shape** (T01, `src/terrain/gen/`): a grid of heights, computed once on the CPU, in a Web Worker.
2. **Look** (T02, `src/terrain/terrainMaterial.ts` + `shaders/`): a GPU program that colours every pixel of
   that grid, 60 times a second, and changes with the season.

The **Heightfield interface** in `src/terrain/heightfield.ts` sits between them. Neither half knows how the
other works, which is why they could be built at the same time by different agents.

---

## Part 1: Shape

### A heightfield is just a grid of numbers

At high quality, the valley (102 × 66 km, walls included) is sampled every 0.125 km: an 817 × 529 grid of
**432,000 heights**. The mesh is that grid with each cell split into two triangles. Everything else is about
choosing good numbers.

### The layer cake

T01's generator builds each height as a stack of layers (`gen/generate.ts`, header comment):

```
ground = datum(x,z)                 smooth regional base level: plains ~0.15, highlands ~0.9, mountains ~2.5
       + Σ weight_k · relief_k       per-region "texture" of hills: ridged peaks, rolling hills, gentle swells
then:  sea & loch basins → canyon walls → castle sites → river valleys, beds, banks → fix-ups
```

The order matters. Each later stage **overrides** the earlier ones locally: a castle plateau flattens whatever
relief was there, and a river channel cuts through a plateau's edge rather than being buried by it. (That
second case was exactly the M0 bug near Mars Castle.)

### Regions blend through signed distance fields

The layout gives regions as polygons. A sharp polygon edge would make a cliff wherever "highlands" meets
"plains". Instead, for every point we compute its **signed distance** to the polygon border (negative inside,
positive outside) and turn that into a weight with a smooth ramp:

```
w = 1 − smoothstep(−blend, +blend, signedDistance)     // 1 deep inside, 0 far outside, soft in between
```

Mountains get a wide blend, so they produce foothills; the sea gets a narrow one, so the shoreline stays crisp.

### Noise: the raw material of natural shapes

**Gradient noise** gives smooth random hills. One layer is boring, so we stack **octaves**: each one twice as
fine and half as tall. That stack is *fractal Brownian motion (fBm)*, and it looks like terrain because real
terrain also has detail at every scale.

Three tricks turn generic fBm into specific landforms:

| Trick | Formula idea | Gives |
|---|---|---|
| **Ridged noise** | `1 − |noise|` | Sharp crests where noise crosses zero, so mountain ridgelines |
| **Domain warping** | sample `noise(p + noise(p))` | Bends straight features into organic, wandering shapes |
| **Derivative damping** | reduce each octave where the slope (derivative) is already steep | Smooth slopes and detailed flats, which reads as *eroded* without simulating erosion |

The derivative trick is why `gen/noise.ts` returns `dx`/`dz` alongside each sample. That costs a few
multiplications, compared with minutes for a real erosion simulation.

### Design for invariants, not repairs

The cleverest decision in T01 is about rivers. **River profiles follow the datum** (the smooth base level),
not the final noisy ground. Because glen floors are built from the same datum, the water and the valley floor
agree *by construction*. Banks can't end up below the water, because nothing is ever generated there in the first place.

Compare the M0 baseline, which generated the ground first and then carved rivers into it. That is
detect-and-repair, and it failed near Mars Castle. **Make bad states impossible rather than fixing them
afterwards.** It's the same idea as the contract tests in deep dive 01, applied to geometry.

### Speed: 7× faster per sample, then off the main thread

| | Baseline (M0) | T01 |
|---|---|---|
| Grid | 0.25 km (108 k samples) | 0.125 km (432 k samples) |
| Time | ~1.46 s | ~0.8 s |
| Per sample | ~13.5 µs | ~1.9 µs |

How:
- **No allocations in the hot loop.** The baseline built new arrays on every distance query.
- **Bounding-box culling:** skip rivers and regions that are far away.
- **Rasterised distance fields:** compute region distances once on a coarse grid, then sample them bilinearly.

Then the whole job moved into a **Web Worker** (`gen/worker.ts`), so the page stays responsive while the
valley is being "terraformed". Typed arrays are *transferred* to the main thread, not copied, and
`gen/build.ts` rebuilds the `Heightfield` sampling functions around them.

### Baking: the terrain describes itself to the shader

The generator also writes per-vertex hints the GPU can't cheaply work out itself:
- **Splat weights** (`splatA`, `splatB`): how much of each surface type (grass, forest floor, rock, sand,
  marsh, sandstone, canyon stone, moss) is here, from region blends and slope.
- **Ambient occlusion** (`ao`): how much sky each point can see. For a few directions, march along the grid
  and record the highest horizon angle. Deep glens see less sky, so they render darker. That single number is a
  large part of why the highlands now read as 3D.

---

## Part 2: Look

### Don't rebuild lighting: extend it

T02 used `MeshStandardMaterial` with **`onBeforeCompile`**, which edits three.js's own shader source just
before it compiles. Lighting, shadows, fog, tone mapping and colour management stay three.js's, so the terrain
matches every other object in the scene. T02 replaces **only how the base colour is computed**
(`paintTerrain()` in `shaders/terrain.glsl`). This is "extend, don't fork": a small, targeted override
instead of owning a whole lighting model.

### The painterly recipe (per pixel)

1. **Splat blend:** mix the palette colours by the baked weights.
2. **Slope and altitude rules:** steep → rock, very high → high rock, using the world-space normal and height.
3. **Macro variation:** very low-frequency noise (3–8 km) shifts hue and value by a few percent, so big
   fields never look like flat paint.
4. **Brush strokes:** two layers of *stretched* noise at fixed angles, crossed. Stretching makes marks that
   read as strokes. (An earlier version rotated the noise per pixel and produced swirling contour rings,
   which T02 caught in its own screenshots.)
5. **Wet shorelines:** the water mask, blurred outward ~0.45 km on the CPU, darkens a band above the waterline.
6. **Strata:** canyon-wall colour comes from **world height** (`y`) bands, warped by noise. Every rock face
   therefore shows the same geological layers at the same altitude, as real cliffs do.
7. **Wrap lighting:** soften the light falloff so shadows are gentle rather than harsh, the way painters
   simplify light. Baked AO then darkens the crevices.

### Seasons are one number

Every season-aware system reads the same uniform, **`uSeason`** (0 = summer, 1 = winter), animated over 2.5 s
by one driver. The palette is two colour sets mixed by it. The water freezes by it. The sun lowers by it.
One number keeps the whole world in sync.

**Animate the rule, not the picture.** Snow isn't "fade to a white texture". It's a *threshold*:

```
snowLine = mix(2.8, −0.6, uSeason) + noise      // in summer only peaks above 2.8 km; in winter everything
snow     = above snowLine AND slope gentle enough to hold snow
```

As `uSeason` rises the threshold sweeps **down** from the peaks, so winter visibly *arrives*. Steep faces
stay rock because snow can't stick to them, which is what keeps winter readable. Water uses the same idea:
ice grows from the banks inward, because the freeze threshold depends on distance from the centreline.

---

## What M1 taught us about this pipeline

- **Data and look must be reviewed together.** T02 couldn't prove its canyon strata or AO darkening on the
  baseline heightfield, because the data wasn't there yet. Its shader was right; the input was missing. Parallel
  tickets with a data dependency need a merge-and-look step before anyone calls the look "done".
- **Colour shifts under light.** The summer grass hex values looked green as swatches but rendered khaki
  under a warm sun with ACES tone mapping. Judge palette tokens **in the scene**, not as swatches.

## Try this yourself

1. Run `npm run dev` and open `http://localhost:5173/?view=western-mountains&intro=0`. In
   `src/terrain/gen/generate.ts`, find the mountains' relief and halve the ridged amplitude. What happens to the ridgelines?
2. In `src/render/palette.ts`, change `WINTER.terrain.snow` to a light blue. Toggle the season in the app and
   watch the snow line sweep down. Why do the canyon walls keep showing rock?
3. Open `?view=castle-ceres&intro=0&seasonT=0.5` (once round 2 lands) and look at the river: ice from the edges
   in, not a crossfade. Find the line in `src/water/shaders/river.frag.glsl` that makes that happen.
