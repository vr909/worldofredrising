/**
 * Banner texture atlas: all 13 House banners painted once on a canvas from the sigil path data (no network,
 * no assets). 4 x 4 grid of 128 x 256 cells (cloth colour, trim, deep shield, parchment glyph).
 */
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import { HOUSES } from '../world/houses';
import { HOUSE_IDS } from '../world/houses';
import type { HouseId } from '../world/types';
import { GLYPH_TRANSFORM, PARCHMENT, SHIELD_PATH } from './Sigil';
import { SIGILS } from './sigilData';

export const CELL_W = 128;
export const CELL_H = 256;
export const COLS = 4;
export const ROWS = 4;
/** Banner width / height (matches the atlas cell). */
export const BANNER_ASPECT = CELL_W / CELL_H;

/** Atlas cell index of a House. */
export const cellOf = (id: HouseId): number => HOUSE_IDS.indexOf(id);

function paintCell(ctx: CanvasRenderingContext2D, id: HouseId, cell: number) {
  const h = HOUSES[id];
  const x = (cell % COLS) * CELL_W;
  const y = Math.floor(cell / COLS) * CELL_H;
  ctx.save();
  ctx.translate(x, y);
  // cloth with a soft vertical falloff towards the hem
  const g = ctx.createLinearGradient(0, 0, 0, CELL_H);
  g.addColorStop(0, h.color);
  g.addColorStop(1, h.colorDeep);
  ctx.fillStyle = h.color;
  ctx.fillRect(0, 0, CELL_W, CELL_H);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CELL_W, CELL_H);
  ctx.globalAlpha = 1;
  // hem band at the top (the pole side) and a thin trim inset
  ctx.fillStyle = h.colorDeep;
  ctx.fillRect(0, 0, CELL_W, 12);
  ctx.strokeStyle = PARCHMENT;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 18, CELL_W - 16, CELL_H - 26);
  ctx.globalAlpha = 1;
  // shield + glyph
  ctx.translate(14, 32);
  ctx.scale(1.56, 1.56);
  ctx.fillStyle = PARCHMENT;
  ctx.fill(new Path2D(SHIELD_PATH));
  ctx.save();
  ctx.translate(64 / 2, 72 / 2);
  ctx.scale(0.9, 0.9);
  ctx.translate(-32, -36);
  ctx.fillStyle = h.colorDeep;
  ctx.fill(new Path2D(SHIELD_PATH));
  ctx.restore();
  // glyph (same placement as the standalone <Sigil/>)
  const m = /translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/.exec(GLYPH_TRANSFORM);
  if (m) {
    ctx.translate(Number(m[1]), Number(m[2]));
    ctx.scale(Number(m[3]), Number(m[3]));
  }
  ctx.fillStyle = PARCHMENT;
  ctx.fill(new Path2D(SIGILS[id].path), 'nonzero');
  ctx.restore();
}

export function buildBannerAtlas(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CELL_W * COLS;
  canvas.height = CELL_H * ROWS;
  const ctx = canvas.getContext('2d');
  if (ctx) HOUSE_IDS.forEach((id, i) => paintCell(ctx, id, i));
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}
