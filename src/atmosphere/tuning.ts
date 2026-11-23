/**
 * Atmosphere tuning: season presets for fog, sun, exposure. Colours derive from render/palette.ts.
 * Everything is precomputed here so per-frame code only lerps into preallocated objects.
 */
import { Color } from 'three';
import { SUMMER, SUN, WINTER } from '../render/palette';

/** Distance fog tint: the palette fog cooled slightly toward the zenith, so far walls read blue-warm, not beige. */
const tint = (fog: string, zenith: string, amount: number) => new Color(fog).lerp(new Color(zenith), amount);

export const FOG_COLOR = {
  summer: tint(SUMMER.fog, SUMMER.skyZenith, 0.1),
  winter: tint(WINTER.fog, WINTER.skyZenith, 0.1),
};

export const SUN_COLOR = { summer: new Color(SUMMER.sun), winter: new Color(WINTER.sun) };
export const HORIZON = { summer: new Color(SUMMER.skyHorizon), winter: new Color(WINTER.skyHorizon) };
export const ZENITH = { summer: new Color(SUMMER.skyZenith), winter: new Color(WINTER.skyZenith) };
export const AMBIENT_SKY = { summer: new Color(SUMMER.ambientSky), winter: new Color(WINTER.ambientSky) };
export const AMBIENT_GROUND = {
  summer: new Color(SUMMER.ambientGround),
  winter: new Color(WINTER.ambientGround),
};

/** Light rig presets, blended by uSeason. Winter: lower, paler, dimmer. */
export const RIG = {
  sunIntensity: { summer: 2.7, winter: 2.0 },
  hemiIntensity: { summer: 1.0, winter: 0.95 },
  exposure: { summer: 1.0, winter: 0.95 },
  sunElevationDeg: { summer: SUN.elevationDeg, winter: 19 },
  /** Exponential-squared fog density per display km. */
  fogDensity: { summer: 0.0052, winter: 0.0058 },
};

/** Mars (the planet) is smaller and its horizon nearer, but the diorama sky lifts it further; see SkyDome. */
export const SKY = {
  radius: 450,
  /** Horizon lift (deg) when the camera is high above the table-top valley / near the ground. */
  dipHighDeg: 34,
  dipLowDeg: 2,
  /** [azimuth deg clockwise from north, elevation deg] in sky space. Overview looks north. */
  phobos: [350, 11.5] as const,
  deimos: [13, 13.5] as const,
};
