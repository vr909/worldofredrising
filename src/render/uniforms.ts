/**
 * Uniforms shared by every custom shader. Pass these objects (not copies) into ShaderMaterial
 * `uniforms` so one per-frame update reaches every material. Updated by <SharedUniformsDriver/>.
 */
import { Color, Vector3 } from 'three';
import { SUMMER, SUN } from './palette';

export function sunDirection(azimuthDeg = SUN.azimuthDeg, elevationDeg = SUN.elevationDeg): Vector3 {
  // Direction FROM the scene TOWARDS the sun. Azimuth clockwise from north (-z).
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

export const sharedUniforms = {
  /** Seconds since start. */
  uTime: { value: 0 },
  /** 0 = high summer, 1 = deep winter. Animated; read this, never the store, inside shaders. */
  uSeason: { value: 0 },
  uSunDirection: { value: sunDirection() },
  uSunColor: { value: new Color(SUMMER.sun) },
  uFogColor: { value: new Color(SUMMER.fog) },
  /** Exponential-squared fog density per display km. */
  uFogDensity: { value: 0.0085 },
};

export type SharedUniforms = typeof sharedUniforms;
