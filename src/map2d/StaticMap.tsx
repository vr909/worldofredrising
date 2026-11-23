/**
 * The unchanging engraved drawing: parchment, ground tints, water, terrain glyphs, rivers, canyon walls
 * and the border. Memoised, so panning and zooming (which only change the viewBox) never re-render it.
 * Colours come from CSS variables on .map2d (see map2d.css), which also drive the winter palette.
 */
import { memo } from 'react';
import { BOUNDS, REGIONS } from '../world/layout';
import { f2 } from './rivers';
import { getMapData } from './mapData';

/** Glyph drawings in unit space: x in [-0.5, 0.5], base at y = 0, height up to -1. */
function GlyphDefs({ uid }: { uid: string }) {
  return (
    <>
      <g id={`${uid}-peak-0`}>
        <path className="m2-peak" d="M-0.5 0L-0.2 -0.46L-0.1 -0.4L0.02 -1L0.15 -0.58L0.26 -0.66L0.5 0Z" />
        <path className="m2-shade" d="M0.02 -1L0.15 -0.58L0.26 -0.66L0.5 0L0.06 0Z" />
        <path
          className="m2-hatch"
          d="M0.09 -0.62L0.2 -0.36M0.17 -0.52L0.32 -0.26M0.22 -0.36L0.38 -0.1M-0.3 -0.2L-0.18 -0.1"
        />
      </g>
      <g id={`${uid}-peak-1`}>
        <path className="m2-peak" d="M-0.5 0L-0.16 -0.62L-0.06 -0.52L0.08 -1L0.2 -0.66L0.3 -0.72L0.5 0Z" />
        <path className="m2-shade" d="M0.08 -1L0.2 -0.66L0.3 -0.72L0.5 0L0.08 0Z" />
        <path
          className="m2-hatch"
          d="M0.12 -0.66L0.22 -0.4M0.2 -0.5L0.34 -0.24M0.26 -0.34L0.4 -0.1M-0.32 -0.24L-0.2 -0.12"
        />
      </g>
      <g id={`${uid}-conifer-0`}>
        <path
          className="m2-tree"
          d="M0 -1L-0.27 -0.58L-0.13 -0.58L-0.4 -0.2L-0.07 -0.2L-0.07 0L0.07 0L0.07 -0.2L0.4 -0.2L0.13 -0.58L0.27 -0.58Z"
        />
        <path className="m2-shade" d="M0 -1L0.27 -0.58L0.13 -0.58L0.4 -0.2L0.07 -0.2L0 -0.2Z" />
      </g>
      <g id={`${uid}-broadleaf-0`}>
        <path className="m2-trunk" d="M0 0L0 -0.36" />
        <ellipse className="m2-tree" cx="0" cy="-0.64" rx="0.4" ry="0.36" />
        <path className="m2-hatch" d="M0.06 -0.9Q0.34 -0.8 0.3 -0.52M-0.04 -0.84Q0.2 -0.76 0.2 -0.56" />
      </g>
      <g id={`${uid}-broadleaf-1`}>
        <path className="m2-trunk" d="M0 0L0 -0.3" />
        <path
          className="m2-tree"
          d="M-0.38 -0.5Q-0.46 -0.72 -0.22 -0.78Q-0.16 -1 0.06 -0.96Q0.3 -1 0.34 -0.78Q0.5 -0.62 0.34 -0.48Q0.2 -0.36 0 -0.4Q-0.24 -0.34 -0.38 -0.5Z"
        />
        <path className="m2-hatch" d="M0.08 -0.88Q0.34 -0.8 0.3 -0.58M-0.02 -0.8Q0.2 -0.72 0.2 -0.54" />
      </g>
      <g id={`${uid}-hill-0`}>
        <path className="m2-hill" d="M-0.5 0C-0.42 -0.72 0.42 -0.72 0.5 0" />
        <path className="m2-hatch" d="M0.1 -0.56L0.2 -0.3M0.2 -0.52L0.32 -0.24M-0.22 -0.5L-0.14 -0.3" />
      </g>
      <g id={`${uid}-crag-0`}>
        <path className="m2-peak" d="M-0.5 0L-0.3 -0.5L-0.14 -0.32L0.04 -1L0.22 -0.5L0.34 -0.62L0.5 0Z" />
        <path className="m2-shade" d="M0.04 -1L0.22 -0.5L0.34 -0.62L0.5 0L0.1 0Z" />
      </g>
      <g id={`${uid}-rise-0`}>
        <path className="m2-hill" d="M-0.5 0Q0 -1.1 0.5 0" />
        <path className="m2-hill soft" d="M-0.28 -0.04Q0.02 -0.55 0.3 -0.04" />
      </g>
      <g id={`${uid}-tuft-0`}>
        <path
          className="m2-tuft"
          d="M-0.5 0H0.5M-0.2 0L-0.32 -0.7M0 0L0 -1M0.2 0L0.34 -0.66M-0.08 0L-0.14 -0.55M0.1 0L0.16 -0.5"
        />
      </g>
    </>
  );
}

const seaIds = (uid: string) => ({
  clip: `${uid}-clip-sea`,
  wave: `${uid}-waves`,
  hatch: `${uid}-hatch-wall`,
});

