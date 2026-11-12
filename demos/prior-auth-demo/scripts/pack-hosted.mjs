/* Turn a hosted build into the page body the Artifact tool wraps in its own skeleton, plus a full test wrapper.
     VITE_HOSTED=1 npx vite build --outDir dist-hosted
     node scripts/pack-hosted.mjs dist-hosted/index.html out-fragment.html [out-wrapper.html] */
import { readFileSync, writeFileSync } from "node:fs";

const [src, out, wrap] = process.argv.slice(2);
if (!src || !out) {
  console.error("usage: node scripts/pack-hosted.mjs <dist/index.html> <fragment.html> [wrapper.html]");
  process.exit(2);
}
const html = readFileSync(src, "utf8");
const style = [...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join("\n");
const script = html.match(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/)?.[0];
if (!style || !script) throw new Error("the build has no inline style or module script; was it built with vite-plugin-singlefile?");
const fragment = `<title>Psyflo Prior Auth</title>\n${style}\n<div id="root"></div>\n${script}\n`;
writeFileSync(out, fragment);
if (wrap) writeFileSync(wrap, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0">${fragment}</body></html>`);
console.log(`fragment ${(fragment.length / 1e6).toFixed(2)} MB -> ${out}`);
