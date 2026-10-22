/* Build every diagram and the one-file viewer.
     node tools/build.mjs            -> out/Psyflo-workflow-diagrams.html, out/svg/, out/mmd/
     node tools/build.mjs --strict   -> also fail on goto nodes that do not resolve to a diagram */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileFlow, KINDS } from "./compile.mjs";
import { openRenderer } from "./render.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "out");
const STRICT = process.argv.includes("--strict");
const LENIENT = process.argv.includes("--lenient"); // skip a file that does not compile, to build while others are still writing

/** Folder → the name on the sidebar of the app (or the area), shown in the viewer. */
const MODULES = {
  "00-overview": ["Overview", "How to read the diagrams, the whole site map, and one request from referral to decision."],
  "01-global-shell": ["Global shell", "The sidebar, the top bar (site switcher, Ask FLO, Notifications, Demo menu with Viewing as), Help, Sign out, redirects and toasts."],
  "02-dashboard": ["Dashboard", "The cockpit: lifecycle chips, what to do next, one table of authorizations with days in state, units, window and owner, and the request drawer."],
  "03-authorizations": ["Authorizations › Queue and case page", "The queue ranked by how soon each is due, the quick view, and the case page with its five tabs."],
  "04-new-case": ["Authorizations › New case", "Five steps for five request types: Intake, Eligibility & Benefits, Clinical documentation, Authorization preparation, Review & submit."],
  "05-eligibility": ["Authorizations › Eligibility & Benefits", "List, verify a patient, the live check and the verdict."],
  "06-denials": ["Denial Intelligence", "Open denials, where each is weak, the options with chances, the peer-to-peer brief, the appeal, accept."],
  "07-case-manager": ["Case Manager", "Active cases (being prepared, and the tracker) and Reviews this week."],
  "08-analytics": ["Analytics", "Owner view: approval and denial trends, the payer scorecard, payer by case-mix, denial reasons, case-level drill-down and the monthly report."],
  "09-emr-connect": ["EMR Connect", "Connected systems, sync, field mappings and fixes."],
  "10-payers": ["Payers", "Each payer's process, rules, documents and the changes to acknowledge."],
  "12-payer-studio": ["Payers › Workflow Studio", "The visual builder: pick or start a workflow, drag nodes, connect branches, configure a node, validate, test with a fictional case, publish and keep versions."],
  "11-settings": ["Settings", "The sixteen agents, how much freedom each has, Pause all, and Sites and access."],
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const words = (s) => new Set(s.toLowerCase().replace(/continues in:?/g, "").replace(/[^a-z0-9& ]+/g, " ").split(/\s+/).filter((w) => w && !["the", "a", "of", "to", "and", "in", "on", "for", "an", "tab", "page", "step", "screen"].includes(w)));

/* 1. Read and compile every .flow. */
const folders = readdirSync(SRC).filter((d) => /^\d\d-/.test(d)).sort();
const diagrams = [];
const errors = [];
for (const dir of folders) {
  if (!MODULES[dir]) errors.push(`folder ${dir} has no entry in MODULES (tools/build.mjs)`);
  const files = readdirSync(join(SRC, dir)).filter((f) => f.endsWith(".flow")).sort();
  for (const f of files) {
    const path = join(SRC, dir, f);
    try {
      const c = compileFlow(readFileSync(path, "utf8"), `${dir}/${f}`);
      diagrams.push({ dir, file: f, name: f.replace(/\.flow$/, ""), id: `${dir.slice(0, 2)}-${slug(f.replace(/\.flow$/, ""))}`, ...c });
    } catch (e) {
      errors.push(e.message);
    }
  }
}
if (errors.length) {
  console.error(errors.join("\n\n"));
  if (!LENIENT) process.exit(1);
  console.error(`\n(--lenient: skipped ${errors.length} file(s))\n`);
}

/* 2. Draw them. */
rmSync(OUT, { recursive: true, force: true });
const r = await openRenderer();
let drawErr = 0;
for (const d of diagrams) {
  const res = await r.svg(d.mermaid);
  if (res.error) {
    drawErr++;
    console.error(`FAIL ${d.dir}/${d.file}\n  ${res.error.replace(/\n/g, "\n  ")}`);
    continue;
  }
  d.svg = res.svg;
  mkdirSync(join(OUT, "svg", d.dir), { recursive: true });
  mkdirSync(join(OUT, "mmd", d.dir), { recursive: true });
  writeFileSync(join(OUT, "svg", d.dir, `${d.name}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${d.svg}`);
  writeFileSync(join(OUT, "mmd", d.dir, `${d.name}.mmd`), d.mermaid + "\n");
}

/* One small drawing per kind for the legend. */
const swatches = {};
for (const [k, v] of Object.entries(KINDS)) {
  const code = [
    `%%{init: {"theme":"base","flowchart":{"htmlLabels":true,"useMaxWidth":false,"padding":6}} }%%`,
    "flowchart LR",
    `  n@{ shape: ${v.shape}, label: "${v.name}" }`,
    `  classDef k fill:${v.fill},stroke:${v.stroke},color:${v.color},stroke-width:${v.width ?? 1.5}px${v.dash ? `,stroke-dasharray:${v.dash}` : ""}`,
    "  class n k",
  ].join("\n");
  swatches[k] = (await r.svg(code)).svg ?? "";
}
await r.close();
if (drawErr) process.exit(1);

/* 3. Resolve goto nodes to diagrams or modules. */
const byTitle = diagrams.map((d) => ({ d, w: words(`${d.meta.title}`) }));
const modWords = Object.entries(MODULES).map(([dir, [name]]) => ({ dir, w: words(name) }));
const unresolved = [];
const SHOW_LINKS = process.argv.includes("--links");
const linkOf = (d, id, label) => {
  const t = linkOf0(d, id, label);
  if (SHOW_LINKS) console.log(`${d.dir}/${d.name}: "${label.replace(/\\n/g, " / ")}"  ->  ${t ?? "UNRESOLVED"}`);
  return t;
};
const linkOf0 = (d, id, label) => {
  const asked = words(label);
  if (!asked.size) return null;
  const exactDiagram = byTitle.find((t) => t.d !== d && [...asked].every((w) => t.w.has(w)) && [...t.w].every((w) => asked.has(w)));
  if (exactDiagram) return `#${exactDiagram.d.id}`;
  const exactModule = modWords.find((m) => m.dir !== d.dir && [...asked].every((w) => m.w.has(w)) && [...m.w].every((w) => asked.has(w)));
  if (exactModule) return `#m-${exactModule.dir}`;
  let best = null;
  for (const t of byTitle) {
    if (t.d === d) continue;
    const hit = [...asked].filter((w) => t.w.has(w)).length / asked.size;
    /* The best share of words wins; among equals the first diagram in reading order is the entry to that area. */
    if (hit >= 0.75 && (!best || hit > best.score)) best = { score: hit, d: t.d };
  }
  if (best) return `#${best.d.id}`;
  const asModule = modWords.filter((m) => m.dir !== d.dir && [...asked].every((w) => m.w.has(w)));
  if (asModule.length) return `#m-${asModule[0].dir}`;
  unresolved.push(`${d.dir}/${d.file}: ${id}  "${label.replace(/\\n/g, " / ")}"`);
  return null;
};
/* compileFlow returns counts only; read the nodes again from the source text for search and for goto links. */
for (const d of diagrams) {
  const text = readFileSync(join(SRC, d.dir, d.file), "utf8");
  d.labels = [];
  d.links = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^(\w+)\s+([A-Za-z][A-Za-z0-9_]*)\s+"(.*)"\s*$/);
    if (!m || !KINDS[m[1]]) continue;
    d.labels.push(m[3].replace(/\\n/g, " "));
    if (m[1] === "goto") {
      const t = linkOf(d, m[2], m[3].split("\\n")[0]);
      if (t) {
        if (!d.links.some(([id]) => id === m[2])) d.links.push([m[2], t]);
      }
    }
  }
}
if (unresolved.length) {
  console.warn(`\n${unresolved.length} goto node(s) do not point at a diagram or module:\n  ${unresolved.join("\n  ")}\n`);
  if (STRICT) process.exit(1);
}