export const StaticMap = memo(function StaticMap({ uid }: { uid: string }) {
  const data = getMapData();
  const ids = seaIds(uid);
  const sea = REGIONS.find((r) => r.kind === 'sea')!;
  const water = REGIONS.filter((r) => r.kind === 'sea' || r.kind === 'lake');
  const { frame } = data;
  const clipId = `${uid}-clip-map`;
  return (
    <g>
      <defs>
        <GlyphDefs uid={uid} />
        <radialGradient id={`${uid}-ground`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0" className="m2-ground-a" />
          <stop offset="1" className="m2-ground-b" />
        </radialGradient>
        <pattern id={ids.wave} width="1.6" height="1" patternUnits="userSpaceOnUse">
          <path
            className="m2-wave"
            d="M0 0.3q0.2 -0.17 0.4 0t0.4 0t0.4 0t0.4 0M-0.4 0.8q0.2 -0.17 0.4 0t0.4 0t0.4 0t0.4 0t0.4 0"
          />
        </pattern>
        <pattern
          id={ids.hatch}
          width="0.42"
          height="0.42"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(32)"
        >
          <path className="m2-wallhatch" d="M0 0V0.42" />
        </pattern>
        <clipPath id={ids.clip}>
          <path d={data.regionPaths[sea.id]} />
        </clipPath>
        <clipPath id={clipId}>
          <rect x={frame.x} y={frame.z} width={frame.w} height={frame.h} />
        </clipPath>
        {water
          .filter((r) => r.kind === 'lake')
          .map((r) => (
            <clipPath key={r.id} id={`${uid}-clip-${r.id}`}>
              <path d={data.regionPaths[r.id]} />
            </clipPath>
          ))}
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x={frame.x} y={frame.z} width={frame.w} height={frame.h} fill={`url(#${uid}-ground)`} />

        {/* Ground tints per region: barely there, they only separate one country from the next. */}
        {REGIONS.filter((r) => r.kind !== 'sea' && r.kind !== 'lake').map((r) => (
          <path key={r.id} className={`m2-tint m2-tint-${r.kind}`} d={data.regionPaths[r.id]} />
        ))}

        {/* Water: tint, wave hatching, engraved shore-lining. */}
        {water.map((r) => (
          <g key={r.id} className={`m2-water m2-${r.kind}`} data-region={r.id}>
            <path className="m2-water-fill" d={data.regionPaths[r.id]} />
            {r.kind === 'sea' && <path d={data.regionPaths[r.id]} fill={`url(#${ids.wave})`} />}
            <g clipPath={`url(#${uid}-clip-${r.kind === 'sea' ? 'sea' : r.id})`}>
              <path className="m2-lining wide" d={data.regionPaths[r.id]} />
              <path className="m2-lining" d={data.regionPaths[r.id]} />
            </g>
            <path className="m2-shore" d={data.regionPaths[r.id]} />
          </g>
        ))}
        <path className="m2-marsh-edge" d={data.regionPaths['southern-marshes']} />

        {/* Terrain glyphs, back to front within each region. */}
        <g className="m2-glyphs">
          {data.glyphs.map((g, i) => (
            <use
              key={i}
              href={`#${uid}-${g.kind}-${g.v}`}
              transform={`translate(${f2(g.x)} ${f2(g.z)}) scale(${f2(g.w)} ${f2(g.h)})`}
              className={`m2-g m2-g-${g.kind}`}
            />
          ))}
        </g>

        {/* Rivers: filled outline plus ink banks. */}
        <g className="m2-rivers">
          {data.rivers.map(({ shape, fill, left, right }) => (
            <g key={shape.id} data-river={shape.id}>
              <path className="m2-river-fill" d={fill} />
              <path className="m2-river-bank" d={left} />
              <path className="m2-river-bank" d={right} />
            </g>
          ))}
        </g>

        {/* Compass rose in the empty south-east corner of the plains; north is up. */}
        <g className="m2-rose" transform="translate(33 26.5)">
          <circle r="3.6" className="m2-rose-ring" />
          <circle r="2.7" className="m2-rose-ring thin" />
          <path
            className="m2-rose-s"
            d="M0 4.6L0.75 0L-0.75 0ZM-4.6 0L0 -0.75L0 0.75ZM4.6 0L0 -0.75L0 0.75Z"
          />
          <path className="m2-rose-n" d="M0 -4.6L0.75 0L-0.75 0Z" />
          <text className="m2-rose-text" y="-5.4" textAnchor="middle">
            N
          </text>
        </g>

        {/* Canyon walls: banded strata, hatching, a ragged cliff edge and a vertical caption. */}
        <g className="m2-walls">
          {data.wallBands.map((b, i) => (
            <path key={i} d={b.d} fill={b.fill} className="m2-wall-band" />
          ))}
          {data.wallOutlines.map((d, i) => (
            <path key={i} d={d} fill={`url(#${ids.hatch})`} />
          ))}
          {data.cliffEdges.map((d, i) => (
            <path key={i} d={d} className="m2-cliff" />
          ))}
          <text className="m2-wall-text" transform={`translate(${BOUNDS.minX - 3} 0) rotate(-90)`}>
            Canyon Wall
          </text>
          <text className="m2-wall-text" transform={`translate(${BOUNDS.maxX + 3} 0) rotate(90)`}>
            Canyon Wall
          </text>
        </g>
      </g>

      {/* Border frame with graduated blocks. */}
      <g className="m2-frame">
        <rect x={frame.x} y={frame.z} width={frame.w} height={frame.h} className="m2-frame-line" />
        {data.frameTicks.map((d, i) => (
          <path key={i} d={d} className="m2-frame-tick" />
        ))}
        <rect
          x={frame.x - 0.7}
          y={frame.z - 0.7}
          width={frame.w + 1.4}
          height={frame.h + 1.4}
          className="m2-frame-line"
        />
      </g>
    </g>
  );
});
