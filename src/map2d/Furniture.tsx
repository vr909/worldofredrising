/**
 * Map furniture: the cartouche (Mars inset, scale bar, legend), the zoom buttons and the hover tooltip.
 * Plain HTML/SVG over the map, in screen space.
 */
import type { PlaceContent } from '../content/schema';

const NICE_KM = [1, 2, 5, 10, 20, 50];

/** Largest "nice" length (km) whose bar stays within maxPx at this scale. */
export function niceScaleKm(pxPerKm: number, maxPx = 150): number {
  let best = NICE_KM[0]!;
  for (const km of NICE_KM) if (km * pxPerKm <= maxPx) best = km;
  return best;
}

export function ScaleBar({ scale }: { scale: number }) {
  const km = niceScaleKm(scale);
  const px = Math.max(8, km * scale);
  return (
    <svg
      className="m2-scalebar"
      width={px + 28}
      height="26"
      role="img"
      aria-label={`Scale bar: ${km} kilometres`}
    >
      <g transform="translate(4 8)">
        <rect className="m2-sb-a" x="0" y="0" width={px / 2} height="5" />
        <rect className="m2-sb-b" x={px / 2} y="0" width={px / 2} height="5" />
        <path className="m2-sb-tick" d={`M0 -3V8M${px / 2} -1V8M${px} -3V8`} />
        <text className="m2-sb-text" x="0" y="19" textAnchor="middle">
          0
        </text>
        <text className="m2-sb-text" x={px} y="19" textAnchor="middle">
          {km} km
        </text>
      </g>
    </svg>
  );
}

/**
 * Where the valley sits on Mars: "the southernmost part of the Valles Marineris" (canon p.164). A stylised
 * disc, our own drawing; the pin is only roughly placed, so it is not a survey position.
 */
export function MarsInset() {
  return (
    <svg
      className="m2-inset"
      viewBox="-44 -38 88 98"
      role="img"
      aria-label="Inset: the valley lies in the southern Valles Marineris on Mars"
    >
      <defs>
        <radialGradient id="m2-mars" cx="0.38" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#C77A4C" />
          <stop offset="1" stopColor="#8C3B22" />
        </radialGradient>
        <clipPath id="m2-mars-clip">
          <circle r="36" />
        </clipPath>
      </defs>
      <circle r="36" fill="url(#m2-mars)" />
      <g clipPath="url(#m2-mars-clip)">
        <path className="m2-inset-cap" d="M-22 -36Q0 -26 22 -36Z" />
        <path className="m2-inset-dark" d="M-30 -4Q-18 -12 -6 -6Q8 0 16 2Q26 3 34 -2" />
        <path className="m2-inset-dark thin" d="M-24 4Q-12 -2 -2 2M4 -12Q12 -16 22 -14M-12 14Q0 20 14 14" />
        <path className="m2-inset-dark thin" d="M-6 -6Q-2 6 2 14" />
      </g>
      <circle r="36" className="m2-inset-rim" />
      <circle className="m2-inset-pin" cx="2" cy="12" r="3.2" />

      <text className="m2-inset-text" x="2" y="56" textAnchor="middle">
        The Institute
      </text>
    </svg>
  );
}

export function Legend() {
  return (
    <ul className="m2-legend" aria-label="Legend">
      <li>
        <svg width="18" height="16" viewBox="-10 -17 20 20" aria-hidden="true">
          <path className="m2-under" d="M-9 -12L9 -12L0 0Z" />
          <path className="m2-tri" d="M-9 -12L9 -12L0 0Z" style={{ fill: '#5E1714' }} />
        </svg>
        House seat
      </li>
      <li>
        <svg width="18" height="16" viewBox="-10 -17 20 20" aria-hidden="true">
          <path className="m2-under" d="M-9 -12L9 -12L0 0Z" />
          <path className="m2-tri" d="M-9 -12L9 -12L0 0Z" style={{ fill: '#5E1714' }} />
          <path className="m2-dash" d="M-9 -12L9 -12L0 0Z" />
        </svg>
        Position inferred
      </li>
    </ul>
  );
}

interface ControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ControlsProps) {
  return (
    <div className="m2-zoom" role="group" aria-label="Map zoom">
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
        +
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
        &minus;
      </button>
      <button type="button" onClick={onReset} aria-label="Show whole valley" title="Show whole valley">
        <svg viewBox="-8 -8 16 16" width="16" height="16" aria-hidden="true">
          <path
            d="M-6 -2V-6H-2M2 -6H6V-2M6 2V6H2M-2 6H-6V2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      </button>
    </div>
  );
}

export function Tooltip({
  x,
  y,
  place,
  title,
  inferred,
}: {
  x: number;
  y: number;
  place: PlaceContent | undefined;
  title: string;
  inferred: boolean;
}) {
  return (
    <div className="m2-tip" style={{ left: x, top: y }} role="tooltip">
      <strong>{place?.title ?? title}</strong>
      {place?.subtitle && <em>{place.subtitle}</em>}
      {place?.summary && <p>{place.summary}</p>}
      {(inferred || place?.confidence === 'inferred') && (
        <span className="m2-tip-badge">inferred position</span>
      )}
    </div>
  );
}