/* GitHub draws Mermaid fences in Markdown, so each menu tab also gets a page that reads in the repository. */
mkdirSync(join(OUT, "md"), { recursive: true });
for (const m of Object.keys(MODULES)) {
  const ds = diagrams.filter((d) => d.dir === m);
  if (!ds.length) continue;
  const body = ds.map((d) => `## ${d.meta.title}\n\n${d.meta.intro}\n\nRoute: \`${d.meta.route}\`${d.meta.also ? `\n\n${d.meta.also}` : ""}\n\n\`\`\`mermaid\n${d.mermaid}\n\`\`\`\n`).join("\n");
  writeFileSync(join(OUT, "md", `${m}.md`), `# ${MODULES[m][0]}\n\n${MODULES[m][1]}\n\nShapes and colours: see \`00-overview.md\`. Source: \`workflows/src/${m}/\`.\n\n${body}`);
}

writeFileSync(join(OUT, "index.json"), JSON.stringify(diagrams.map((d) => ({ dir: d.dir, module: MODULES[d.dir][0], name: d.name, id: d.id, title: d.meta.title, route: d.meta.route, intro: d.meta.intro, steps: d.nodes })), null, 1));

/* 4. The viewer. */
const mods = Object.keys(MODULES).filter((m) => diagrams.some((d) => d.dir === m));
/* Every drawing carries the same 7 KB of CSS; keep one copy of each distinct stylesheet and point the drawings at it by class. */
const sheets = new Map();
const lean = (svg) => {
  const m = svg.match(/<svg[^>]*\sid="([^"]+)"[^>]*>\s*<style>([\s\S]*?)<\/style>/);
  if (!m) return svg;
  const css = m[2].split(`#${m[1]}`).join(".WF");
  if (!sheets.has(css)) sheets.set(css, `wf${sheets.size}`);
  const cls = sheets.get(css);
  return svg.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<svg([^>]*?)\sclass="([^"]*)"/, `<svg$1 class="$2 ${cls}"`);
};
for (const d of diagrams) {
  d.view = lean(d.svg);
  const dm = d.view.match(/<svg[^>]*\swidth="(\d+)"[^>]*\sheight="(\d+)"/);
  d.w = dm ? +dm[1] : 800;
  d.h = dm ? +dm[2] : 600;
}
for (const k of Object.keys(swatches)) swatches[k] = lean(swatches[k]);
const sheetCss = [...sheets].map(([css, cls]) => css.split(".WF").join(`svg.${cls}`)).join("\n");

