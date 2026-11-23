/**
 * The thirteen Houses. Identity data shared by castles, banners, labels, UI and the minimap.
 * Colours are part of the design system (docs/DESIGN.md §3); change them only there and here together.
 * Lore text does NOT live here — see src/content/places.ts.
 */
import type { HouseId } from './types';

export interface House {
  id: HouseId;
  name: string;
  /** Primary banner colour. */
  color: string;
  /** Darker companion for trims, shadows and text on light backgrounds. */
  colorDeep: string;
  /** One-line brief for the sigil designer (our own designs, not traced from the book). */
  sigil: string;
  /** Present on the book's printed map legend. */
  onBookMap: boolean;
}

export const HOUSES: Record<HouseId, House> = {
  mars: {
    id: 'mars',
    name: 'House Mars',
    color: '#A8322D',
    colorDeep: '#5E1714',
    sigil: 'Wolf head, front-facing, ears sharp',
    onBookMap: true,
  },
  minerva: {
    id: 'minerva',
    name: 'House Minerva',
    color: '#7A8A3E',
    colorDeep: '#3F4A1C',
    sigil: 'Owl, wings folded, geometric',
    onBookMap: true,
  },
  diana: {
    id: 'diana',
    name: 'House Diana',
    color: '#2F6B4F',
    colorDeep: '#163626',
    sigil: 'Stag head with tall antlers',
    onBookMap: true,
  },
  apollo: {
    id: 'apollo',
    name: 'House Apollo',
    color: '#D9A21B',
    colorDeep: '#7A5A08',
    sigil: 'Lyre crossed with sun rays',
    onBookMap: true,
  },
  ceres: {
    id: 'ceres',
    name: 'House Ceres',
    color: '#C98B3B',
    colorDeep: '#6E4716',
    sigil: 'Sickle over a wheat sheaf',
    onBookMap: true,
  },
  jupiter: {
    id: 'jupiter',
    name: 'House Jupiter',
    color: '#3D4F8C',
    colorDeep: '#1D2747',
    sigil: 'Two crossed lightning bolts',
    onBookMap: true,
  },
  juno: {
    id: 'juno',
    name: 'House Juno',
    color: '#1F8A8A',
    colorDeep: '#0C4545',
    sigil: 'Peacock in profile, tail down',
    onBookMap: true,
  },
  pluto: {
    id: 'pluto',
    name: 'House Pluto',
    color: '#3A3542',
    colorDeep: '#16131B',
    sigil: 'Two-pronged bident over a closed door',
    onBookMap: false,
  },
  vulcan: {
    id: 'vulcan',
    name: 'House Vulcan',
    color: '#D2582A',
    colorDeep: '#6B2509',
    sigil: 'Hammer striking an anvil, sparks',
    onBookMap: false,
  },
  venus: {
    id: 'venus',
    name: 'House Venus',
    color: '#C2607E',
    colorDeep: '#5E2337',
    sigil: 'Dove with a myrtle sprig',
    onBookMap: false,
  },
  mercury: {
    id: 'mercury',
    name: 'House Mercury',
    color: '#8FA3B0',
    colorDeep: '#43525C',
    sigil: 'Winged helm',
    onBookMap: false,
  },
  neptune: {
    id: 'neptune',
    name: 'House Neptune',
    color: '#2E6FA3',
    colorDeep: '#123553',
    sigil: 'Trident rising from a wave',
    onBookMap: false,
  },
  bacchus: {
    id: 'bacchus',
    name: 'House Bacchus',
    color: '#6B2F5B',
    colorDeep: '#33122A',
    sigil: 'Grape cluster and vine leaf',
    onBookMap: false,
  },
};

export const HOUSE_IDS = Object.keys(HOUSES) as HouseId[];
