/* End-to-end check of the mock Lauris pages (src/lauris/*): the stable test hooks in ARCHITECTURE.md, field behaviour, colours, chips, the paused save.

     npx vite build                                  # dist/index.html
     node scripts/lauris-check.mjs [dist/index.html]
     SHOTS=/some/dir node scripts/lauris-check.mjs   # also writes screenshots (1440x900 and 1100x800)

   Part A drives the built page (dist) through the UI only: consumers table, filters, consumer page, document page, every field kind, no horizontal overflow, CSS scoped under .lauris.
   Part B needs the store, which the page does not expose. So the script builds a throwaway copy of the app in a temp folder whose entry also puts the store and the engine on `window.__psyflo`
   (nothing is added to the repo's source), then drives Save, the checking bar, the paused-save banner, the chips, the yellow-to-green change and the flash through the real store actions.
   Nothing here depends on a clinic's content: it finds consumers, documents and findings in the config. Exit code 1 if any check fails. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright/index.js")); }

const dist = path.resolve(process.argv[2] ?? path.join(root, "dist/index.html"));
const SHOTS = process.env.SHOTS ? path.resolve(process.env.SHOTS) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
if (!fs.existsSync(dist)) { console.error(`No ${dist}. Run \`npx vite build\` first.`); process.exit(2); }

let failed = 0;
const ok = (name, cond, detail = "") => {
  if (!cond) failed++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${!cond && detail ? `  -> ${detail}` : ""}`);
};
const note = (s) => console.log(`NOTE  ${s}`);
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };

const T = (id) => `[data-testid="${id}"]`;
const SAVE = T("lauris-save");
const COLUMNS = ["Consumer #", "Name", "Age", "Program", "Site", "Payer", "Clinician", "Units available", "Updated", "Note"];

/* ------------------------------------------------------------------ static: the stylesheet cannot reach the panel ------------------------------------------------------------------ */
function unscopedSelectors(cssPath) {
  const css = fs.readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const bad = [];
  const stack = [];
  let buf = "";
  for (const ch of css) {
    if (ch === "{") {
      const prelude = buf.trim();
      buf = "";
      const inKeyframes = stack.some((p) => /^@(-\w+-)?keyframes/.test(p));
      if (!prelude.startsWith("@") && !inKeyframes) for (const sel of prelude.split(",")) if (!sel.trim().startsWith(".lauris")) bad.push(sel.trim());
      stack.push(prelude);
    } else if (ch === "}") { stack.pop(); buf = ""; }
    else if (ch === ";") buf = "";
    else buf += ch;
  }
  return bad;
}

/* ------------------------------------------------------------------ helpers that read the page ------------------------------------------------------------------ */
const kindOf = (w) =>
  w.evaluate((el) =>
    el.querySelector("[role=textbox]") ? "textarea" : el.querySelector("select") ? "select" : el.querySelector("input[type=checkbox]") ? "checks"
    : el.querySelector("input[type=radio]") ? "yesno" : el.querySelector('input[placeholder="MM/DD/YYYY"]') ? "date" : el.querySelector("input[type=text]") ? "text" : "?");

const overflow = (page) =>
  page.evaluate(() => {
    const main = document.querySelector(".lauris .l-main");
    return { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: main ? main.scrollWidth - main.clientWidth : 0 };
  });

async function watchErrors(page, errors) {
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
}

