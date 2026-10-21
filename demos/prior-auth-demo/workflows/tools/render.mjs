/* Renders compiled Mermaid to SVG in headless Chromium (Mermaid needs a browser to measure text). */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "..");
const MERMAID_JS = resolve(ROOT, "node_modules/mermaid/dist/mermaid.min.js");

const PLAYWRIGHT = ["/opt/node22/lib/node_modules/playwright/index.mjs", "playwright"].find((p) => p === "playwright" || existsSync(p));
const CHROME = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium"].find((p) => existsSync(p));

/** Give the SVG its real pixel size (Mermaid leaves it at 100% width, which squeezes wide diagrams). */
function sized(svg) {
  const m = svg.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
  if (!m) return svg;
  const w = Math.ceil(+m[1]), h = Math.ceil(+m[2]);
  return svg.replace(/<svg([^>]*?)>/, (all, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "").replace(/\sstyle="[^"]*"/, "")} width="${w}" height="${h}">`);
}

/** Open one browser for a whole build. Call close() when done. */
export async function openRenderer() {
  const { chromium } = await import(PLAYWRIGHT);
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1.5 });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>#stage svg{max-width:none!important}</style><body style="margin:0;background:#fff;width:max-content"><div id="stage" style="display:inline-block;padding:24px"></div></body>`);
  await page.addScriptTag({ path: MERMAID_JS });
  await page.evaluate(() => mermaid.initialize({ startOnLoad: false, securityLevel: "loose" }));
  let n = 0;
  return {
    /** Mermaid text → { svg, error }. */
    async svg(code) {
      const res = await this.raw(code);
      if (res.svg) res.svg = sized(res.svg);
      return res;
    },
    async raw(code) {
      return page.evaluate(
        async ([c, id]) => {
          try {
            const r = await mermaid.render(id, c);
            return { svg: r.svg };
          } catch (e) {
            return { error: String(e?.message ?? e).split("\n").slice(0, 6).join("\n") };
          }
        },
        [code, `g${++n}`],
      );
    },
    /** Draw an SVG on the white stage and save a PNG of it. A big diagram is also cut into overlapping tiles
        (name.t1.png, name.t2.png, ...) so each tile is readable when you look at it. Returns the files written. */
    async png(svg, path, tile = true) {
      await page.evaluate((s) => (document.getElementById("stage").innerHTML = s), svg);
      const box = await page.locator("#stage").boundingBox();
      const files = [path]; if (process.env.WF_DEBUG) console.log("box", JSON.stringify(box));
      await page.locator("#stage").screenshot({ path });
      const TW = 1300, TH = 900, OV = 60;
      if (tile && (box.width > TW * 1.15 || box.height > TH * 1.15)) {
        let k = 0;
        for (let y = 0; y < box.height - OV; y += TH - OV) {
          for (let x = 0; x < box.width - OV; x += TW - OV) {
            const f = path.replace(/\.png$/, `.t${++k}.png`);
            await page.screenshot({ path: f, fullPage: true, clip: { x: box.x + x, y: box.y + y, width: Math.min(TW, box.width - x), height: Math.min(TH, box.height - y) } });
            files.push(f);
          }
        }
      }
      return files;
    },
    close: () => browser.close(),
  };
}
