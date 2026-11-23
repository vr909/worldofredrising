/**
 * Renders the world layout contract to docs/images/layout-preview.svg — a quick 2D "does this match
 * the book?" check, and a reference image for agents.
 * Run: npm run layout:preview
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { BOUNDS, LANDMARKS, REGIONS, RIVERS } from '../src/world/layout.ts';
import { HOUSES } from '../src/world/houses.ts';

const S = 12; // px per km
const pad = 20;
const W = (BOUNDS.maxX - BOUNDS.minX + BOUNDS.wallDepth * 2) * S + pad * 2;
const H = (BOUNDS.maxZ - BOUNDS.minZ) * S + pad * 2;
const X = (x: number) => (x - BOUNDS.minX + BOUNDS.wallDepth) * S + pad;
const Z = (z: number) => (z - BOUNDS.minZ) * S + pad;
const pts = (p: readonly (readonly [number, number])[]) =>
  p.map(([x, z]) => `${X(x).toFixed(1)},${Z(z).toFixed(1)}`).join(' ');

const fill: Record<string, string> = {
  mountains: '#b9b2a6',
  highlands: '#9fae84',
  hills: '#c9b98a',
  forest: '#5f7f55',
  marsh: '#8fa08a',
  sea: '#7fa6bf',
  lake: '#7fa6bf',
};

const out: string[] = [];
out.push(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Georgia, serif">`,
);
out.push(`<rect width="${W}" height="${H}" fill="#e9e1cc"/>`);
// canyon walls
out.push(
  `<rect x="${pad}" y="${pad}" width="${BOUNDS.wallDepth * S}" height="${H - pad * 2}" fill="#7d6a58"/>`,
);
out.push(
  `<rect x="${X(BOUNDS.maxX)}" y="${pad}" width="${BOUNDS.wallDepth * S}" height="${H - pad * 2}" fill="#7d6a58"/>`,
);
out.push(
  `<rect x="${X(BOUNDS.minX)}" y="${pad}" width="${(BOUNDS.maxX - BOUNDS.minX) * S}" height="${H - pad * 2}" fill="#d8cfa6"/>`,
);
for (const r of REGIONS) {
  out.push(
    `<polygon points="${pts(r.polygon)}" fill="${fill[r.kind]}" stroke="#00000033" stroke-width="1"/>`,
  );
}
for (const r of RIVERS) {
  out.push(
    `<polyline points="${pts(r.points)}" fill="none" stroke="#3f6f8f" stroke-width="${Math.max(1.5, r.width[1] * S * 0.8)}" stroke-linecap="round" stroke-linejoin="round"${r.confidence === 'inferred' ? ' stroke-dasharray="6 4"' : ''}/>`,
  );
}
for (const r of REGIONS) {
  if (!r.labelled || !r.labelAt) continue;
  out.push(
    `<text x="${X(r.labelAt[0])}" y="${Z(r.labelAt[1])}" text-anchor="middle" font-size="15" letter-spacing="3" fill="#2b2620">${r.name.toUpperCase()}</text>`,
  );
}
for (const l of LANDMARKS) {
  const x = X(l.position[0]);
  const z = Z(l.position[1]);
  const color = l.house ? HOUSES[l.house].color : '#333';
  const dash = l.confidence === 'inferred' ? ' stroke-dasharray="3 2"' : '';
  if (l.kind === 'castle') {
    out.push(
      `<polygon points="${x - 9},${z - 12} ${x + 9},${z - 12} ${x},${z + 4}" fill="${color}" stroke="#111" stroke-width="1.5"${dash}/>`,
    );
  } else if (l.kind === 'olympus') {
    out.push(
      `<circle cx="${x}" cy="${z}" r="${l.site.radius * S}" fill="#ffffff88" stroke="#c8a24a" stroke-width="2" stroke-dasharray="4 3"/>`,
    );
  } else {
    out.push(`<rect x="${x - 3}" y="${z - 3}" width="6" height="6" fill="${color}" stroke="#111"/>`);
  }
  out.push(
    `<text x="${x}" y="${z + 16}" text-anchor="middle" font-size="10" fill="#1b1a17">${l.name}${l.confidence === 'inferred' ? ' ?' : ''}</text>`,
  );
}
for (const r of RIVERS) {
  if (!r.name) continue;
  const mid = r.points[Math.floor(r.points.length / 2)]!;
  out.push(
    `<text x="${X(mid[0]) + 6}" y="${Z(mid[1])}" font-size="10" font-style="italic" fill="#24485e">${r.name}</text>`,
  );
}
out.push(
  `<text x="${W - pad - 4}" y="${H - pad - 6}" text-anchor="end" font-size="10" fill="#333">1 grid = 10 km · north up · dashed = inferred</text>`,
);
for (let x = BOUNDS.minX; x <= BOUNDS.maxX; x += 10)
  out.push(`<line x1="${X(x)}" y1="${pad}" x2="${X(x)}" y2="${H - pad}" stroke="#00000010"/>`);
for (let z = BOUNDS.minZ + 3; z <= BOUNDS.maxZ; z += 10)
  out.push(`<line x1="${pad}" y1="${Z(z)}" x2="${W - pad}" y2="${Z(z)}" stroke="#00000010"/>`);
out.push('</svg>');

mkdirSync('docs/images', { recursive: true });
writeFileSync('docs/images/layout-preview.svg', out.join('\n'));
console.log('wrote docs/images/layout-preview.svg');
