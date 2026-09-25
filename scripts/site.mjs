// Construye la página de revisión (index.html, publicada en GitHub Pages) y CAPTIONS.md
// a partir de scripts/plan.mjs + piezas/*/copy.md + piezas/*/export/*.png.
// Las imágenes de la página son JPG livianos en web/; cada una enlaza al PNG final.
import sharp from 'sharp';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { plan } from './plan.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPO = 'https://github.com/Werockagencia/alma-house-contenidos-septiembre';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

// Markdown mínimo: párrafos, listas, tablas, negritas, código y enlaces.
function md(src) {
  const out = []; const lines = src.trim().split('\n'); let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('|')) {
      const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = r => r.slice(1, -1).split('|').map(c => c.trim());
      const [head, , ...body] = rows;
      out.push(`<div class="tbl"><table><thead><tr>${cells(head).map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      const ordered = /^\d+\. /.test(l); const items = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- \[ \] |- |\d+\. )/, ''));
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map(x => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(\||- |\d+\. )/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${para.map(inline).join('<br>')}</p>`);
  }
  return out.join('\n');
}

function parseCopy(text) {
  const [head, ...parts] = text.split(/\n## /);
  const meta = {};
  for (const m of head.matchAll(/\*\*(.+?):\*\* (.+)/g)) meta[m[1]] = m[2];
  const sections = {};
  for (const p of parts) { const nl = p.indexOf('\n'); sections[p.slice(0, nl).trim()] = p.slice(nl + 1).trim(); }
  return { meta, sections };
}
const pick = (s, prefix) => Object.entries(s).find(([k]) => k.startsWith(prefix))?.[1];

await mkdir(path.join(ROOT, 'web'), { recursive: true });

const pieces = [];
for (const p of plan) {
  const dir = path.join(ROOT, 'piezas', p.dir);
  const { meta, sections } = parseCopy(await readFile(path.join(dir, 'copy.md'), 'utf8'));
  const files = (await readdir(path.join(dir, 'export'))).filter(f => f.endsWith('.png')).sort();
  const slides = [];
  for (const f of files) {
    const web = `web/${f.replace('.png', '.jpg')}`;
    const src = path.join(dir, 'export', f);
    const isSuper = f.includes('super');
    // Los textos del reel se aplanan sobre un fondo oscuro para poder verlos en la página
    let img = sharp(src);
    if (isSuper) img = img.flatten({ background: { r: 58, g: 52, b: 46 } });
    await img.resize({ width: 720 }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(ROOT, web));
    const m = await sharp(path.join(ROOT, web)).metadata();
    slides.push({ web, png: `piezas/${p.dir}/export/${f}`, story: m.height / m.width > 1.5, isSuper, name: f });
  }
  pieces.push({ ...p, meta, sections, slides });
}

// ---------- CAPTIONS.md ----------
let caps = `# Captions · Capítulo III — La Casa\n\nTodos los captions del mes en orden de publicación, listos para copiar.\nLa fuente de cada uno está en \`piezas/<pieza>/copy.md\`.\n\n`;
for (const p of pieces) {
  caps += `---\n\n## Nº ${p.n} · ${p.title}\n**${p.date} · ${p.time}** · ${p.kind}\n\n`;
  caps += `### Caption\n\n${pick(p.sections, 'Caption')}\n\n${p.sections['Hashtags'] ?? ''}\n\n`;
  if (pick(p.sections, 'Versión corta')) caps += `### Versión corta\n\n${pick(p.sections, 'Versión corta')}\n\n`;
}
await writeFile(path.join(ROOT, 'CAPTIONS.md'), caps);

// ---------- index.html ----------
const card = p => `
  <a class="cal" href="#p${p.n}">
    <span class="cal-d">${p.date}</span>
    <img src="${p.slides.find(s => s.name === p.cover).web}" alt="" loading="lazy">
    <span class="cal-n">Nº ${p.n}</span>
    <span class="cal-t">${esc(p.title)}</span>
  </a>`;

const pieceHtml = p => {
  const caption = pick(p.sections, 'Caption');
  const tags = p.sections['Hashtags'] ?? '';
  const short = pick(p.sections, 'Versión corta');
  const extras = Object.entries(p.sections).filter(([k]) => !/^(Caption|Versión corta|Hashtags)/.test(k));
  const video = p.video && existsSync(path.join(ROOT, 'piezas', p.dir, p.video))
    ? `<figure class="slide story vid"><video src="piezas/${p.dir}/${p.video}" controls playsinline preload="metadata" poster="${p.slides[0].web}"></video></figure>` : '';
  return `
<section class="piece" id="p${p.n}">
  <header class="ph">
    <p class="eyebrow">Nº ${p.n} · ${p.kind}</p>
    <h2>${esc(p.title)}</h2>
    <p class="when"><span>${p.date}</span><span>${p.time}</span></p>
    ${p.meta['Rol en la narrativa'] ? `<p class="role">${inline(p.meta['Rol en la narrativa'].replace(/^./, c => c.toUpperCase()))}</p>` : ''}
  </header>
  <div class="rail">
    ${video}
    ${p.slides.map(s => `<a class="slide${s.story ? ' story' : ''}${s.isSuper ? ' super' : ''}" href="${s.png}" target="_blank" title="Abrir PNG final: ${s.name}"><img src="${s.web}" alt="" loading="lazy"></a>`).join('')}
  </div>
  <p class="hint">Desliza → · clic en una imagen para abrir el PNG final</p>
  <div class="cols">
    <div class="capbox">
      <div class="cap-h"><span class="label">Caption</span><button class="copy" data-copy="cap${p.n}">Copiar caption</button></div>
      <div class="cap" id="cap${p.n}">${esc(caption)}\n\n${esc(tags)}</div>
      ${short ? `<div class="cap-h sm"><span class="label">Versión corta</span><button class="copy" data-copy="short${p.n}">Copiar</button></div><div class="cap short" id="short${p.n}">${esc(short)}</div>` : ''}
    </div>
    <div class="details">
      ${extras.map(([k, v], i) => `<details${i === 0 && /Guion|Historias/.test(k) ? ' open' : ''}><summary>${esc(k)}</summary>${md(v)}</details>`).join('')}
    </div>
  </div>
</section>`;
};

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Alma House · La Casa</title>
<meta name="description" content="Capítulo III · La Casa — contenidos de Instagram de Alma House Nails Bar. Por We Rock Agencia.">
<link rel="icon" href="assets/brand/logos/isotipo-terracota.png">
<style>
@font-face{font-family:'Aurora';src:url('assets/brand/fonts/aurora-serif.otf');font-style:normal}
@font-face{font-family:'Aurora';src:url('assets/brand/fonts/aurora-serif-italic.otf');font-style:italic}
@font-face{font-family:'Uncage';src:url('assets/brand/fonts/uncage-vf.ttf');font-weight:100 900}
@font-face{font-family:'Figtree';src:url('assets/brand/fonts/figtree-vf.ttf');font-weight:300 900}
:root{--cream:#F7EFE7;--paper:#FBF6F0;--blush:#CEBAAA;--sage:#A3A287;--brown:#99471D;--bakery:#AF9175;--forest:#3F412F;--espresso:#2A1F1A;--ink:#32342A;--ink2:#5E6150;--line:rgba(50,52,42,.14)}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--cream);color:var(--ink);font-family:'Figtree',system-ui,sans-serif;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
img{display:block;max-width:100%}
.label,.eyebrow{font-family:'Uncage','Figtree',sans-serif;text-transform:uppercase;letter-spacing:.28em;font-size:11px;font-weight:500}
.wrap{max-width:1240px;margin:0 auto;padding:0 32px}

/* Hero */
.hero{background:var(--espresso);color:var(--cream);padding:40px 0 88px;position:relative;overflow:hidden}
.mast{display:flex;align-items:center;gap:20px;color:var(--blush)}
.mast .rule{flex:1;height:1px;background:currentColor;opacity:.3}
.hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:center;margin-top:72px}
.hero h1{font-family:'Aurora',serif;font-weight:400;font-size:clamp(58px,8.4vw,124px);line-height:.86;letter-spacing:-.03em}
.hero h1 em{color:var(--blush)}
.hero .lede{font-family:'Aurora',serif;font-style:italic;font-size:clamp(22px,2.4vw,30px);line-height:1.25;margin-top:32px;max-width:30ch;color:rgba(247,239,231,.9)}
.hero .by{margin-top:40px;color:var(--blush);line-height:2}
.hero .grid img{border-radius:4px;box-shadow:0 30px 80px rgba(0,0,0,.4)}
.chapters{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:80px;background:rgba(247,239,231,.12)}
.chapters div{background:var(--espresso);padding:22px 22px 4px 0}
.chapters .label{color:var(--blush)}
.chapters p{font-family:'Aurora',serif;font-size:22px;line-height:1.2;margin-top:10px}
.chapters .now p{color:var(--blush);font-style:italic}

/* Calendario */
.calendar{padding:72px 0 24px}
.sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:28px}
.sec-h h3{font-family:'Aurora',serif;font-weight:400;font-size:40px;line-height:1}
.sec-h .label{color:var(--bakery)}
.cals{display:grid;grid-template-columns:repeat(7,1fr);gap:14px}
.cal{text-decoration:none;display:flex;flex-direction:column;gap:8px}
.cal img{aspect-ratio:4/5;object-fit:cover;width:100%;border-radius:3px;transition:transform .3s}
.cal:hover img{transform:translateY(-4px)}
.cal-d{font-family:'Uncage',sans-serif;text-transform:uppercase;letter-spacing:.2em;font-size:10px;color:var(--brown)}
.cal-n{font-family:'Uncage',sans-serif;letter-spacing:.2em;font-size:10px;color:var(--bakery)}
.cal-t{font-family:'Aurora',serif;font-size:17px;line-height:1.15}

