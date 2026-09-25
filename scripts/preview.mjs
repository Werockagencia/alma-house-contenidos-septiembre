// Genera previews para revisión con la cliente:
//  - preview/feed-grid.jpg  -> cómo se ve el perfil tras publicar las 6 piezas (más reciente arriba a la izquierda)
//  - preview/<pieza>.jpg    -> hoja de contacto de cada pieza
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { plan } from './plan.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PIEZAS = path.join(ROOT, 'piezas');
const OUT = path.join(ROOT, 'preview');
const BG = { r: 247, g: 239, b: 231 };
await mkdir(OUT, { recursive: true });

// Orden de publicación (scripts/plan.mjs). En el grid, lo último publicado queda primero.
const publishOrder = plan.map(p => `${p.dir}/export/${p.cover}`);

const TW = 360, TH = 450, GAP = 6;
const ROWS = Math.ceil(publishOrder.length / 3);
// Completa la última fila con los posts ya publicados del capítulo I (así se verá el perfil real)
const previous = ['Alma-House-06-La-invitacion-slide1.jpg', 'Alma-House-05-La-cuenta-regresiva.jpg', 'Alma-House-04-El-espacio.jpg']
  .map(f => path.resolve(ROOT, '..', 'Contenidos-lanzamiento-redes', f));
const cells = [...publishOrder].reverse().map(rel => path.join(PIEZAS, rel));
cells.push(...previous.slice(0, ROWS * 3 - cells.length));
const tiles = await Promise.all(cells.map(async (src, i) => {
  const meta = await sharp(src).metadata();
  let img = sharp(src);
  // Portada de reel 9:16 -> Instagram la muestra recortada al centro en 4:5
  if (meta.height / meta.width > 1.5) img = img.extract({ left: 0, top: 285, width: 1080, height: 1350 });
  const buf = await img.resize(TW, TH).toBuffer();
  return { input: buf, left: GAP + (i % 3) * (TW + GAP), top: GAP + Math.floor(i / 3) * (TH + GAP) };
}));
await sharp({ create: { width: GAP + 3 * (TW + GAP), height: GAP + ROWS * (TH + GAP), channels: 3, background: { r: 255, g: 255, b: 255 } } })
  .composite(tiles).jpeg({ quality: 88 }).toFile(path.join(OUT, 'feed-grid.jpg'));
console.log('preview/feed-grid.jpg');

for (const dir of (await readdir(PIEZAS)).sort()) {
  const exp = path.join(PIEZAS, dir, 'export');
  const files = (await readdir(exp).catch(() => [])).filter(f => f.endsWith('.png') && !f.includes('super')).sort();
  if (!files.length) continue;
  const W = 360, G = 16, cols = Math.min(files.length, 5);
  const items = await Promise.all(files.map(async f => {
    const buf = await sharp(path.join(exp, f)).resize({ width: W }).toBuffer();
    return { buf, h: (await sharp(buf).metadata()).height };
  }));
  const rowH = Math.max(...items.map(x => x.h));
  const rows = Math.ceil(items.length / cols);
  const composite = items.map((x, i) => ({ input: x.buf, left: G + (i % cols) * (W + G), top: G + Math.floor(i / cols) * (rowH + G) }));
  await sharp({ create: { width: G + cols * (W + G), height: G + rows * (rowH + G), channels: 3, background: BG } })
    .composite(composite).jpeg({ quality: 85 }).toFile(path.join(OUT, `${dir}.jpg`));
  console.log(`preview/${dir}.jpg`);
}
