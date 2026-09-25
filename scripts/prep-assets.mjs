// Prepara los assets que usan las piezas:
//  1. Recorta el aire transparente de los logos oficiales (vienen en 4501px con mucho margen).
//  2. Copia los pines seleccionados del tablero de Pinterest con nombres semánticos,
//     redimensionados a máx. 2160px de lado largo (2x del lienzo de Instagram).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BRAND_SRC = path.resolve(ROOT, '..', 'drive-download-20260725T195457Z-1-001', 'LOGOS', 'PNG');
const LOGO_OUT = path.join(ROOT, 'assets', 'brand', 'logos');
const PIN_SRC = path.join(ROOT, 'assets', 'pinterest');
const PHOTO_OUT = path.join(ROOT, 'assets', 'photos');

const logos = {
  'isotipo-crema.png':      'ICONO - PNG/PNG-25.png',
  'isotipo-blanco.png':     'ICONO - PNG/PNG-27.png',
  'isotipo-terracota.png':  'ICONO - PNG/PNG-24.png',
  'isotipo-oscuro.png':     'ICONO - PNG/PNG-28.png',
  'logo-crema.png':         'LOGO PRINCIPAL - PNG/PNG-04.png',
  'logo-oscuro.png':        'LOGO PRINCIPAL - PNG/PNG-07.png',
  'logo-terracota.png':     'LOGO PRINCIPAL - PNG/PNG-03.png',
  'wordmark-crema.png':     'VARIACION 1 - PNG/PNG-11.png',
  'wordmark-oscuro.png':    'VARIACION 1 - PNG/PNG-14.png',
  'apilado-crema.png':      'VARIACION 2 - PNG/PNG-18.png',
  'apilado-oscuro.png':     'VARIACION 2 - PNG/PNG-21.png',
  'apilado-terracota.png':  'VARIACION 2 - PNG/PNG-17.png',
};

// pin del tablero -> nombre de uso en las piezas
const photos = {
  'pin-44.jpg': 'manifiesto-rojo-cabello.jpg',
  'pin-02.jpg': 'codigos-portada-libro.jpg',
  'pin-40.jpg': 'codigos-reserva-cafe.jpg',
  'pin-30.jpg': 'codigos-hora-teclado.jpg',
  'pin-12.jpg': 'codigos-tres-sillas-luz.jpg',
  'pin-43.jpg': 'codigos-cafe-espresso.jpg',
  'pin-29.jpg': 'codigos-kit-higiene.jpg',
  'pin-48.jpg': 'codigos-nombre-taza.jpg',
  'pin-42.jpg': 'codigos-silencio-libro.jpg',
  'pin-47.jpg': 'edicion-portada-as.jpg',
  'pin-45.jpg': 'edicion-cereza-negra.jpg',
  'pin-01.jpg': 'edicion-rojo-casa.jpg',
  'pin-37.jpg': 'edicion-cafe-con-leche.jpg',
  'pin-22.jpg': 'edicion-leche-almendra.jpg',
  'pin-51.jpg': 'edicion-salvia.jpg',
  'pin-16.jpg': 'frases-portada-cafe.jpg',
  'pin-17.jpg': 'frases-gafas-rojo.jpg',
  'pin-36.jpg': 'frases-pinky.jpg',
  'pin-18.jpg': 'frases-cafesito.jpg',
  'pin-24.jpg': 'frases-iced-latte.jpg',
  'pin-53.jpg': 'frases-gafas-burgundy.jpg',
  'pin-32.jpg': 'frases-cierre-vaso.jpg',
  'pin-34.jpg': 'hora-flor-blazer.jpg',
  'pin-38.jpg': 'agenda-as-corazones.jpg',
  'pin-23.jpg': 'agenda-carta-roja.jpg',
  'pin-41.jpg': 'agenda-calle-flor.jpg',
};

await mkdir(LOGO_OUT, { recursive: true });
await mkdir(PHOTO_OUT, { recursive: true });

for (const [out, src] of Object.entries(logos)) {
  await sharp(path.join(BRAND_SRC, src))
    .trim({ threshold: 1 })
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(path.join(LOGO_OUT, out));
  console.log('logo  ', out);
}

for (const [src, out] of Object.entries(photos)) {
  await sharp(path.join(PIN_SRC, src))
    .rotate()
    .resize({ width: 2160, height: 2160, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(PHOTO_OUT, out));
  console.log('photo ', out);
}