const stat = { diagrams: diagrams.length, steps: diagrams.reduce((a, d) => a + d.nodes, 0), modules: mods.length };

const legendRows = Object.entries(KINDS)
  .map(([k, v]) => `<div class="kind"><div class="sw paper">${swatches[k]}</div><div class="txt"><b>${esc(v.name)}</b><p>${esc(v.means)}</p></div></div>`)
  .join("");

/* In the menu, drop the leading words the section heading already says: "Authorizations › New case › Referral › Start screen" reads "Referral › Start screen". */
const navLabel = (d, m) => {
  const segs = d.meta.title.split(" › ").map((x) => x.trim());
  const mod = MODULES[m][0].split(" › ");
  let i = 0;
  while (i < segs.length - 1 && i < mod.length && segs[i].toLowerCase() === mod[i].toLowerCase()) i++;
  return segs.slice(i).join(" › ");
};
const nav = mods
  .map((m) => {
    const items = diagrams
      .filter((d) => d.dir === m)
      .map((d) => `<a href="#${d.id}" data-d="${d.id}" title="${esc(d.meta.title)}">${esc(navLabel(d, m))}</a>`)
      .join("");
    return `<div class="ng" data-m="${m}"><a class="nh" href="#m-${m}">${esc(MODULES[m][0])}<span>${diagrams.filter((d) => d.dir === m).length}</span></a>${items}</div>`;
  })
  .join("");

