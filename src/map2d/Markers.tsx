/**
 * The interactive, zoom-aware layer: place markers (focusable buttons) and lettering. Everything here is
 * drawn in screen pixels inside a group scaled by 1/(px per km), so it stays crisp and constant-sized
 * while the map underneath zooms.
 */
import { memo, useMemo, type KeyboardEvent } from 'react';
import { HOUSES } from '../world/houses';
import { LANDMARKS, REGIONS, RIVERS } from '../world/layout';
import { centroid } from '../world/geometry';
import type { HouseId, Landmark, Vec2 } from '../world/types';
import { buildRiver, f2, labelBaseline } from './rivers';

/** North-to-south (then west-to-east) order, which is also the keyboard Tab order. */
export const MARKERS: readonly Landmark[] = [...LANDMARKS].sort(
  (a, b) => a.position[1] - b.position[1] || a.position[0] - b.position[0],
);

const TRI = 'M-13 -28L13 -28L0 0Z';

/**
 * Inner glyph slot of a House marker. T08 (sigils) replaces this with the real sigil; for now it is the
 * House's initial in parchment, centred in the shield. Drawn in marker pixel units around (0, -19).
 */
export function HouseGlyph({ house }: { house: HouseId }) {
  const letter = HOUSES[house].name.replace(/^House\s+/, '').charAt(0);
  return (
    <text className="m2-glyph" x="0" y="-14.2" textAnchor="middle">
      {letter}
    </text>
  );
}

function Shape({ l }: { l: Landmark }) {
  const inferred = l.confidence !== 'canon';
  const house = l.house ? HOUSES[l.house] : null;
  switch (l.kind) {
    case 'castle':
      return (
        <>
          <path className="m2-under" d={TRI} />
          <path className="m2-merlons" d="M-13 -33h5v5h-5ZM-2.5 -33h5v5h-5ZM8 -33h5v5h-5Z" />
          <path className="m2-tri" d={TRI} style={{ fill: house?.colorDeep }} />
          {inferred && <path className="m2-dash" d={TRI} />}
          {l.house && <HouseGlyph house={l.house} />}
        </>
      );
    case 'tower':
      return (
        <>
          <rect className="m2-under" x="-6" y="-12" width="12" height="12" />
          <rect className="m2-tri" x="-5" y="-11" width="10" height="10" style={{ fill: house?.colorDeep }} />
          <path className="m2-merlons" d="M-6 -12v-3h3v3ZM-1.5 -12v-3h3v3ZM3 -12v-3h3v3Z" />
        </>
      );
    case 'fort':
      return (
        <>
          <rect className="m2-under" x="-6.5" y="-13" width="13" height="13" />
          <rect className="m2-plain" x="-5.5" y="-12" width="11" height="11" />
          <path className="m2-merlons" d="M-6.5 -13v-3h3.4v3ZM-1.7 -13v-3h3.4v3ZM3.1 -13v-3h3.4v3Z" />
          {inferred && <rect className="m2-dash ink" x="-5.5" y="-12" width="11" height="11" />}
        </>
      );
    case 'bridge':
      return (
        <>
          <path className="m2-bridge-under" d="M-9 -2H9M-7 -2Q0 -13 7 -2" />
          <path className="m2-bridge" d="M-9 -2H9M-7 -2Q0 -13 7 -2" />
        </>
      );
    case 'olympus':
      return (
        <>
          <circle className="m2-ring-under" cx="0" cy="-10" r="17" />
          <circle className="m2-ring" cx="0" cy="-10" r="17" />
          <path className="m2-citadel" d="M0 -26L3.4 -12L1.7 -12L1.7 4L-1.7 4L-1.7 -12L-3.4 -12Z" />
        </>
      );
  }
}

const LABEL_Y: Record<Landmark['kind'], number> = {
  castle: 16,
  tower: 13,
  fort: 13,
  bridge: 12,
  olympus: 20,
};

/** Labels for small features appear only once zoomed in this many px per km. */
const MINOR_LABEL_SCALE = 26;

