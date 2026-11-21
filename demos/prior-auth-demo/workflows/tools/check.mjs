/* Compile and render .flow files so you can look at them.
     node tools/check.mjs src/01-dashboard            every .flow in a folder
     node tools/check.mjs src/01-dashboard/10-x.flow  one file
   Writes PNGs to the folder given with --out (default /tmp/wf-check) and prints node counts or the first error. */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { compileFlow } from "./compile.mjs";
import { openRenderer } from "./render.mjs";

const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const out = resolve(oi >= 0 ? args.splice(oi, 2)[1] : "/tmp/wf-check");
mkdirSync(out, { recursive: true });

const files = args.flatMap((a) => {
  const p = resolve(a);
  return statSync(p).isDirectory() ? readdirSync(p).filter((f) => f.endsWith(".flow")).sort().map((f) => join(p, f)) : [p];
});
if (!files.length) {
  console.error("no .flow files");
  process.exit(2);
}

const r = await openRenderer();
let bad = 0;
for (const f of files) {
  const name = basename(f, ".flow");
  try {
    const c = compileFlow(readFileSync(f, "utf8"), f);
    writeFileSync(join(out, `${name}.mmd`), c.mermaid);
    const res = await r.svg(c.mermaid);
    if (res.error) throw new Error(`Mermaid could not draw ${name}:\n${res.error}`);
    const files = await r.png(res.svg, join(out, `${name}.png`));
    const warn = c.nodes > 45 ? "  <-- too many nodes: split it" : "";
    console.log(`ok   ${name}  ${c.nodes} nodes, ${c.edges} edges${warn}\n     whole: ${files[0]}${files.length > 1 ? `\n     tiles: ${files.slice(1).map((f) => f.split("/").pop()).join(" ")}  (same folder; open these to read the labels)` : ""}`);
  } catch (e) {
    bad++;
    console.log(`FAIL ${name}\n     ${String(e.message).replace(/\n/g, "\n     ")}`);
  }
}
await r.close();
process.exit(bad ? 1 : 0);