/* ------------------------------------------------------------------ PART A: the built page, through the UI ------------------------------------------------------------------ */
async function partA(browser, clinicId) {
  console.log(`\n== Part A (dist, UI only) · clinic switch: ${clinicId} ==`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  await watchErrors(page, errors);
  await page.addInitScript(() => { window.__PSYFLO_SPEED__ = 40; });
  await page.goto(pathToFileURL(dist).href);
  if (clinicId !== "harvest") await page.click(`[data-clinic="${clinicId}"]`);

  // consumers
  await page.waitForSelector(T("consumers-table"));
  const heads = (await page.locator(`${T("consumers-table")} thead th`).allTextContents()).map((s) => s.trim());
  ok("consumers table has the ten columns", JSON.stringify(heads) === JSON.stringify(COLUMNS), heads.join(" | "));
  const ids = await page.locator("a[data-consumer]").evaluateAll((as) => as.map((a) => a.getAttribute("data-consumer")));
  ok("every row has one consumer link a[data-consumer]", ids.length > 0 && ids.length === (await page.locator(`${T("consumers-table")} tbody tr`).count()), `${ids.length} links`);
  const bar = (await page.locator(".lauris .l-top").innerText()).replace(/\s+/g, " ");
  ok("top bar: Lauris Online, the mock caption, a signed-in name, Sign Out", /Lauris Online/.test(bar) && /mock for the Psyflo demo · synthetic data/.test(bar) && /Sign Out/.test(bar) && /[A-Z][a-z]+ [A-Z]/.test(bar), bar);
  const inert = await page.locator(".lauris .l-side .lnav.inert").evaluateAll((els) => els.map((e) => ({ t: e.textContent, title: e.getAttribute("title") })));
  ok("left menu: Consumers is live, the others say 'Not part of this demo'", (await page.locator(".lauris .l-side a.lnav").innerText()).startsWith("Consumers") && inert.length >= 5 && inert.every((i) => i.title === "Not part of this demo") && inert.some((i) => /Saved Session/.test(i.t)), JSON.stringify(inert.map((i) => i.t)));
  await shot(page, `1440-${clinicId}-1-consumers`);

  // filter by initials
  const firstIni = (await page.locator("a[data-consumer]").first().innerText()).trim();
  await page.fill("#lc-q", firstIni.toLowerCase().replace(/\./g, ""));
  const names = (await page.locator("a[data-consumer]").allInnerTexts()).map((s) => s.trim());
  ok("search by initials filters the table (typed without dots, any case)", names.length >= 1 && names.length <= ids.length && names.every((n) => n.replace(/\./g, "").toLowerCase().includes(firstIni.toLowerCase().replace(/\./g, ""))), names.join(","));
  await page.fill("#lc-q", "zzzz");
  ok("no match says so", (await page.locator(`${T("consumers-table")} tbody`).innerText()).includes("No consumers match"));
  await page.fill("#lc-q", "");
  ok("clearing the search brings every consumer back", (await page.locator("a[data-consumer]").count()) === ids.length);
  ok("program and payer filters are real selects with an 'All' first option", /^All programs/.test(await page.locator("#lc-program").evaluate((s) => s.options[0].text)) && /^All payers/.test(await page.locator("#lc-payer").evaluate((s) => s.options[0].text)));

  // consumer pages: find one with documents and (if there is one) one without
  let withDocs = null;
  let without = null;
  for (const id of ids) {
    await page.click(`a[data-consumer="${id}"]`);
    await page.waitForSelector(".lauris .hdr");
    const n = await page.locator("[data-doc]").count();
    if (n > 0 && !withDocs) withDocs = id;
    if (n === 0 && !without) { without = id; ok("a consumer without documents says so", /No documents in this demo\. Nothing to scribe or scan here\./.test(await page.locator(T("no-documents")).innerText())); }
    await page.click(".lauris .crumbs a");
    await page.waitForSelector(T("consumers-table"));
    if (withDocs && without) break;
  }
  ok("at least one consumer has documents in the demo", !!withDocs);
  if (!without) note("every consumer in this config has documents; the 'no documents' note was not exercised");
  if (!withDocs) return ctx.close();

  await page.click(`a[data-consumer="${withDocs}"]`);
  await page.waitForSelector("[data-doc]");
  const hdr = (await page.locator(".lauris .hdr").innerText()).replace(/\s+/g, " ");
  ok("consumer header: initials · age · site, consumer #, units line", /· \d+ ·/.test(hdr) && new RegExp(`Consumer # ${withDocs}`).test(hdr) && /units? available until|No authorizations available/.test(hdr), hdr);
  const tabs = await page.locator('.lauris [role=tab]').evaluateAll((els) => els.map((e) => ({ t: e.textContent, on: e.getAttribute("aria-selected"), title: e.getAttribute("title") })));
  ok("tabs row: Documents is on, the rest are inert", tabs.find((t) => t.t === "Documents")?.on === "true" && tabs.filter((t) => t.on !== "true").every((t) => t.title === "Not part of this demo") && tabs.length >= 5, JSON.stringify(tabs));
  const docRows = await page.locator("[data-doc]").evaluateAll((as) => as.map((a) => ({ id: a.getAttribute("data-doc"), t: a.textContent })));
  const statuses = await page.locator(`${T("documents-table")} tbody tr td:nth-child(2)`).allInnerTexts();
  ok("documents table: a link per document with a title, a Saved or Draft tag", docRows.every((d) => d.t.trim().length > 3) && statuses.length === docRows.length && statuses.every((s) => /^(Saved|Draft)$/.test(s.trim())), JSON.stringify(docRows));
  await shot(page, `1440-${clinicId}-2-consumer`);

  // a document
  await page.click(`[data-doc="${docRows[0].id}"]`);
  await page.waitForSelector("[data-field]");
  const wrappers = page.locator("[data-field]");
  const n = await wrappers.count();
  const states = await wrappers.evaluateAll((els) => els.map((e) => e.getAttribute("data-state")));
  ok("every field wrapper carries data-state (typed, lauris or empty)", n > 0 && states.every((s) => s === "" || s === "typed" || s === "lauris"), JSON.stringify(states));
  ok("Save is there and enabled; no flash, checking bar or pause banner yet", (await page.isEnabled(SAVE)) && !(await page.locator(`${T("lauris-flash")}, ${T("lauris-checking")}, ${T("lauris-pause")}`).count()));
  const docStatus = (await page.locator(T("doc-status")).innerText()).trim();
  ok("the document shows a Saved or Draft tag", /^(Saved|Draft)$/.test(docStatus), docStatus);
  await shot(page, `1440-${clinicId}-3-form`);

  // every control has an accessible name
  const unnamed = await page.evaluate(() => {
    const bad = [];
    for (const w of document.querySelectorAll("[data-field]")) {
      for (const c of w.querySelectorAll("input,select,textarea,[role=textbox]")) {
        const named = c.getAttribute("role") === "textbox" ? !!c.getAttribute("aria-label") : (c.labels && c.labels.length > 0 && c.labels[0].textContent.trim() !== "");
        if (!named) bad.push(`${w.getAttribute("data-field")}:${c.tagName}`);
      }
      for (const g of w.querySelectorAll("[role=group],[role=radiogroup]")) {
        const l = document.getElementById(g.getAttribute("aria-labelledby") || "");
        if (!l || !l.textContent.trim()) bad.push(`${w.getAttribute("data-field")}:group`);
      }
    }
    return bad;
  });
  ok("labels are tied to controls (inputs, selects, text boxes, checkbox and radio groups)", unnamed.length === 0, unnamed.join(", "));

  // edit every kind by hand: a person typing never makes a box yellow, and green boxes stay green
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    const w = wrappers.nth(i);
    const key = await w.getAttribute("data-field");
    const kind = await kindOf(w);
    const before = await w.getAttribute("data-state");
    if (kind === "text" || kind === "date") {
      const v = kind === "date" ? "11/02/2026" : "typed by hand";
      await w.locator("input[type=text]").fill(v);
      ok(`[${kind}] ${key}: typing shows in the box`, (await w.locator("input[type=text]").inputValue()) === v);
    } else if (kind === "textarea") {
      await w.locator("[role=textbox]").click();
      await w.locator("textarea").fill("typed by hand in a text box");
      ok(`[textarea] ${key}: click opens a real text area, typing works`, (await w.locator("textarea").inputValue()) === "typed by hand in a text box");
      await w.locator("textarea").press("Escape");
      ok(`[textarea] ${key}: Escape goes back to reading, the words are kept`, (await w.locator("[role=textbox]").innerText()).includes("typed by hand in a text box"));
    } else if (kind === "select") {
      const opts = await w.locator("option").allTextContents();
      ok(`[select] ${key}: blank first option, then the form's options`, opts[0] === "" && opts.length >= 2, JSON.stringify(opts));
      await w.locator("select").selectOption({ index: 1 });
      ok(`[select] ${key}: choosing an option sticks`, (await w.locator("select").inputValue()) === opts[1]);
    } else if (kind === "checks") {
      const first = w.locator("input[type=checkbox]").first();
      await first.check();
      ok(`[checks] ${key}: ticking a box sticks`, await first.isChecked());
      await first.uncheck();
      ok(`[checks] ${key}: unticking works`, !(await first.isChecked()));
      await first.check();
    } else if (kind === "yesno") {
      const labels = await w.locator("input[type=radio]").evaluateAll((rs) => rs.map((r) => r.value));
      ok(`[yesno] ${key}: two radios, Yes and No`, JSON.stringify(labels) === JSON.stringify(["Yes", "No"]), JSON.stringify(labels));
      await w.locator("input[type=radio][value=Yes]").check();
      ok(`[yesno] ${key}: Yes sticks`, await w.locator("input[type=radio][value=Yes]").isChecked());
    }
    ok(`${key}: a hand edit leaves data-state as it was ("${before}")`, (await w.getAttribute("data-state")) === before);
    seen.add(kind);
  }
  note(`field kinds in this document: ${[...seen].join(", ")}`);

  // keyboard: Tab into a text box, Enter opens it, Escape leaves
  const box = page.locator("[data-field] [role=textbox]").first();
  if (await box.count()) {
    await box.focus();
    await page.keyboard.press("Enter");
    ok("keyboard: Enter on a focused text box opens it for typing (focus is in the text area)", await page.evaluate(() => document.activeElement?.tagName === "TEXTAREA"));
    await page.keyboard.press("Escape");
  }

  // breadcrumb back
  await page.click(".lauris .crumbs a >> nth=1");
  await page.waitForSelector("[data-doc]");
  ok("breadcrumb: consumer → back to the consumer's documents", (await page.locator("[data-doc]").count()) > 0 && (await page.locator("[data-field]").count()) === 0);

  // room: no horizontal scroll at the widths the EHR gets next to the panel
  for (const [w, h] of [[1440, 900], [1100, 800], [1000, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const where of ["consumers", "consumer", "form"]) {
      if (where === "consumers") { await page.click(".lauris .l-side a.lnav"); await page.waitForSelector(T("consumers-table")); }
      if (where === "consumer") { await page.click(`a[data-consumer="${withDocs}"]`); await page.waitForSelector("[data-doc]"); }
      if (where === "form") { await page.click(`[data-doc="${docRows[0].id}"]`); await page.waitForSelector("[data-field]"); }
      const o = await overflow(page);
      ok(`no horizontal scroll: ${where} page at ${w}px`, o.page <= 0 && o.main <= 1, JSON.stringify(o));
      if (SHOTS && (w === 1100 || (w === 1440 && where === "form"))) await shot(page, `${w}-${clinicId}-${where}`);
    }
  }
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.click(".lauris .l-side a.lnav");
  await page.waitForSelector(T("consumers-table"));
  const scrolls = await page.evaluate(() => { const t = document.querySelector(".lauris .tscroll"); return t.scrollWidth > t.clientWidth && getComputedStyle(t).overflowX === "auto"; });
  ok("at 1100px the wide consumers table scrolls inside .tscroll", scrolls);

  ok("no console or page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ------------------------------------------------------------------ PART B: a copy of the app that exposes the store ------------------------------------------------------------------ */
async function buildTestBundle() {
  const { build } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;
  const { viteSingleFile } = await import("vite-plugin-singlefile");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lauris-check-"));
  fs.symlinkSync(path.join(root, "node_modules"), path.join(tmp, "node_modules"), "dir");
  fs.writeFileSync(path.join(tmp, "index.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>lauris check</title></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>');
  fs.writeFileSync(path.join(tmp, "entry.tsx"), [
    'import "@fontsource-variable/dm-sans";',
    'import { StrictMode } from "react";',
    'import { createRoot } from "react-dom/client";',
    'import App from "@/App";',
    'import { useStore } from "@/store";',
    'import * as engine from "@/engine";',
    'import "@/tokens.css";',
    'import "@/panel/base.css";',
    '(window as unknown as { __psyflo: unknown }).__psyflo = { store: useStore, engine };',
    'createRoot(document.getElementById("root") as HTMLElement).render(<StrictMode><App /></StrictMode>);',
  ].join("\n"));
  await build({ root: tmp, configFile: false, logLevel: "silent", plugins: [react(), viteSingleFile()], resolve: { alias: { "@": path.join(root, "src") } }, build: { outDir: path.join(tmp, "out"), emptyOutDir: true } });
  return { tmp, html: path.join(tmp, "out", "index.html") };
}

async function partB(browser, html) {
  console.log("\n== Part B (test bundle: store driven) ==");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  await watchErrors(page, errors);
  // real timing (speed 1): the checking bar lasts about a second, long enough to be seen
  await page.goto(pathToFileURL(html).href);
  await page.waitForFunction(() => !!window.__psyflo);

  const S = (fn, arg) => page.evaluate(fn, arg);
  const info = await S(() => {
    const { store, engine } = window.__psyflo;
    const st = store.getState();
    const c = st.clinic;
    const docs = c.docs.map((d) => {
      const spec = c.forms[d.kind];
      const found = spec ? engine.runChecks(c, d.id, d.kind, st.docs[d.id].values, d.consumerId) : [];
      return { id: d.id, kind: d.kind, n: spec ? engine.fieldsOf(spec).length : 0, severe: found.filter((f) => f.severity === "severe").length, anyText: found.filter((f) => f.fix && f.fix.kind === "text").length };
    });
    return { user: c.user.name, pauseAt: st.settings.pauseAt, onSave: st.settings.onSave, docs };
  });
  if (!info.docs.length) { note("this config has no documents; Part B skipped"); await ctx.close(); return; }
  const biggest = [...info.docs].sort((a, b) => b.n - a.n)[0];

  const open = async (docId) => {
    await S((id) => window.__psyflo.store.getState().openDoc(id), docId);
    await page.waitForSelector("[data-field]");
  };
  const fieldsOf = (docId) => S((id) => {
    const { store, engine } = window.__psyflo;
    const c = store.getState().clinic;
    const seed = c.docs.find((d) => d.id === id);
    return engine.fieldsOf(c.forms[seed.kind]);
  }, docId);

  /* B1: Psyflo's typing is yellow in every kind of field, marked in text boxes, and a person's Save turns it green */
  await S(() => window.__psyflo.store.getState().setSettings({ onSave: false }));
  await open(biggest.id);
  ok("the top bar shows the signed-in user", (await page.locator(".lauris .l-top").innerText()).includes(info.user));
  const fields = await fieldsOf(biggest.id);
  const typedBy = {};
  const typable = fields.filter((f) => !f.lock);
  for (const f of typable) {
    typedBy[f.key] = f.kind === "checks" ? [f.options[0]] : f.kind === "select" ? f.options[0] : f.kind === "yesno" ? "Yes" : f.kind === "date" ? "11/03/2026" : f.kind === "textarea" ? "Earlier words. One typed sentence." : "Typed text";
  }
  await S(({ docId, typedBy }) => {
    // exactly what the store's own writeField does to a document: values, typed, appended
    const { store } = window.__psyflo;
    store.setState((s) => {
      const d = s.docs[docId];
      const values = { ...d.values }, typed = { ...d.typed }, appended = { ...d.appended };
      for (const [k, v] of Object.entries(typedBy)) {
        values[k] = v; typed[k] = true;
        if (typeof v === "string" && v.includes("One typed sentence.")) appended[k] = ["One typed sentence."];
      }
      return { docs: { ...s.docs, [docId]: { ...d, values, typed, appended } } };
    });
  }, { docId: biggest.id, typedBy });
  const kindsSeen = new Set();
  for (const f of typable) {
    const w = page.locator(`[data-field="${f.key}"]`);
    kindsSeen.add(f.kind);
    ok(`typed ${f.kind} "${f.key}": data-state="typed"`, (await w.getAttribute("data-state")) === "typed");
    const ctl = f.kind === "checks" || f.kind === "yesno" ? w.locator(".grp") : w.locator(".in");
    ok(`typed ${f.kind} "${f.key}": the control is yellow`, await ctl.first().evaluate((e) => e.classList.contains("y")));
    ok(`typed ${f.kind} "${f.key}": tag "Psyflo typed here · check it" and note "Typed by the Psyflo extension"`, (await w.innerText()).includes("Psyflo typed here · check it") && (await w.innerText()).includes("Typed by the Psyflo extension"));
    if (f.kind === "textarea") {
      const marks = await w.locator("[role=textbox] mark").allInnerTexts();
      ok(`typed textarea "${f.key}": only Psyflo's sentence is marked, not the words before it`, marks.length === 1 && marks[0] === "One typed sentence." && (await w.locator("[role=textbox]").innerText()).startsWith("Earlier words."), JSON.stringify(marks));
    }
    if (f.kind === "checks") ok(`typed checks "${f.key}": the first option is ticked`, await w.locator("input[type=checkbox]").first().isChecked());
    if (f.kind === "yesno") ok(`typed yesno "${f.key}": Yes is chosen`, await w.locator("input[type=radio][value=Yes]").isChecked());
    if (f.kind === "select") ok(`typed select "${f.key}": the option is shown`, (await w.locator("select").inputValue()) === f.options[0]);
  }
  note(`kinds typed into and checked: ${[...kindsSeen].join(", ")}`);
  const locked = fields.filter((f) => f.lock);
  if (locked.length) ok("locked fields show a lock (clinician only)", (await page.locator(`[data-field="${locked[0].key}"] .lock`).count()) === 1);
  ok("the form says how many fields Psyflo typed, unsaved", /typed by Psyflo, not saved yet/.test(await page.locator(".lauris .l-actions .row").innerText()));
  await shot(page, "1440-typed");

  await page.click(SAVE);
  await page.waitForSelector(T("lauris-flash"));
  ok("Save with Check-before-save off: flash 'Saved in Lauris.' in the ok tone", (await page.locator(T("lauris-flash")).innerText()).trim() === "Saved in Lauris." && (await page.locator(T("lauris-flash")).evaluate((e) => e.classList.contains("ok"))));
  let allGreen = true;
  for (const f of typable) {
    const st = await page.locator(`[data-field="${f.key}"]`).getAttribute("data-state");
    if (st !== "lauris") { allGreen = false; ok(`after Save "${f.key}" is data-state="lauris"`, false, st); }
  }
  ok("after Save every typed box is data-state=\"lauris\" (yellow became green)", allGreen);
  const w0 = page.locator(`[data-field="${typable[0].key}"]`);
  ok("after Save the tag reads 'In Lauris' and the yellow note is gone", (await w0.innerText()).includes("In Lauris") && !(await w0.innerText()).includes("Typed by the Psyflo extension"));
  ok("after Save no sentence is marked any more", (await page.locator("[data-field] mark").count()) === 0);
  ok("after Save the document says Saved", (await page.locator(T("doc-status")).innerText()).trim() === "Saved");
  await shot(page, "1440-saved");

  /* B2: chips, from synthetic findings so the grouping is the same for every clinic */
  await S(() => { window.__psyflo.store.getState().setSettings({ onSave: true }); });
  const k1 = typable.find((f) => f.kind === "textarea")?.key ?? typable[0].key;
  const k2 = (typable.find((f) => f.key !== k1) ?? typable[0]).key;
  const mk = (id, sev, key, title) => ({ id, docId: biggest.id, checkId: "t", severity: sev, fieldKey: key, title, why: "", rule: "", fix: null });
  const synth = [mk(`${biggest.id}:t:${k1}:1`, "severe", k1, "Severe one"), mk(`${biggest.id}:t:${k1}:2`, "medium", k1, "Medium one"), mk(`${biggest.id}:t:${k1}:3`, "medium", k1, "Medium two"), mk(`${biggest.id}:t:${k2}:1`, "low", k2, "Low one")];
  const setScan = (stale, status) => S(({ docId, synth, stale, status }) => {
    window.__psyflo.store.setState((s) => ({ scans: { ...s.scans, [docId]: { running: false, scannedAt: s.clinic.today, findings: synth, status, answers: {}, stale } } }));
  }, { docId: biggest.id, synth, stale, status: status ?? Object.fromEntries(synth.map((f) => [f.id, "open"])) });
  ok("no chips before a scan", (await page.locator(T("chip")).count()) === 0);
  await setScan(false);
  const chipsOf = (key) => page.locator(`[data-field="${key}"] ${T("chip")}`);
  const c1 = await chipsOf(k1).evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-finding"), sev: e.getAttribute("data-sev"), text: e.textContent.replace(/^p\./, "").trim(), title: e.getAttribute("title") })));
  ok("a field with 1 severe and 2 medium alerts gets two chips, severe first", c1.length === 2 && c1[0].sev === "severe" && c1[1].sev === "medium", JSON.stringify(c1));
  ok("chip text is the severity and its count ('Severe1', 'Medium2')", c1[0]?.text === "Severe1" && c1[1]?.text === "Medium2", JSON.stringify(c1.map((c) => c.text)));
  ok("each chip's data-finding is the first finding of its group", c1[0]?.id === synth[0].id && c1[1]?.id === synth[1].id, JSON.stringify(c1.map((c) => c.id)));
  ok("hovering shows the finding titles (title attribute)", c1[0]?.title === "Severe one" && c1[1]?.title === "Medium one\nMedium two", JSON.stringify(c1.map((c) => c.title)));
  ok("the other field gets its own low chip", (await chipsOf(k2).count()) === (k1 === k2 ? 3 : 1) && (await chipsOf(k2).last().getAttribute("data-sev")) === "low");
  const sty = await chipsOf(k1).first().evaluate((e) => { const s = getComputedStyle(e); return { color: s.color, border: s.borderTopWidth + " " + s.borderTopColor, bg: s.backgroundColor, mark: e.querySelector(".pmk")?.textContent }; });
  ok("chips are Psyflo's: navy text on white, 1px navy border, a 'p.' mark", sty.color === "rgb(21, 27, 36)" && sty.bg === "rgb(255, 255, 255)" && sty.border.startsWith("1px rgb(21, 27, 36)") && sty.mark === "p.", JSON.stringify(sty));
  await shot(page, "1440-chips");
  await S(() => { const s = window.__psyflo.store.getState(); s.togglePanel(false); });
  await chipsOf(k1).first().click();
  const afterClick = await S(() => { const s = window.__psyflo.store.getState(); return { focus: s.focus, tab: s.tab, panelOpen: s.panelOpen }; });
  ok("clicking a chip calls focusFinding(first id): focus set, Scan tab chosen", afterClick.focus === synth[0].id && afterClick.tab === "scan", JSON.stringify(afterClick));
  ok("clicking a chip while the panel is closed opens the panel", afterClick.panelOpen === true);
  await setScan(false, { ...Object.fromEntries(synth.map((f) => [f.id, "open"])), [synth[1].id]: "dismissed", [synth[3].id]: "added" });
  const c2 = await chipsOf(k1).evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-finding"), n: e.querySelector("b").textContent })));
  ok("dismissing a finding lowers the count; the group's chip now points at the next open one", c2.length === 2 && c2[1].n === "1" && c2[1].id === synth[2].id, JSON.stringify(c2));
  ok("adding (fixing) the only finding of a field removes its chip", k1 === k2 || (await chipsOf(k2).count()) === 0);
  await setScan(false, Object.fromEntries(synth.map((f) => [f.id, "dismissed"])));
  ok("with every finding dismissed there are no chips", (await page.locator(T("chip")).count()) === 0);
  await setScan(true);
  ok("a scan the document has changed since is shown stale (dashed chips)", (await chipsOf(k1).first().evaluate((e) => e.classList.contains("stale"))) === true);
  await setScan(false, {});
  ok("findings with no status are not shown", (await page.locator(T("chip")).count()) === 0);
  await S(({ docId }) => window.__psyflo.store.setState((s) => ({ scans: { ...s.scans, [docId]: undefined } })), { docId: biggest.id });
  await page.waitForSelector("[data-field]");

  /* B3: the real Save flow: checking bar, paused save, chips from a real scan, a fix or an edit, Save again */
  const severeDoc = info.docs.find((d) => d.severe > 0);
  const fresh = async (docId) => {
    await S(() => { const st = window.__psyflo.store.getState(); st.setClinic(st.clinicId); window.__psyflo.store.getState().setSettings({ onSave: true, pauseAt: "severe" }); });
    await open(docId);
  };
  const docStatus = async () => (await page.locator(T("doc-status")).innerText()).trim();
  if (!severeDoc) {
    note("no document in this config has a severe finding; the real paused-save flow was NOT exercised (only the banner's rendering, from synthetic state)");
    await fresh(biggest.id);
    await S(({ docId }) => window.__psyflo.store.setState({ pause: { docId, ids: ["a", "b"] } }), { docId: biggest.id });
    ok("pause banner (synthetic): count and wording", /Psyflo paused this save: 2 alerts need a look\. Fix them in the Psyflo panel, or press Save again to save anyway\./.test((await page.locator(T("lauris-pause")).innerText()).replace(/\s+/g, " ")));
  } else {
    // B3a: pause, chips, a fix or an edit clears the banner, Save
    await fresh(severeDoc.id);
    const draftBefore = await docStatus();
    await shot(page, "1440-before-save");
    await page.click(SAVE);
    await page.waitForSelector(T("lauris-checking"));
    ok("Save with a severe finding: the checking bar shows, in Psyflo's words", /Psyflo is checking this document before it saves…/.test(await page.locator(T("lauris-checking")).innerText()));
    ok("Save is disabled while Psyflo checks", await page.locator(SAVE).isDisabled());
    await shot(page, "1440-checking");
    await page.waitForSelector(T("lauris-pause"));
    ok("the checking bar is gone once the save is paused", (await page.locator(T("lauris-checking")).count()) === 0);
    ok("Save is enabled again", await page.locator(SAVE).isEnabled());
    const ids = await S(() => window.__psyflo.store.getState().pause.ids);
    const pauseText = (await page.locator(T("lauris-pause")).innerText()).replace(/\s+/g, " ");
    ok("pause banner: 'Psyflo paused this save: N alerts need a look…' with N = pause.ids.length", pauseText.includes(`Psyflo paused this save: ${ids.length} alert${ids.length === 1 ? " needs" : "s need"} a look.`) && /press Save again to save anyway/.test(pauseText), pauseText);
    ok("a paused save is not a save: no flash, status unchanged", (await page.locator(T("lauris-flash")).count()) === 0 && (await docStatus()) === draftBefore, await docStatus());
    const chips = await page.locator(T("chip")).evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-finding"), sev: e.getAttribute("data-sev"), inField: e.closest("[data-field]")?.getAttribute("data-field") })));
    const scan = await S((id) => { const x = window.__psyflo.store.getState().scans[id]; return { findings: x.findings.map((f) => ({ id: f.id, sev: f.severity, key: f.fieldKey, status: x.status[f.id] })) }; }, severeDoc.id);
    ok("the scan Check-before-save ran puts chips beside the fields with open findings", chips.length > 0 && chips.every((c) => scan.findings.some((f) => f.id === c.id && f.status === "open" && f.sev === c.sev && f.key === c.inField)), JSON.stringify({ chips, scan }));
    ok("a severe chip is among them", chips.some((c) => c.sev === "severe"));
    await shot(page, "1440-paused");
    if (chips.length) {
      await page.locator(T("chip")).first().click();
      ok("clicking a real chip focuses its finding", (await S(() => window.__psyflo.store.getState().focus)) === chips[0].id);
    }
    const applied = severeDoc.anyText > 0 ? await S((id) => {
      const { store } = window.__psyflo;
      const x = store.getState().scans[id];
      const f = x.findings.find((y) => x.status[y.id] === "open" && y.fix && y.fix.kind === "text");
      if (!f) return null;
      store.getState().fixApply(f.id);
      return { id: f.id, key: f.fieldKey };
    }, severeDoc.id) : null;
    if (applied) {
      // Psyflo's own typing, through the store's real fixApply: yellow, marked, chip gone, banner gone
      const w = page.locator(`[data-field="${applied.key}"]`);
      ok("Psyflo applying a real fix types into the field: data-state=\"typed\" (yellow)", (await w.getAttribute("data-state")) === "typed");
      ok("applying the fix removes that finding's chip", (await page.locator(`${T("chip")}[data-finding="${applied.id}"]`).count()) === 0);
      ok("applying a fix clears the paused-save banner", (await page.locator(T("lauris-pause")).count()) === 0);
      if (await w.locator("[role=textbox] mark").count()) ok("the sentence Psyflo typed is marked in the text box", (await w.locator("[role=textbox] mark").first().innerText()).length > 0);
      await shot(page, "1440-fixed");
    } else {
      note("no plain-quotation fix on the severe document; the banner was cleared by a hand edit instead of a Psyflo fix");
      const target = page.locator("[data-field] input[type=text]").first();
      if (await target.count()) await target.fill("edited by hand");
      else { await page.locator("[data-field] [role=textbox]").first().click(); await page.locator("[data-field] textarea").first().fill("edited by hand"); }
      ok("editing the document clears the paused-save banner", (await page.locator(T("lauris-pause")).count()) === 0);
    }
    for (let i = 0; i < 4 && !(await page.locator(T("lauris-flash")).count()); i++) {
      await page.click(SAVE);
      await page.waitForSelector(`${T("lauris-flash")}, ${T("lauris-pause")}`);
    }
    ok("Save, repeated as the pause asks, ends in a saved document with a flash", (await page.locator(T("lauris-flash")).count()) === 1 && (await docStatus()) === "Saved");

    // B3b: a second Save on a paused document saves anyway, with an amber flash that counts the open alerts
    await fresh(severeDoc.id);
    await page.click(SAVE);
    await page.waitForSelector(T("lauris-pause"));
    const n = await S(() => window.__psyflo.store.getState().pause.ids.length);
    await page.click(SAVE);
    await page.waitForSelector(T("lauris-flash"));
    const flash = await page.locator(T("lauris-flash")).evaluate((e) => ({ t: e.textContent, w: e.classList.contains("w") }));
    ok("pressing Save again saves anyway: an amber flash that counts the open alerts", flash.w && flash.t.startsWith(`Saved in Lauris. ${n} alert`) && /still open\.$/.test(flash.t), JSON.stringify({ n, ...flash }));
    ok("the pause banner is gone after the save", (await page.locator(T("lauris-pause")).count()) === 0);
    ok("the document now says Saved", (await docStatus()) === "Saved");
    ok("after Save-anyway no box is yellow any more", (await page.locator('[data-field][data-state="typed"]').count()) === 0);
    ok("after Save-anyway the alerts that were still open stay as chips (Saving does not dismiss them)", (await page.locator(T("chip")).count()) > 0);
    await shot(page, "1440-saved-anyway");
  }

  /* the flash belongs to one document: another document does not show it */
  if (info.docs.length > 1) {
    const other = info.docs.find((d) => d.id !== (severeDoc ?? biggest).id);
    await open(other.id);
    ok("another document does not show this document's flash, banner or checking bar", (await page.locator(`${T("lauris-flash")}, ${T("lauris-pause")}, ${T("lauris-checking")}`).count()) === 0);
  }

  ok("no console or page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ------------------------------------------------------------------ run ------------------------------------------------------------------ */
const bad = unscopedSelectors(path.join(root, "src/lauris/lauris.css"));
ok("lauris.css: every selector starts with .lauris (it cannot restyle the panel or the shell)", bad.length === 0, bad.slice(0, 5).join(" | "));

const browser = await chromium.launch();
let bundle = null;
try {
  for (const id of ["harvest", "cccsn"]) await partA(browser, id);
  bundle = await buildTestBundle();
  await partB(browser, bundle.html);
} catch (e) {
  failed++;
  console.log(`FAIL  the check itself crashed: ${e && e.stack ? e.stack : e}`);
} finally {
  await browser.close();
  if (bundle && process.env.KEEP_BUNDLE) console.log(`NOTE  test bundle kept at ${bundle.html}`);
  else if (bundle) fs.rmSync(bundle.tmp, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
