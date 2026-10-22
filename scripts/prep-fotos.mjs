// Copia las fotos reales del local (iPhone, octubre) a assets/photos/real/ con nombres semánticos.
// Corrige la orientación y guarda en JPG de alta calidad SIN redimensionar (los diseños nunca las amplían).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, '..', 'Contenidos', 'Material Iphone Octubre', 'Fotos');
const OUT = path.join(ROOT, 'assets', 'photos', 'real');

const fotos = {
  // Tintos de la casa
  'IMG_9704.JPG.jpeg': 'tinto-manos.jpg',
  'IMG_9705.JPG.jpeg': 'tinto-pies.jpg',
  'IMG_9875.JPG.jpeg': 'rojo-manos.jpg',
  'IMG_9876.JPG.jpeg': 'rojo-pies-salvia.jpg',
  // Lo simple también se nota
  'IMG_9251.JPG.jpeg': 'perla.jpg',
  'IMG_9383.PNG': 'french-plata.jpg',
  'IMG_9375.PNG': 'french-nude.jpg',
  'IMG_9731.PNG': 'rosa-bebe.jpg',
  'IMG_9877.JPG.jpeg': 'nude-oro.jpg',
  'IMG_9766.JPG.jpeg': 'taupe.jpg',
  // Exposición permanente
  'IMG_9282.PNG': 'esmeralda.jpg',
  'IMG_9278.PNG': 'oro-y-flor.jpg',
  'IMG_9391.PNG': 'constelacion.jpg',
  'IMG_9767.JPG.jpeg': 'lunares-verdes.jpg',
  'IMG_9619.PNG': 'trazo-azul.jpg',
  'IMG_9721.JPG.jpeg': 'perla-gris.jpg',
  'IMG_9730.JPG.jpeg': 'atardecer.jpg',
  // Halloween
  'IMG_9635.JPG.jpeg': 'halloween.jpg',
};

await mkdir(OUT, { recursive: true });
for (const [src, out] of Object.entries(fotos)) {
  const info = await sharp(path.join(SRC, src)).rotate().flatten({ background: '#ffffff' })
    .jpeg({ quality: 93, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(path.join(OUT, out));
  console.log(out.padEnd(24), `${info.width}x${info.height}`);
}
