import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Map2D } from './map2d/Map2D';
import { PerfManager } from './perf/PerfManager';
import { PerfReadout } from './perf/PerfReadout';
import { Scene } from './scene/Scene';
import { START_PARAMS, useStore } from './state/store';
import { HeightfieldProvider } from './terrain/HeightfieldContext';
import { Hud } from './ui/Hud';

export function App() {
  const quality = useStore((s) => s.quality);
  const viewMode = useStore((s) => s.viewMode);
  const dpr = useStore((s) => s.perf.dpr);
  const frameloop = useStore((s) => s.perf.frameloop);
  const is3d = viewMode === '3d';
  return (
    <>
      {/* The heightfield keeps generating in its worker even in 2D, so switching to 3D is quick.
          In 2D the Canvas is not mounted at all: no WebGL work on machines that can't afford it. */}
      <HeightfieldProvider
        quality={quality}
        fallback={is3d ? <div className="loading">Terraforming the valley…</div> : null}
      >
        {is3d && (
          <Canvas
            shadows="percentage"
            dpr={dpr}
            frameloop={frameloop}
            camera={{ fov: 35, near: 0.05, far: 600, position: [0, 62, 88] }}
            gl={{ antialias: true, preserveDrawingBuffer: true }}
            onPointerMissed={() => useStore.getState().hover(null)}
          >
            <Scene />
            <PerfManager />
            {START_PARAMS.stats && <Stats />}
          </Canvas>
        )}
      </HeightfieldProvider>
      {!is3d && <Map2D />}
      {START_PARAMS.stats && is3d && <PerfReadout />}
      <Hud />
    </>
  );
}
