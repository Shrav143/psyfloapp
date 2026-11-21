/* Turn the single-file build into the page body the Artifact tool wraps in its own skeleton, plus a full wrapper to test it in.
     npx vite build
     node scripts/pack-hosted.mjs dist/index.html out-fragment.html out-wrapper.html
     node scripts/e2e.mjs out-wrapper.html        (the same checks, against the packed page) */
import { readFileSync, writeFileSync } from "node:fs";

const [src, out, wrap] = process.argv.slice(2);
if (!src || !out) { console.error("usage: node scripts/pack-hosted.mjs <dist/index.html> <fragment.html> [wrapper.html]"); process.exit(2); }
const html = readFileSync(src, "utf8");
const style = [...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join("\n");
const script = html.match(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/)?.[0];
if (!style || !script) throw new Error("the build has no inline style or module script; was it built with vite-plugin-singlefile?");
const fragment = `<title>Psyflo Extension Demo</title>\n${style}\n<div id="root"></div>\n${script}\n`;
writeFileSync(out, fragment);
if (wrap) writeFileSync(wrap, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{color-scheme:light}body{margin:0}</style></head><body>${fragment}</body></html>`);
console.log(`fragment ${(fragment.length / 1e6).toFixed(2)} MB -> ${out}`);
