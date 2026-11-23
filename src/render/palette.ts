/**
 * Design tokens for the 3D scene. Mirrors docs/DESIGN.md §3 — keep the two in sync.
 * The art direction in one line: a green, misty, terraformed valley cradled by red Martian stone,
 * lit at golden hour, presented like a museum diorama.
 *
 * Systems take colours from here instead of hard-coding them, so a palette tweak is one edit.
 */
export interface SeasonPalette {
  skyZenith: string;
  skyHorizon: string;
  sun: string;
  /** Hemisphere light: sky / ground bounce. */
  ambientSky: string;
  ambientGround: string;
  fog: string;
  terrain: {
    grass: string;
    meadow: string;
    forestFloor: string;
    highlandMoss: string;
    rock: string;
    highRock: string;
    sand: string;
    marsh: string;
    sandstone: string;
    snow: string;
  };
  water: { deep: string; shallow: string; foam: string };
  foliage: { conifer: string; broadleaf: string; olive: string };
}

export const SUMMER: SeasonPalette = {
  skyZenith: '#6F8FB0',
  skyHorizon: '#EBCDA3',
  sun: '#FFD9A3',
  ambientSky: '#BFD3E6',
  ambientGround: '#6B5A45',
  fog: '#DCCBB0',
  terrain: {
    grass: '#86A35A',
    meadow: '#A2AC66',
    forestFloor: '#4F6B3F',
    highlandMoss: '#71894F',
    rock: '#8A7E70',
    highRock: '#A39A8E',
    sand: '#D8C79A',
    marsh: '#7C8A62',
    sandstone: '#C9A877',
    snow: '#F3F1EB',
  },
  water: { deep: '#2F5F7A', shallow: '#5E9AA8', foam: '#E8F1EE' },
  foliage: { conifer: '#3E5A3A', broadleaf: '#5F7D45', olive: '#8C9A6A' },
};

export const WINTER: SeasonPalette = {
  skyZenith: '#8DA3BA',
  skyHorizon: '#E4E1DA',
  sun: '#FFF0DA',
  ambientSky: '#D2DEE8',
  ambientGround: '#8A8F96',
  fog: '#D9DFE4',
  terrain: {
    grass: '#C9CFC9',
    meadow: '#D8DCD6',
    forestFloor: '#A9B2AA',
    highlandMoss: '#C4CAC3',
    rock: '#7E7A76',
    highRock: '#9A9894',
    sand: '#CFC8B6',
    marsh: '#AEB5AC',
    sandstone: '#C7B79E',
    snow: '#F7F8F8',
  },
  water: { deep: '#3E5E70', shallow: '#9DBAC4', foam: '#F4F8F8' },
  foliage: { conifer: '#33463A', broadleaf: '#6E6A60', olive: '#7D8571' },
};

/** Martian canyon-wall strata, bottom → top. Never changes with season except snow dusting. */
// Deep, saturated rusts: the walls sit 40-90 km from the overview camera, and warm haze + golden-hour light
// bleached the original lighter tans to cream (M1 review). These survive the fog and still read Martian red.
export const CANYON_STRATA = ['#5A2416', '#7A321E', '#963F24', '#A9502C', '#8C3B22', '#B5623A'] as const;

/** Sun placement: golden hour from the south-west, so slopes read as relief from the default view. */
export const SUN = { azimuthDeg: 235, elevationDeg: 24 } as const;
