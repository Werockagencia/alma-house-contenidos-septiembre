// Revisa que ninguna foto se amplíe en las piezas (ampliar = se ve pixelada).
// Para cada <img> calcula la escala real con object-fit: cover. > 1.0 = se está ampliando.
import puppeteer from 'puppeteer-core';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920 });
let bad = 0;
for (const dir of (await readdir(path.join(ROOT, 'piezas'))).sort()) {
  if (!existsSync(path.join(ROOT, 'piezas', dir, 'slides.html'))) continue;
  await page.goto(pathToFileURL(path.join(ROOT, 'piezas', dir, 'slides.html')).href, { waitUntil: 'networkidle0' });
  const rows = await page.evaluate(() => [...document.querySelectorAll('section.slide')].flatMap(s => [...s.querySelectorAll('img')].filter(i => i.src.includes('/photos/')).map(i => {
    const r = i.getBoundingClientRect();
    const sc = Math.max(r.width / i.naturalWidth, r.height / i.naturalHeight);
    return { file: s.dataset.file, img: i.src.split('/').pop(), nat: `${i.naturalWidth}x${i.naturalHeight}`, box: `${Math.round(r.width)}x${Math.round(r.height)}`, sc: +sc.toFixed(2) };
  })));
  for (const r of rows) { const flag = r.sc > 1.0 ? 'AMPLÍA' : 'ok'; if (r.sc > 1.0) bad++; console.log(`${flag.padEnd(6)} ${r.sc.toFixed(2)}x  ${r.file.padEnd(16)} ${r.img} (${r.nat} → ${r.box})`); }
}
await browser.close();
console.log(bad ? `\n${bad} fotos se amplían` : '\nTodas las fotos a resolución nativa o mayor');
process.exitCode = bad ? 1 : 0;
