// Renderiza cada pieza (piezas/*/slides.html) a PNG con Chrome headless.
// Cada <section class="slide" data-file="nombre.png"> se exporta a piezas/<pieza>/export/.
// Uso: npm run render            -> todas las piezas
//      npm run render -- 03      -> solo las piezas cuyo nombre contiene "03"
import puppeteer from 'puppeteer-core';
import { readdir, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PIEZAS = path.join(ROOT, 'piezas');
const filter = process.argv[2] ?? '';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync);
if (!CHROME) throw new Error('No se encontró Chrome/Edge instalado.');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const page = await browser.newPage();

const dirs = (await readdir(PIEZAS, { withFileTypes: true }))
  .filter(d => d.isDirectory() && d.name.includes(filter))
  .map(d => d.name)
  .sort();

for (const dir of dirs) {
  const html = path.join(PIEZAS, dir, 'slides.html');
  if (!existsSync(html)) continue;
  const out = path.join(PIEZAS, dir, 'export');
  await mkdir(out, { recursive: true });
  for (const f of await readdir(out)) if (f.endsWith('.png')) await rm(path.join(out, f));

  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
  });

  const slides = await page.$$('section.slide');
  for (const slide of slides) {
    // data-transparent: exporta con fondo transparente (textos en pantalla para montar sobre video)
    const { file, transparent } = await slide.evaluate(el => ({ file: el.dataset.file, transparent: 'transparent' in el.dataset }));
    await page.evaluate(t => { document.documentElement.style.background = document.body.style.background = t ? 'transparent' : ''; }, transparent);
    await slide.screenshot({ path: path.join(out, file), type: 'png', omitBackground: transparent });
    console.log(`${dir}/export/${file}`);
  }
}

await browser.close();
