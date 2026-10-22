// Construye la página de guiones (index.html, GitHub Pages) y CAPTIONS.md
// a partir de scripts/plan.mjs + piezas/*/guion.md. Pensada para leerse en el celular durante la grabación.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { plan, chapter, visuales } from './plan.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPO = 'https://github.com/Werockagencia/alma-house-contenidos-septiembre';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = s => s.replace(/^./, c => c.toUpperCase());
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');

function parse(text) {
  const [head, ...parts] = text.split(/\n## /);
  const meta = {};
  for (const m of head.matchAll(/\*\*(.+?):\*\* (.+)/g)) meta[m[1]] = m[2];
  const sections = {};
  for (const p of parts) { const nl = p.indexOf('\n'); sections[p.slice(0, nl).trim()] = p.slice(nl + 1).trim(); }
  return { meta, sections };
}
const rows = t => t.split('\n').filter(l => l.startsWith('|')).slice(2).map(r => r.slice(1, -1).split('|').map(c => c.trim()));
const list = t => t.split('\n').filter(l => /^(- |\d+\. )/.test(l)).map(l => l.replace(/^(- |\d+\. )/, ''));

const eps = [];
for (const p of plan) {
  const { meta, sections } = parse(await readFile(path.join(ROOT, 'piezas', p.dir, 'guion.md'), 'utf8'));
  eps.push({ ...p, meta, sections });
}

// ---------- carruseles e historias con fotos de la casa ----------
await mkdir(path.join(ROOT, 'web'), { recursive: true });
await mkdir(path.join(ROOT, 'descargas'), { recursive: true });
const vis = [];
for (const v of visuales) {
  const dir = path.join(ROOT, 'piezas', v.dir);
  const { meta, sections } = parse(await readFile(path.join(dir, 'copy.md'), 'utf8'));
  const files = (await readdir(path.join(dir, 'export'))).filter(f => f.endsWith('.png')).sort();
  const imgs = [];
  for (const f of files) {
    const src = path.join(dir, 'export', f), base = f.replace('.png', '.jpg');
    await sharp(src).resize({ width: 1080, withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(ROOT, 'web', base));
    await sharp(src).jpeg({ quality: 93, chromaSubsampling: '4:4:4', mozjpeg: true }).toFile(path.join(ROOT, 'descargas', `alma-house-${base}`));
    imgs.push({ web: `web/${base}`, dl: `descargas/alma-house-${base}`, story: f.includes('historia') });
  }
  vis.push({ ...v, meta, sections, imgs });
}

// ---------- CAPTIONS.md ----------
let caps = `# Captions · Capítulo ${chapter.n} — ${chapter.name}\n\n6 reels en orden de publicación. Fuente: \`piezas/<reel>/guion.md\`.\n\n`;
for (const e of eps) caps += `---\n\n## Nº ${e.n} · ${e.title}\n**${e.date} · ${e.time}** · ${e.kind}\n\n${e.sections['Caption']}\n\n${e.sections['Hashtags'] ?? ''}\n\n`;
caps += `---\n\n# Carruseles e historias · fotos de la casa\n\n`;
for (const v of vis) caps += `---\n\n## Nº ${v.n} · ${v.title}\n**${v.date} · ${v.time}** · ${v.kind}\n\n${v.sections['Caption']}\n\n${v.sections['Hashtags'] ?? ''}\n\n`;
await writeFile(path.join(ROOT, 'CAPTIONS.md'), caps);

// ---------- index.html ----------
const epHtml = e => `
<article class="ep" id="n${e.n}">
  <header class="eh">
    <p class="eyebrow">Nº ${e.n} · ${esc(e.kind)}</p>
    <h2>${esc(e.title)}</h2>
    <p class="when"><span>${e.date}</span><span>${e.time}</span></p>
  </header>
  <div class="idea">
    <p class="k">La idea</p>
    <p>${inline(cap(e.meta['Rol en la narrativa'] ?? ''))}</p>
  </div>
  <dl class="facts">
    <dt>Gancho</dt><dd>${inline(cap(e.meta['Gancho (primeros 2 s)'] ?? ''))}</dd>
    <dt>Audio</dt><dd>${inline(cap(e.meta['Audio'] ?? ''))}</dd>
    <dt>Quién sale</dt><dd>${inline(cap(e.meta['Quién sale'] ?? ''))}</dd>
  </dl>
  <div class="say"><p class="k">Lo que dice Yissel · a cámara</p><ol>${list(e.sections['Lo que dice Yissel'] ?? '').map(x => `<li>${inline(x).replace(/\(([^)]+)\)/g, '<span class="dir">$1</span>')}</li>`).join('')}</ol></div>
  <h3>Tomas</h3>
  <ol class="shots">${rows(e.sections['Tomas'] ?? '').map(([n, que, como, dura]) => `
    <li><span class="sn">${esc(n)}</span><div><p class="sq">${inline(que)}</p><p class="sc">${inline(como)}</p></div><span class="sd">${esc(dura)}</span></li>`).join('')}
  </ol>
  <h3>Texto en pantalla</h3>
  <ol class="ost">${list(e.sections['Texto en pantalla'] ?? '').map(x => `<li>${inline(x)}</li>`).join('')}</ol>
  <details class="cap"><summary>Caption <button class="copy" data-copy="cap${e.n}" type="button">Copiar</button></summary>
    <div class="cap-t" id="cap${e.n}">${esc(e.sections['Caption'] ?? '')}\n\n${esc(e.sections['Hashtags'] ?? '')}</div>
  </details>
  <div class="notes"><p class="k">Notas</p><ul>${[`<b>Portada:</b> ${inline(e.sections['Portada'] ?? '')}`, ...list(e.sections['Notas'] ?? '').map(inline)].map(x => `<li>${x}</li>`).join('')}</ul></div>
</article>`;

const visHtml = v => `
<article class="ep vis" id="n${v.n}">
  <header class="eh">
    <p class="eyebrow">Nº ${v.n} · ${esc(v.kind)}</p>
    <h2>${esc(v.title)}</h2>
    <p class="when"><span>${v.date}</span><span>${v.time}</span></p>
  </header>
  <div class="idea"><p class="k">La idea</p><p>${inline(cap(v.meta['La idea'] ?? ''))}</p></div>
  <h3>${v.imgs.some(i => !i.story) && v.imgs.filter(i => !i.story).length > 1 ? 'Carrusel' : 'Post'} · desliza</h3>
  <div class="strip">${v.imgs.filter(i => !i.story).map((i, k) => `<figure><a href="${i.dl}" target="_blank"><img src="${i.web}" alt="" loading="lazy"></a><figcaption><span>${String(k + 1).padStart(2, '0')}</span><a class="dl" href="${i.dl}" download>↓ JPG</a></figcaption></figure>`).join('')}</div>
  <h3>Historias</h3>
  <div class="strip st">${v.imgs.filter(i => i.story).map((i, k) => `<figure><a href="${i.dl}" target="_blank"><img src="${i.web}" alt="" loading="lazy"></a><figcaption><span>Historia ${k + 1}</span><a class="dl" href="${i.dl}" download>↓ JPG</a></figcaption></figure>`).join('')}</div>
  <details class="cap"><summary>Caption <button class="copy" data-copy="cap${v.n}" type="button">Copiar</button></summary>
    <div class="cap-t" id="cap${v.n}">${esc(v.sections['Caption'] ?? '')}\n\n${esc(v.sections['Hashtags'] ?? '')}</div>
  </details>
  <div class="notes"><p class="k">Para las historias</p><ul>${list(v.sections['Historias'] ?? '').map(x => `<li>${inline(x)}</li>`).join('')}</ul></div>
  <div class="notes"><p class="k">Notas</p><ul>${list(v.sections['Notas'] ?? '').map(x => `<li>${inline(x)}</li>`).join('')}</ul></div>
</article>`;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Capítulo ${chapter.n} · ${chapter.name} · Alma House</title>
<link rel="icon" href="assets/brand/logos/isotipo-terracota.png">
<style>
@font-face{font-family:'Aurora';src:url('assets/brand/fonts/aurora-serif.otf');font-style:normal}
@font-face{font-family:'Aurora';src:url('assets/brand/fonts/aurora-serif-italic.otf');font-style:italic}
@font-face{font-family:'Uncage';src:url('assets/brand/fonts/uncage-vf.ttf');font-weight:100 900}
@font-face{font-family:'Figtree';src:url('assets/brand/fonts/figtree-vf.ttf');font-weight:300 900}
:root{--cream:#F7EFE7;--paper:#FBF6F0;--blush:#CEBAAA;--brown:#99471D;--bakery:#AF9175;--forest:#3F412F;--espresso:#2A1F1A;--ink:#32342A;--ink2:#4a4a3d;--line:rgba(50,52,42,.14)}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--cream);color:var(--ink);font-family:'Figtree',system-ui,sans-serif;font-size:17px;line-height:1.55;font-weight:450;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto;padding:0 20px}
.label,.eyebrow,.k,h3{font-family:'Uncage','Figtree',sans-serif;text-transform:uppercase;letter-spacing:.22em;font-size:11.5px;font-weight:650}
.hero{background:var(--espresso);color:var(--cream);padding:28px 0 46px}
.mast{display:flex;align-items:center;gap:14px;color:var(--blush)}
.mast .rule{flex:1;height:1px;background:currentColor;opacity:.3}
.hero h1{font-family:'Aurora',serif;font-weight:400;font-size:clamp(46px,11vw,92px);line-height:.88;letter-spacing:-.03em;margin-top:40px}
.hero h1 em{color:var(--blush)}
.hero .lede{font-family:'Aurora',serif;font-style:italic;font-size:clamp(21px,4.6vw,27px);line-height:1.25;margin-top:20px;color:rgba(247,239,231,.92)}
.hero .by{margin-top:26px;color:var(--blush);line-height:1.9}
.sec{padding:40px 0 0}
.sec h2{font-family:'Aurora',serif;font-weight:400;font-size:34px;line-height:1;margin-bottom:16px}
.guide{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:20px 22px}
.guide ul{padding-left:20px;display:flex;flex-direction:column;gap:8px}
.cal{display:flex;flex-direction:column;border-top:1px solid var(--line)}
.cal a{display:grid;grid-template-columns:110px 1fr;gap:12px;padding:13px 0;border-bottom:1px solid var(--line);text-decoration:none;color:inherit;align-items:baseline}
.cal .d{font-family:'Uncage',sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--brown);font-weight:650}
.cal .t{font-family:'Aurora',serif;font-size:22px;line-height:1.1}
.cal .t small{font-family:'Figtree',sans-serif;font-size:13px;color:var(--ink2);display:block;margin-top:3px;letter-spacing:0}
.ep{margin-top:44px;padding-top:34px;border-top:2px solid var(--espresso)}
.eh .eyebrow{color:var(--brown)}
.eh h2{font-family:'Aurora',serif;font-weight:400;font-size:clamp(36px,8vw,56px);line-height:.95;letter-spacing:-.02em;margin:8px 0 14px}
.when{display:flex;gap:8px;flex-wrap:wrap}
.when span{font-family:'Uncage',sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;border:1px solid var(--ink);border-radius:999px;padding:8px 14px}
.when span:first-child{background:var(--ink);color:var(--cream)}
.idea{margin-top:22px;background:var(--espresso);color:var(--cream);border-radius:10px;padding:20px 22px}
.idea .k{color:var(--blush);margin-bottom:8px}
.idea p:last-child{font-size:17.5px}
.say{margin-top:18px;border-left:4px solid var(--brown);background:#fff;border-radius:0 10px 10px 0;padding:16px 18px 16px 20px}
.say .k{color:var(--brown);margin-bottom:10px}
.say ol{padding-left:20px;display:flex;flex-direction:column;gap:10px}
.say li{font-family:'Aurora',serif;font-size:21px;line-height:1.3;-webkit-text-stroke:.3px currentColor}
.say .dir{display:block;font-family:'Figtree',sans-serif;font-size:13px;font-style:italic;color:#7d6a5a;-webkit-text-stroke:0;margin-bottom:2px}
.say li::marker{font-family:'Figtree',sans-serif;font-size:15px;color:var(--brown);font-weight:700}
.facts{margin-top:16px;display:grid;grid-template-columns:110px 1fr;gap:10px 16px;font-size:16px}
.facts dt{font-family:'Uncage',sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--brown);font-weight:650;padding-top:3px}
h3{color:var(--brown);margin:28px 0 12px}
.shots{list-style:none;display:flex;flex-direction:column;gap:10px}
.shots li{display:grid;grid-template-columns:38px 1fr auto;gap:12px;align-items:start;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.sn{font-family:'Aurora',serif;font-style:italic;font-size:30px;line-height:1;color:var(--brown)}
.sq{font-weight:600;line-height:1.35}
.sc{font-size:15px;color:var(--ink2);margin-top:4px}
.sd{font-family:'Uncage',sans-serif;font-size:12px;letter-spacing:.1em;font-weight:650;background:var(--blush);color:var(--espresso);border-radius:999px;padding:5px 10px;white-space:nowrap}
.ost{padding-left:22px;display:flex;flex-direction:column;gap:6px}
.ost li::marker{color:var(--brown);font-weight:700}
.cap{margin-top:24px;border:1px solid var(--line);border-radius:10px;background:var(--paper)}
.cap summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:14px 18px;font-family:'Aurora',serif;font-size:22px}
.cap summary::-webkit-details-marker{display:none}
.cap-t{white-space:pre-line;padding:0 18px 18px;font-size:16px}
.copy{font-family:'Uncage',sans-serif;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;background:var(--brown);color:var(--cream);border:0;border-radius:999px;padding:9px 14px;cursor:pointer}
.copy.ok{background:var(--forest)}
.notes{margin-top:18px;font-size:15px;color:var(--ink2)}
.notes .k{color:var(--brown);margin-bottom:8px}
.notes ul{padding-left:20px;display:flex;flex-direction:column;gap:6px}
code{font-size:13px;background:rgba(153,71,29,.08);padding:1px 5px;border-radius:3px}
.strip{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 12px;scrollbar-width:thin}
.strip figure{flex:0 0 min(78%,340px);scroll-snap-align:start}
.strip.st figure{flex:0 0 min(58%,250px)}
.strip img{width:100%;display:block;border-radius:4px;box-shadow:0 10px 26px rgba(42,31,26,.16)}
.strip figcaption{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-family:'Uncage',sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--brown);font-weight:650}
.dl{background:var(--brown);color:var(--cream);text-decoration:none;border-radius:999px;padding:7px 12px;font-size:10px}
.part{margin-top:56px;padding:26px 22px;background:var(--espresso);color:var(--cream);border-radius:12px}
.part h2{font-family:'Aurora',serif;font-weight:400;font-size:clamp(32px,7vw,48px);line-height:.95}
.part h2 em{color:var(--blush)}
.part p{margin-top:10px;color:rgba(247,239,231,.88)}
.foot{background:var(--espresso);color:var(--cream);margin-top:60px;padding:36px 0;font-size:14.5px}
.foot .label{color:var(--blush)}
.foot a{color:var(--blush)}
:focus-visible{outline:2px solid var(--brown);outline-offset:3px}
@media (max-width:520px){.facts{grid-template-columns:1fr;gap:2px}.facts dd{margin-bottom:10px}.cal a{grid-template-columns:92px 1fr}}
</style>
</head>
<body>

<header class="hero">
  <div class="wrap">
    <div class="mast label"><span>Alma House · Nails Bar</span><span class="rule"></span><span>Cap. ${chapter.n}</span></div>
    <h1>Capítulo ${chapter.n}<br><em>${chapter.name}.</em></h1>
    <p class="lede">${chapter.line}</p>
    <p class="by label">6 reels · 3 carruseles · 1 post · historias<br>We Rock Agencia</p>
  </div>
</header>

<main class="wrap">
  <section class="sec">
    <h2>La continuidad</h2>
    <p>El capítulo I creó la expectativa, el II abrió la puerta y el III mostró los códigos de la casa. El IV lo cuenta Yissel: la anfitriona que abrió la puerta en el reel Nº 00 ahora le habla a cámara en cada reel. Habla de cómo llegas, de sus colores de octubre, de sus secretos para que las uñas duren, de lo que viene en noviembre, del sonido de la casa y de un resultado real. Todo se graba con un celular, dentro del local. La gente le compra a personas: una cara y una voz constantes hacen que la marca se sienta cercana.</p>
  </section>

  <div class="part" id="fotos"><p class="label" style="color:var(--blush)">Parte 1</p><h2>Carruseles e historias,<br><em>con fotos de la casa.</em></h2><p>Cuatro piezas hechas con las fotos que se tomaron en el local en octubre, cada una con su versión de historias en el estilo de las plantillas de la casa. Toca cualquier imagen para verla en tamaño completo o descárgala con el botón.</p></div>

  <section class="sec">
    <h2>Calendario de las piezas</h2>
    <div class="cal">${vis.map(v => `<a href="#n${v.n}"><span class="d">${v.date}</span><span class="t">Nº ${v.n} · ${esc(v.title)}<small>${esc(v.kind)} · ${v.time}</small></span></a>`).join('')}</div>
  </section>

  ${vis.map(visHtml).join('\n')}

  <div class="part" id="reels"><p class="label" style="color:var(--blush)">Parte 2</p><h2>Los 6 reels,<br><em>con Yissel a cámara.</em></h2><p>Guiones para grabar con un celular, todo en el local.</p></div>

  <section class="sec">
    <h2>Antes de grabar</h2>
    <div class="guide"><ul>
      <li><b>Vertical</b> y en <b>4K a 30 fps</b> (o 1080p a 60 fps). Limpia el lente antes de cada reel.</li>
      <li><b>Luz:</b> cerca de la ventana o con las luces del local encendidas; todas las tomas de un mismo reel con la misma luz.</li>
      <li><b>Bloquea el enfoque y la exposición:</b> deja el dedo presionado sobre lo que quieres enfocar.</li>
      <li><b>Pulso firme:</b> celular con las dos manos y los codos pegados al cuerpo, movimientos lentos y nada de zoom digital.</li>
      <li>Graba <b>2 o 3 segundos de más</b> antes y después de cada toma, y repite las importantes.</li>
      <li><b>Todo en el local, con un solo celular.</b> Orden sugerido para hoy: 07, 08, 09, 10 y 11, y el 12 cuando haya una clienta. Las tomas del carro y el portátil del 07 se pueden grabar en otro momento.</li>
      <li><b>Sonido:</b> apaga la música del local mientras Yissel habla, y para el 11 graba muy cerca.</li>
      <li><b>Yissel a cámara:</b> celular a la altura de sus ojos, a un brazo de distancia, sobre un trípode o algo estable. Que mire al <b>lente</b>, no a la pantalla.</li>
      <li><b>Luz de frente</b> (la ventana detrás del celular, nunca detrás de ella) y el wordmark o la barra de color de fondo.</li>
      <li><b>Frase por frase:</b> no hay que memorizar el reel completo. Graba cada frase 2 o 3 veces y dila con tus palabras; si sale más natural distinto al guion, mejor.</li>
      <li><b>Sonido de la voz:</b> local en silencio y celular cerca (máximo 1 metro). Si tienen micrófono de solapa, úsenlo.</li>
      <li>Las tomas de apoyo (manos, café, esmaltes) van <b>sobre la voz de Yissel</b>; nadie sale hablando sin que se escuche.</li>
    </ul></div>
  </section>

  <section class="sec">
    <h2>Calendario de los reels</h2>
    <div class="cal">${eps.map(e => `<a href="#n${e.n}"><span class="d">${e.date}</span><span class="t">Nº ${e.n} · ${esc(e.title)}<small>${esc(e.kind)} · ${e.time}</small></span></a>`).join('')}</div>
  </section>

  ${eps.map(epHtml).join('\n')}
</main>

<footer class="foot">
  <div class="wrap">
    <p class="label">Alma House · WhatsApp 311 566 2051 · CC Montaña Plaza, local 4 · Cajicá</p>
    <p style="margin-top:12px">Todos los captions en un documento: <a href="${REPO}/blob/main/CAPTIONS.md" target="_blank">CAPTIONS.md</a></p>
  </div>
</footer>

<script>
document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async ev => {
  ev.preventDefault(); ev.stopPropagation();
  const el = document.getElementById(b.dataset.copy), t = el.innerText.trim();
  try { await navigator.clipboard.writeText(t); } catch { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand('copy'); }
  const o = b.textContent; b.textContent = 'Copiado'; b.classList.add('ok'); setTimeout(() => { b.textContent = o; b.classList.remove('ok'); }, 1600);
}));
</script>
</body>
</html>
`;
await writeFile(path.join(ROOT, 'index.html'), html);
console.log(`index.html · CAPTIONS.md · ${eps.length} reels · ${vis.length} piezas con fotos`);