/* Pieza */
.piece{padding:88px 0 40px;border-top:1px solid var(--line);margin-top:48px}
.ph{display:grid;grid-template-columns:1fr auto;gap:6px 32px;align-items:end}
.ph .eyebrow{color:var(--brown);grid-column:1/-1}
.ph h2{font-family:'Aurora',serif;font-weight:400;font-size:clamp(40px,5.4vw,72px);line-height:.95;letter-spacing:-.02em}
.when{display:flex;gap:10px}
.when span{font-family:'Uncage',sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;border:1px solid var(--ink);border-radius:999px;padding:9px 16px;white-space:nowrap}
.when span:first-child{background:var(--ink);color:var(--cream)}
.role{grid-column:1/-1;color:var(--ink2);max-width:78ch;margin-top:18px}
.rail{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:32px 32px 18px;margin:0 -32px;scrollbar-width:thin}
.slide{flex:0 0 auto;height:500px;aspect-ratio:4/5;scroll-snap-align:start;border-radius:3px;overflow:hidden;background:#ddd;box-shadow:0 14px 40px rgba(50,40,30,.12)}
.slide.story{aspect-ratio:9/16}
.slide{background:var(--blush)}
.slide img,.slide video{width:100%;height:100%;object-fit:cover}
.slide video{background:#000}
.slide.super{opacity:.95}
.hint{font-size:12px;color:var(--bakery);letter-spacing:.04em}
.cols{display:grid;grid-template-columns:1.05fr .95fr;gap:36px;margin-top:32px;align-items:start}
.capbox{background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:26px 28px}
.cap-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;color:var(--bakery)}
.cap-h.sm{margin-top:26px;padding-top:22px;border-top:1px solid var(--line)}
.cap{white-space:pre-line;font-size:15.5px;line-height:1.65}
.cap.short{color:var(--ink2)}
.copy{font-family:'Uncage',sans-serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;background:var(--brown);color:var(--cream);border:0;border-radius:999px;padding:10px 16px;cursor:pointer}
.copy.ok{background:var(--forest)}
.details details{border-bottom:1px solid var(--line)}
.details details:first-child{border-top:1px solid var(--line)}
.details summary{cursor:pointer;list-style:none;padding:16px 0;font-family:'Aurora',serif;font-size:22px;display:flex;justify-content:space-between}
.details summary::after{content:'+';color:var(--brown)}
.details details[open] summary::after{content:'–'}
.details details>*:not(summary){margin-bottom:14px;font-size:14.5px;color:var(--ink2)}
.details ul,.details ol{padding-left:20px}
.details li{margin-bottom:6px}
.details code{font-size:12.5px;background:rgba(153,71,29,.08);padding:1px 5px;border-radius:3px}
.tbl{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13.5px}
th{text-align:left;font-family:'Uncage',sans-serif;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--bakery);padding:8px 10px 8px 0;border-bottom:1px solid var(--line)}
td{padding:10px 10px 10px 0;border-bottom:1px solid var(--line);vertical-align:top}

