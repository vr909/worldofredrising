/** Web Worker entry: generates terrain data off the main thread and transfers the typed arrays back. */
import { generateTerrainData, type TerrainData, type TerrainOptions } from './generate';

interface WorkerScope {
  onmessage: ((e: MessageEvent<TerrainOptions>) => void) | null;
  postMessage(message: TerrainData, transfer: Transferable[]): void;
}
const scope = self as unknown as WorkerScope;

scope.onmessage = (e) => {
  const data = generateTerrainData(e.data);
  const transfer: Transferable[] = [
    data.heights.buffer,
    data.splatA.buffer,
    data.splatB.buffer,
    data.ao.buffer,
    data.water.buffer,
    data.regionIdx.buffer,
    ...data.profiles.map((p) => p.buffer),
  ];
  scope.postMessage(data, transfer);
};
