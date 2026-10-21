/* One PDF with a page per diagram, each page sized to its diagram so nothing is cut or shrunk.
     node tools/build.mjs && node tools/pdf.mjs      -> out/Psyflo-workflow-diagrams.pdf */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openRenderer, ROOT } from "./render.mjs";

const OUT = join(ROOT, "out");
const idx = JSON.parse(readFileSync(join(OUT, "index.json"), "utf8"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const PAD = 40, HEAD = 96;
const tmp = join(OUT, "_pdf");
mkdirSync(tmp, { recursive: true });
const r = await openRenderer();
const files = [];
for (const [i, d] of idx.entries()) {
  const svg = readFileSync(join(OUT, "svg", d.dir, `${d.name}.svg`), "utf8").replace(/^<\?xml[^>]*>\s*/, "");
  const w = +svg.match(/<svg[^>]*\swidth="(\d+)"/)[1], h = +svg.match(/<svg[^>]*\sheight="(\d+)"/)[1];
  const pw = Math.max(w + PAD * 2, 900), ph = h + PAD * 2 + HEAD;
  const html = `<!doctype html><meta charset="utf-8"><style>
@page{size:${pw}px ${ph}px;margin:0}
html,body{margin:0;background:#fff}
body{font:14px/1.45 'DM Sans','Segoe UI',system-ui,sans-serif;color:#1C2B25;width:${pw}px;height:${ph}px;overflow:hidden;padding:${PAD}px;box-sizing:border-box}
.k{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6B756F;margin:0 0 4px}
h1{font:600 26px/1.2 Georgia,serif;margin:0 0 4px}
.r{color:#4a5650;margin:0}
.r code{background:#F3ECE0;border-radius:6px;padding:1px 6px;font-size:12px}
svg{display:block;max-width:none!important}
</style><body><div style="height:${HEAD - 8}px"><p class="k">${esc(d.module)} · ${d.steps} steps</p><h1>${esc(d.title)}</h1><p class="r">${esc(d.intro)} <code>${esc(d.route)}</code></p></div>${svg}</body>`;
  const f = join(tmp, `${String(i).padStart(3, "0")}.html`);
  writeFileSync(f, html);
  const out = join(tmp, `${String(i).padStart(3, "0")}.pdf`);
  await r.pdf(f, out, { width: `${pw}px`, height: `${ph}px` });
  files.push(out);
}
await r.close();
const target = join(OUT, "Psyflo-workflow-diagrams.pdf");
execFileSync("pdfunite", [...files, target]);
rmSync(tmp, { recursive: true, force: true });
console.log(`PDF: ${idx.length} pages -> ${target}`);