/* Pie */
.foot{background:var(--forest);color:var(--cream);margin-top:96px;padding:72px 0}
.foot-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px}
.foot h4{font-family:'Aurora',serif;font-weight:400;font-size:32px;line-height:1.05;margin-bottom:16px}
.foot p{color:rgba(247,239,231,.8);font-size:14.5px;margin-bottom:12px}
.foot .label{color:var(--blush)}
.foot a.btn{display:inline-block;margin-top:10px;margin-right:10px;border:1px solid var(--blush);color:var(--cream);text-decoration:none;border-radius:999px;padding:12px 20px;font-family:'Uncage',sans-serif;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase}
.sign{display:flex;justify-content:space-between;align-items:center;margin-top:64px;padding-top:28px;border-top:1px solid rgba(247,239,231,.15)}
.sign img{height:44px}

@media (max-width:900px){
  .hero-grid,.cols,.foot-grid{grid-template-columns:1fr}
  .cals{grid-template-columns:repeat(4,1fr)}
  .chapters{grid-template-columns:1fr}
  .ph{grid-template-columns:1fr}
}
@media (max-width:560px){
  .wrap{padding:0 16px}
  .rail{padding:24px 16px 14px;margin:0 -16px}
  .slide{height:420px}
  .cals{grid-template-columns:repeat(2,1fr)}
  .capbox{padding:20px}
  .sign{flex-direction:column;gap:18px;align-items:flex-start}
}
</style>
</head>
<body>

