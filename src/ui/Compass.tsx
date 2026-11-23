/**
 * Compass rose. Rotates with the camera (CameraRig writes --cam-heading), so "N" always points to the
 * valley's north (the North Woods; -z in world space). Click to turn the view north-up.
 * The book uses cardinal directions throughout, and the Mars supply cache even holds a compass (p.183).
 */
import { useStore } from '../state/store';

export function Compass() {
  const flyTo = useStore((s) => s.flyTo);
  return (
    <button
      className="hud-compass"
      onClick={() => flyTo('north-up')}
      aria-label="Compass: turn the view north-up"
      title="North up"
    >
      <svg viewBox="-50 -50 100 100" aria-hidden="true">
        <g className="hud-compass-rose">
          <circle r="46" className="ring" />
          <path d="M0 -38 L7 0 L0 6 L-7 0 Z" className="needle-n" />
          <path d="M0 38 L7 0 L0 -6 L-7 0 Z" className="needle-s" />
          <path d="M-30 0 L0 4 L30 0 L0 -4 Z" className="needle-ew" />
          <text y="-22" className="cardinal n">
            N
          </text>
          <text y="31" className="cardinal">
            S
          </text>
          <text x="27" y="4" className="cardinal">
            E
          </text>
          <text x="-27" y="4" className="cardinal">
            W
          </text>
        </g>
      </svg>
    </button>
  );
}
