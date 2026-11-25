// Screenshot a route of a built demo.  Usage:
//   node scripts/shot.mjs <distDir> <route> <out.png> [width=1440] [height=900]
// Build into your own folder first so parallel builds do not collide:
//   ./node_modules/.bin/vite build --outDir dist-mine
import { resolve } from "node:path";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const [, , dist = "dist", route = "/dashboard", out = "shot.png", w = "1440", h = "900"] = process.argv;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const problems = [];
page.on("pageerror", (e) => problems.push(`PAGE ERROR: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`CONSOLE: ${m.text()}`));
await page.goto(`file://${resolve(dist, "index.html")}#${route}`);
await page.waitForTimeout(700);
await page.screenshot({ path: out, fullPage: true });
console.log(problems.length ? problems.join("\n") : "no console errors");
await browser.close();
