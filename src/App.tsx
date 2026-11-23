import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Scene } from './scene/Scene';
import { START_PARAMS, useStore } from './state/store';
import { HeightfieldProvider } from './terrain/HeightfieldContext';
import { Hud } from './ui/Hud';

export function App() {
  const quality = useStore((s) => s.quality);
  return (
    <>
      <HeightfieldProvider
        quality={quality}
        fallback={<div className="loading">Terraforming the valley…</div>}
      >
        <Canvas
          shadows="percentage"
          // Pixel density is the biggest fragment-cost lever: 2x DPR measured +42% frame time.
          dpr={quality === 'high' ? [1, 1.5] : 1}
          camera={{ fov: 35, near: 0.05, far: 600, position: [0, 62, 88] }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onPointerMissed={() => useStore.getState().hover(null)}
        >
          <Scene />
          {START_PARAMS.stats && <Stats />}
        </Canvas>
      </HeightfieldProvider>
      <Hud />
    </>
  );
}