interface MarkerProps {
  l: Landmark;
  k: number;
  selected: boolean;
  hovered: boolean;
  showLabel: boolean;
  label: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

const Marker = memo(function Marker({
  l,
  k,
  selected,
  hovered,
  showLabel,
  label,
  onSelect,
  onHover,
}: MarkerProps) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(l.id);
    }
  };
  const cls = `m2-marker m2-k-${l.kind}${selected ? ' is-selected' : ''}${hovered ? ' is-hover' : ''}`;
  const inferred = l.confidence !== 'canon' ? ', inferred position' : '';
  const aria = `${l.name}${inferred}`;
  return (
    <g
      className={cls}
      transform={`translate(${f2(l.position[0])} ${f2(l.position[1])}) scale(${k.toPrecision(4)})`}
      role="button"
      tabIndex={0}
      aria-label={aria}
      aria-pressed={selected}
      onClick={() => onSelect(l.id)}
      onKeyDown={onKey}
      onPointerEnter={(e) => e.pointerType !== 'touch' && onHover(l.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(l.id)}
      onBlur={() => onHover(null)}
    >
      <circle className="m2-hit" cx="0" cy={l.kind === 'castle' ? -14 : -8} r="20" />
      <g className="m2-pin">
        {selected && <circle className="m2-halo" cx="0" cy={l.kind === 'castle' ? -16 : -9} r="27" />}
        <Shape l={l} />
      </g>
      {showLabel && (
        <text className="m2-place" y={LABEL_Y[l.kind]} textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
});

interface RegionLabel {
  id: string;
  text: string;
  at: Vec2;
  px: number;
  rotate: number;
  inferred: boolean;
}

const REGION_STYLE: Record<string, { px: number; rotate?: number; spacing?: number }> = {
  mountains: { px: 21, rotate: -90 },
  forest: { px: 14 },
  highlands: { px: 16 },
  hills: { px: 13 },
  sea: { px: 19 },
};

function buildRegionLabels(): RegionLabel[] {
  return REGIONS.filter((r) => r.labelled).map((r) => {
    const style = REGION_STYLE[r.kind] ?? { px: 14 };
    return {
      id: r.id,
      text: r.name,
      at: r.labelAt ?? centroid(r.polygon),
      px: r.id === 'greatwoods' ? 16 : style.px,
      rotate: style.rotate ?? 0,
      inferred: r.confidence !== 'canon',
    };
  });
}

interface RiverLabel {
  id: string;
  name: string;
  d: string;
  px: number;
  minScale: number;
}

function buildRiverLabels(): RiverLabel[] {
  const out: RiverLabel[] = [];
  for (const r of RIVERS) {
    if (!r.name) continue;
    const shape = buildRiver(r);
    const main = r.id === 'argos';
    out.push({
      id: r.id,
      name: r.name,
      d: labelBaseline(shape, main ? 0.7 : 0.15, main ? 0.88 : 0.85, main ? 0.2 : 0.12),
      px: main ? 16 : 12,
      minScale: main ? 0 : 22,
    });
  }
  return out;
}

const LAKE_LABELS = REGIONS.filter((r) => r.kind === 'lake').map((r) => ({
  id: r.id,
  text: r.name,
  at: centroid(r.polygon),
  inferred: r.confidence !== 'canon',
}));

interface LayerProps {
  /** Pixels per km. */
  scale: number;
  selectedId: string | null;
  hoveredId: string | null;
  labels: boolean;
  inferred: boolean;
  names: Record<string, string>;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export const MapLabels = memo(function MapLabels({
  scale,
  labels,
  inferred,
}: Pick<LayerProps, 'scale' | 'labels' | 'inferred'>) {
  const regions = useMemo(buildRegionLabels, []);
  const rivers = useMemo(buildRiverLabels, []);
  if (!labels) return null;
  const k = 1 / scale;
  return (
    <g className="m2-labels" aria-hidden="true">
      {regions.map((r) => (
        <text
          key={r.id}
          className="m2-region"
          transform={`translate(${f2(r.at[0])} ${f2(r.at[1])}) rotate(${r.rotate}) scale(${k.toPrecision(4)})`}
          style={{ fontSize: r.px }}
          textAnchor="middle"
          dy="0.35em"
        >
          {r.text}
        </text>
      ))}
      {rivers.map(
        (r) =>
          scale >= r.minScale && (
            <g key={r.id}>
              <path id={`m2-river-label-${r.id}`} d={r.d} fill="none" />
              <text className="m2-river-name" style={{ fontSize: r.px * k }}>
                <textPath href={`#m2-river-label-${r.id}`} startOffset="50%" textAnchor="middle">
                  {r.name}
                </textPath>
              </text>
            </g>
          ),
      )}
      {scale >= 30 &&
        LAKE_LABELS.filter((l) => inferred || !l.inferred).map((l) => (
          <text
            key={l.id}
            className="m2-river-name"
            transform={`translate(${f2(l.at[0])} ${f2(l.at[1] + 1.8 + 12 * k)}) scale(${k.toPrecision(4)})`}
            style={{ fontSize: 12 }}
            textAnchor="middle"
          >
            {l.text}
          </text>
        ))}
    </g>
  );
});

export const MarkerLayer = memo(function MarkerLayer({
  scale,
  selectedId,
  hoveredId,
  labels,
  inferred,
  names,
  onSelect,
  onHover,
}: LayerProps) {
  // Markers grow a little as the map zooms in, but never as fast as the map itself.
  const grow = Math.min(1.7, Math.max(1, Math.pow(scale / 13.5, 0.28)));
  const k = grow / scale;
  return (
    <g className="m2-markers">
      {MARKERS.filter((l) => inferred || l.confidence === 'canon').map((l) => {
        const major = l.kind === 'castle' || l.kind === 'olympus';
        return (
          <Marker
            key={l.id}
            l={l}
            k={k}
            selected={selectedId === l.id}
            hovered={hoveredId === l.id}
            showLabel={labels && (major || scale >= MINOR_LABEL_SCALE || selectedId === l.id)}
            label={names[l.id] ?? l.name}
            onSelect={onSelect}
            onHover={onHover}
          />
        );
      })}
    </g>
  );
});

/** Mini variant: plain House-coloured dots, no lettering, nothing focusable. */
export const MiniMarkers = memo(function MiniMarkers({
  selectedId,
  inferred,
}: {
  selectedId: string | null;
  inferred: boolean;
}) {
  return (
    <g className="m2-mini-markers" aria-hidden="true">
      {MARKERS.filter((l) => l.kind !== 'bridge' && (inferred || l.confidence === 'canon')).map((l) => {
        const major = l.kind === 'castle' || l.kind === 'olympus';
        return (
          <circle
            key={l.id}
            cx={l.position[0]}
            cy={l.position[1]}
            r={major ? 1.5 : 0.8}
            className={`m2-dot${selectedId === l.id ? ' is-selected' : ''}`}
            style={{ fill: l.house ? HOUSES[l.house].colorDeep : undefined }}
          />
        );
      })}
    </g>
  );
});
