/**
 * Small HUD notice for poor-performance situations (T14): software rendering detected, or a device measured as too slow.
 * Renders nothing otherwise. Offers the 2D map via store.setViewMode('2d'); dismissal is remembered per session.
 */
import { useStore } from '../state/store';
import { dismissPerfNotice, usePerfStatus } from './status';
import './perf.css';

const COPY = {
  software:
    'Your browser is drawing 3D without the graphics card. Turn on hardware acceleration in Chrome settings, or use the 2D map.',
  slow: 'This device is drawing the 3D view slowly, so detail is reduced. The 2D map is much lighter.',
} as const;

export function PerfNotice() {
  const { reason, dismissed } = usePerfStatus();
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  if (!reason || dismissed || viewMode !== '3d') return null;
  return (
    <div className="perf-notice" role="status">
      <p>{COPY[reason]}</p>
      <button
        type="button"
        className="perf-notice-go"
        onClick={() => {
          dismissPerfNotice();
          setViewMode('2d');
        }}
      >
        Use 2D map
      </button>
      <button type="button" className="perf-notice-x" aria-label="Dismiss" onClick={dismissPerfNotice}>
        ×
      </button>
    </div>
  );
}
