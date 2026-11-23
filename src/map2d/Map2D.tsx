/**
 * STUB — the flat 2D map view. Owned by T17 (docs/TASKS.md), which replaces this whole folder's
 * contents. Contract: export `Map2D` (full-screen view, mounted by App when viewMode === '2d');
 * clicking a place calls store.select(id); it must set the ready signal itself (no WebGL here).
 */
import { useEffect } from 'react';
import { useStore } from '../state/store';

export function Map2D() {
  const setReady = useStore((s) => s.setReady);
  useEffect(() => {
    setReady();
    document.body.dataset.ready = 'true';
  }, [setReady]);
  return (
    <div className="map2d-stub" role="img" aria-label="2D map (coming soon)">
      <p>2D map: coming in M2 (T17)</p>
    </div>
  );
}
