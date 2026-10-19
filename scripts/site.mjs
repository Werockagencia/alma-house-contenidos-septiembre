// Construye la página de guiones (index.html, GitHub Pages) y CAPTIONS.md
// a partir de scripts/plan.mjs + piezas/*/guion.md. Pensada para leerse en el celular durante la grabación.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { plan, chapter } from './plan.mjs';

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

// ---------- CAPTIONS.md ----------
let caps = `# Captions · Capítulo ${chapter.n} — ${chapter.name}\n\n6 reels en orden de publicación. Fuente: \`piezas/<reel>/guion.md\`.\n\n`;
for (const e of eps) caps += `---\n\n## Nº ${e.n} · ${e.title}\n**${e.date} · ${e.time}** · ${e.kind}\n\n${e.sections['Caption']}\n\n${e.sections['Hashtags'] ?? ''}\n\n`;
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
    <p class="by label">6 reels · grabados con celular<br>Guiones · We Rock Agencia</p>
  </div>
</header>

<main class="wrap">
  <section class="sec">
    <h2>La continuidad</h2>
    <p>El capítulo I creó la expectativa, el II abrió la puerta y el III mostró los códigos de la casa. El IV pone la cámara en los ojos de la clienta: se vive la experiencia desde la silla, se escuchan sus sonidos, habla la voz de la marca y se muestra un resultado real. Cierra con el brindis que abre noviembre (carta de cócteles + Miércoles de Amigas).</p>
  </section>

  <section class="sec">
    <h2>Antes de grabar</h2>
    <div class="guide"><ul>
      <li><b>Vertical</b> y en <b>4K a 30 fps</b> (o 1080p a 60 fps). Limpia el lente antes de cada reel.</li>
      <li><b>Luz:</b> cerca de la ventana o con las luces del local encendidas; todas las tomas de un mismo reel con la misma luz.</li>
      <li><b>Bloquea el enfoque y la exposición:</b> deja el dedo presionado sobre lo que quieres enfocar.</li>
      <li><b>Pulso firme:</b> celular con las dos manos y los codos pegados al cuerpo, movimientos lentos y nada de zoom digital.</li>
      <li>Graba <b>2 o 3 segundos de más</b> antes y después de cada toma, y repite las importantes.</li>
      <li><b>Sonido:</b> para los reels 09 y 11, apaga la música del local y graba cerca.</li>
      <li>Si alguien sale hablando, <b>se escucha su voz</b>. Si no habla, que no salga de frente: solo manos.</li>
    </ul></div>
  </section>

  <section class="sec">
    <h2>Calendario</h2>
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
console.log(`index.html · CAPTIONS.md · ${eps.length} reels`);