<header class="hero">
  <div class="wrap">
    <div class="mast label"><span>Alma House · Nails Bar</span><span class="rule"></span><span>Capítulo III · Sep — Oct 2026</span></div>
    <div class="hero-grid">
      <div>
        <h1>Esto no es<br>un spa de uñas.<br><em>Es una casa.</em></h1>
        <p class="lede">Y toda casa tiene sus códigos. Siete contenidos para mostrar cómo se vive adentro.</p>
        <p class="by label">Dirección creativa · We Rock Agencia<br>Cajicá · Colombia</p>
      </div>
      <div class="grid"><img src="preview/feed-grid.jpg" alt="Así queda el perfil de Instagram después de publicar las piezas"></div>
    </div>
    <div class="chapters">
      <div><span class="label">Capítulo I · Expectativa</span><p>“Algo está por llegar.”</p></div>
      <div><span class="label">Capítulo II · Apertura</span><p>“No vendemos manicure. Vendemos tiempo.”</p></div>
      <div class="now"><span class="label">Capítulo III · La Casa</span><p>“Toda casa tiene sus códigos.”</p></div>
    </div>
  </div>
</header>

<main class="wrap">
  <section class="calendar">
    <div class="sec-h"><h3>Calendario</h3><span class="label">${pieces.length} piezas · orden de publicación</span></div>
    <div class="cals">${pieces.map(card).join('')}</div>
  </section>
  ${pieces.map(pieceHtml).join('\n')}
</main>

