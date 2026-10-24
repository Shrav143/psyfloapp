/* One PDF with a page per diagram. Four page shapes (wide, landscape, portrait, tall) are picked by each diagram's proportions and the
   diagram is scaled to fill its page, so nothing is cut. Text stays vector: zoom in a PDF viewer for detail. Printing everything in one
   job lets the pages share their fonts, which keeps the file small enough to email.
     node tools/build.mjs && node tools/pdf.mjs      -> out/Psyflo-workflow-diagrams.pdf */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openRenderer, ROOT } from "./render.mjs";

const OUT = join(ROOT, "out");
const idx = JSON.parse(readFileSync(join(OUT, "index.json"), "utf8"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const SIZES = { land: [2400, 1700], port: [1700, 2400], tall: [1700, 3800], wide: [3800, 1700] };
const M = 48;
const HEAD = 120;
const kindOf = (w, h) => (w / h > 2 ? "wide" : w / h > 1 ? "land" : w / h < 0.5 ? "tall" : "port");

const pages = idx.map((d) => {
  let svg = readFileSync(join(OUT, "svg", d.dir, `${d.name}.svg`), "utf8").replace(/^<\?xml[^>]*>\s*/, "");
  const w = +svg.match(/<svg[^>]*\swidth="(\d+)"/)[1];
  const h = +svg.match(/<svg[^>]*\sheight="(\d+)"/)[1];
  const kind = kindOf(w, h);
  const [pw, ph] = SIZES[kind];
  const sc = Math.min(1.2, (pw - 2 * M) / w, (ph - 2 * M - HEAD) / h);
  svg = svg.replace(/(<svg[^>]*\swidth=")\d+(")/, `$1${Math.round(w * sc)}$2`).replace(/(<svg[^>]*\sheight=")\d+(")/, `$1${Math.round(h * sc)}$2`);
  return { d, svg, kind, sw: Math.round(w * sc), sh: Math.round(h * sc) };
});

const css = Object.entries(SIZES)
  .map(([k, [w, h]]) => `@page ${k}{size:${w}px ${h}px;margin:0} .${k}{page:${k};width:${w}px;height:${h - 2}px}`)
  .join("\n");
const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#fff}
body{font:14px/1.45 'DM Sans','Segoe UI',system-ui,sans-serif;color:#1C2B25}
section{box-sizing:border-box;padding:${M}px;break-before:page;overflow:hidden}
section:first-of-type{break-before:auto}
.k{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#6B756F;margin:0 0 4px}
h1.k{font-weight:400;font-size:13px;margin:0 0 4px}
h2{font:600 30px/1.2 Georgia,serif;margin:0 0 6px}
.r{color:#4a5650;margin:0;font-size:15px}
.r code{background:#F3ECE0;border-radius:6px;padding:1px 6px;font-size:13px}
svg{display:block;max-width:none!important}
${css}
</style><body>${pages
  .map((p, i) => `<section class="${p.kind}"><div style="height:${HEAD - 8}px">${i === 0 || pages[i - 1].d.dir !== p.d.dir ? `<h1 class="k">${esc(p.d.module)}</h1><p class="k">${p.d.steps} steps</p>` : `<p class="k">${esc(p.d.module)} · ${p.d.steps} steps</p>`}<h2>${esc(p.d.title)}</h2><p class="r">${esc(p.d.intro)} <code>${esc(p.d.route)}</code></p></div><div style="width:${p.sw}px;height:${p.sh}px;overflow:hidden;contain:paint">${p.svg}</div></section>`)
  .join("")}</body>`;

const tmp = join(OUT, "_pdf.html");
writeFileSync(tmp, html);
const r = await openRenderer();
const target = join(OUT, "Psyflo-workflow-diagrams.pdf");
await r.pdf(tmp, target);
await r.close();
rmSync(tmp);
console.log(`PDF: ${idx.length} diagrams -> ${target}`);