const cards = (m) =>
  diagrams
    .filter((d) => d.dir === m)
    .map(
      (d) => `
<article class="card" id="${d.id}" data-q="${esc((d.meta.title + " " + d.meta.intro + " " + d.meta.route + " " + d.labels.join(" ")).toLowerCase())}">
  <header>
    <div>
      <h3>${esc(d.meta.title)}</h3>
      <p class="intro">${esc(d.meta.intro)}</p>
      ${d.meta.also ? `<p class="also">${esc(d.meta.also)}</p>` : ""}
    </div>
    <div class="meta"><code class="route">${esc(d.meta.route)}</code><span class="n">${d.nodes} steps</span></div>
  </header>
  <div class="bar">
    <button type="button" data-act="fit">Fit</button>
    <button type="button" data-act="out" aria-label="Zoom out">−</button>
    <span class="pct" aria-live="polite">100%</span>
    <button type="button" data-act="in" aria-label="Zoom in">+</button>
    <button type="button" data-act="full">Full screen</button>
    <button type="button" data-act="src" aria-expanded="false">Mermaid source</button>
    <button type="button" data-act="copy" hidden>Copy source</button>
  </div>
  <div class="vp paper" tabindex="0" aria-label="Diagram: ${esc(d.meta.title)}" data-w="${d.w}" data-h="${d.h}"><div class="ph">Loading the diagram...</div></div>
  <pre class="src" hidden></pre>
</article>`,
    )
    .join("");

const sections = mods
  .map(
    (m) => `
<section class="mod" id="m-${m}">
  <h2>${esc(MODULES[m][0])}</h2>
  <p class="lede">${esc(MODULES[m][1])}</p>
  ${m === "00-overview" ? `<article class="card" id="legend"><header><div><h3>The sixteen shapes</h3><p class="intro">The shape says what kind of step it is. The colour says who does it. Every diagram in this document uses only these.</p></div></header><div class="kinds">${legendRows}</div><div class="by"><span><i style="background:#DCEBFA"></i>Blue: a person</span><span><i style="background:#EEE5FA"></i>Purple: FLO and the agents</span><span><i style="background:#EEF0EE"></i>Grey: the app</span><span><i style="background:#FFE6D2"></i>Orange: outside party</span><span><i style="background:#FFF0CC"></i>Amber: decision</span><span><i style="background:#D5F0EA"></i>Teal: data saved</span><span><i style="background:#FFFDF8;border:2px solid #1F5C4B"></i>Cream: screen</span><span><i style="background:#DDEFE3"></i>Green and red: the ends</span></div></article>` : ""}
  ${cards(m)}
</section>`,
  )
  .join("");

/* The drawings travel compressed and are unpacked as they scroll into view, so the page opens fast on a phone. */
const gz = (text) => gzipSync(Buffer.from(text, "utf8"), { level: 9 }).toString("base64");
const data = Object.fromEntries(diagrams.map((d) => [d.id, { z: gz(d.view), m: gz(d.mermaid), l: d.links }]));
const tpl = readFileSync(join(ROOT, "tools/viewer.template.html"), "utf8");
const html = tpl
  .replace("</style>", () => `${sheetCss}\n</style>`)
  .replace("<!--NAV-->", nav)
  .replace("<!--SECTIONS-->", sections)
  .replace("<!--DATA-->", () => `<script type="application/json" id="d">${JSON.stringify(data)}</script>`)
  .replace(/__DIAGRAMS__/g, String(stat.diagrams))
  .replace(/__STEPS__/g, String(stat.steps))
  .replace(/__MODULES__/g, String(stat.modules));
/* The Artifact tool wraps a fragment in its own skeleton; the standalone file needs one of its own. */
const cut = html.indexOf("</style>") + "</style>".length;
const standalone = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}[hidden]{display:none!important}</style>\n${html.slice(0, cut)}</head><body>${html.slice(cut)}</body></html>\n`;
writeFileSync(join(OUT, "Psyflo-workflow-diagrams.html"), standalone);
writeFileSync(join(OUT, "artifact-fragment.html"), html);

console.log(`Built ${stat.diagrams} diagrams (${stat.steps} steps) in ${stat.modules} modules -> ${join(OUT, "Psyflo-workflow-diagrams.html")}`);
const big = diagrams.filter((d) => d.nodes > 45);
if (big.length) console.log(`Over 45 steps (consider splitting): ${big.map((d) => `${d.dir}/${d.file} (${d.nodes})`).join(", ")}`);