<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <p class="label">Sobre las imágenes</p>
        <h4>Fotografía de referencia</h4>
        <p>Salvo el reel de la anfitriona, filmado en el local, las fotografías vienen del tablero de Pinterest aprobado por la cliente y pertenecen a sus autores. Se usan como dirección de arte en contenido orgánico, no en pauta paga. El registro de fuentes está en <a href="${REPO}/blob/main/assets/pinterest/SOURCES.md" target="_blank">SOURCES.md</a>.</p>
        <p>Si más adelante una pieza va a pauta, se reemplaza la foto por una sesión propia con la misma dirección, sin rehacer el diseño.</p>
      </div>
      <div>
        <p class="label">Archivos</p>
        <h4>Todo listo para subir</h4>
        <p>Cada imagen de esta página abre su PNG final (1080×1350 feed · 1080×1920 historias y portada del reel). Los captions de todo el mes están también en un solo documento.</p>
        <a class="btn" href="${REPO}/blob/main/CAPTIONS.md" target="_blank">Todos los captions</a>
        <a class="btn" href="${REPO}/archive/refs/heads/main.zip">Descargar todo (.zip)</a>
      </div>
    </div>
    <div class="sign">
      <img src="assets/brand/logos/logo-crema.png" alt="Alma House Nails Bar">
      <span class="label" style="color:var(--blush)">WhatsApp 311 566 2051 · CC Montaña Plaza, piso 2 · Cajicá</span>
    </div>
  </div>
</footer>

<script>
document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async () => {
  const t = document.getElementById(b.dataset.copy).innerText.trim();
  try { await navigator.clipboard.writeText(t); } catch { const r = document.createRange(); r.selectNodeContents(document.getElementById(b.dataset.copy)); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand('copy'); }
  const o = b.textContent; b.textContent = 'Copiado'; b.classList.add('ok'); setTimeout(() => { b.textContent = o; b.classList.remove('ok'); }, 1600);
}));
</script>
</body>
</html>
`;
await writeFile(path.join(ROOT, 'index.html'), html);

// ---------- artifact.html ----------
// Misma página, adaptada al sandbox de claude.ai Artifacts: sin esqueleto propio,
// fuentes embebidas como data URI y archivos pesados (PNG finales, captions) enlazados al repo.
const fontData = async f => `data:font/${f.endsWith('.ttf') ? 'ttf' : 'otf'};base64,${(await readFile(path.join(ROOT, 'assets/brand/fonts', f))).toString('base64')}`;
let art = html
  .replace(/^[\s\S]*?<title>/, '<title>')
  .replace(/<link rel="icon"[^>]*>\n/, '')
  .replace('</head>\n<body>\n', '')
  .replace('</body>\n</html>\n', '')
  .replace(/:root\{--cream/, ':root{color-scheme:light;--cream');
for (const f of ['aurora-serif-italic.otf', 'aurora-serif.otf', 'uncage-vf.ttf', 'figtree-vf.ttf'])
  art = art.replaceAll(`url('assets/brand/fonts/${f}')`, `url('${await fontData(f)}')`);
art = art
  .replace(/href="(piezas\/[^"]+\.png)"/g, `href="${REPO}/blob/main/$1"`)
  .replace('href="CAPTIONS.md"', `href="${REPO}/blob/main/CAPTIONS.md" target="_blank"`)
  .replace('href="assets/pinterest/SOURCES.md"', `href="${REPO}/blob/main/assets/pinterest/SOURCES.md" target="_blank"`)
  .replace(`href="${REPO}/archive/refs/heads/main.zip"`, `href="${REPO}" target="_blank"`)
  .replace('>Descargar todo (.zip)<', '>Abrir el repositorio<')
  .replace('clic en una imagen para abrir el PNG final', 'clic en una imagen para abrir el PNG final en el repositorio');
await writeFile(path.join(ROOT, 'artifact.html'), art);

console.log(`index.html · artifact.html · CAPTIONS.md · web/ (${pieces.reduce((a, p) => a + p.slides.length, 0)} imágenes)`);
