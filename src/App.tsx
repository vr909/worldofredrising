import { Canvas } from '@react-three/fiber';
import { Scene } from './scene/Scene';
import { useStore } from './state/store';
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
          shadows
          dpr={quality === 'high' ? [1, 2] : 1}
          camera={{ fov: 35, near: 0.05, far: 600, position: [0, 62, 88] }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onPointerMissed={() => useStore.getState().hover(null)}
        >
          <Scene />
        </Canvas>
      </HeightfieldProvider>
      <Hud />
    </>
  );
}
