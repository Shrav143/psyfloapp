#!/usr/bin/env node
/* Checks the four views owned by panel-scribe: Scribe, Ask, History, Clinic profile. It asserts the stable test hooks in ARCHITECTURE.md
   and the behaviour around them, in a real browser, against the built single file.

     npx vite build
     node scripts/panel-scribe-check.mjs dist/index.html [--shots <dir>]
     node scripts/panel-scribe-check.mjs http://localhost:5174     (against `npx vite`: also catches React's development warnings)

   It reads everything from the loaded clinic (documents, topics, history), so it needs a build whose clinic has at least one Scribe scenario.
   Needs `playwright` (chromium preinstalled; never run `playwright install`). Exit code 1 when a check fails. A path that cannot be
   reached from the panel is reported as SKIP, with the reason, and is not a pass. */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { console.error("playwright was not found (require('playwright'))."); process.exit(2); }

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const shotsAt = args.includes("--shots") ? resolve(args[args.indexOf("--shots") + 1]) : null;
const arg = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--shots");
// a built file, or a running dev server (http://localhost:5174): the dev server also surfaces React's own warnings (keys, nesting, controlled inputs)
const dist = arg && /^https?:\/\//.test(arg) ? arg : resolve(arg ?? join(here, "..", "dist", "index.html"));
const url = /^https?:\/\//.test(dist) ? dist : `file://${dist}`;
if (shotsAt) mkdirSync(shotsAt, { recursive: true });

const results = [];
const ok = (name) => { results.push({ name, state: "ok" }); console.log(`  ok    ${name}`); };
const bad = (name, why) => { results.push({ name, state: "FAIL", why }); console.log(`  FAIL  ${name}\n          ${String(why).split("\n")[0]}`); };
const skip = (name, why) => { results.push({ name, state: "SKIP", why }); console.log(`  SKIP  ${name} (${why})`); };
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const truthy = (v, what) => { if (!v) throw new Error(`${what}: expected a truthy value, got ${JSON.stringify(v)}`); };
class Skip extends Error {}
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { if (e instanceof Skip) skip(name, e.message); else bad(name, e.message ?? e); } }

/* ---------- static: the four views carry no clinic, program, form or clinical wording of their own ---------- */
function sourceFiles(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? sourceFiles(p) : [p]; });
}
const own = [
  join(here, "..", "src/panel/views/ScribeView.tsx"), join(here, "..", "src/panel/views/AskView.tsx"),
  join(here, "..", "src/panel/views/HistoryView.tsx"), join(here, "..", "src/panel/views/ClinicView.tsx"),
  ...sourceFiles(join(here, "..", "src/panel/views/scribe")),
];
await check("static: no clinic, payer, program or form name in the four views", async () => {
  const words = /harvest|cccsn|\btdt\b|therapeutic day|anthem|medicaid|aetna|\bisp\b|\bdpn\b|\bsra\b|virginia|nevada/i;
  const hits = own.flatMap((f) => readFileSync(f, "utf8").split("\n").map((l, i) => ({ f, l, i })).filter((x) => !/^\s*(\/\/|\/\*|\*)/.test(x.l) && words.test(x.l.replace(/DocKind|"dpn"|"sra"/g, ""))));
  if (hits.length) throw new Error(hits.map((h) => `${h.f.split("src/")[1]}:${h.i + 1}`).join(", "));
});

/* ---------------------------------- browser ---------------------------------- */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const problems = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
await page.addInitScript(() => { window.__PSYFLO_SPEED__ = 40; });
await page.goto(url);

const T = (id) => page.locator(`[data-testid="${id}"]`);
const panel = T("panel");
const speed = (v) => page.evaluate((x) => { window.__PSYFLO_SPEED__ = x; }, v);
const shot = async (name) => { if (shotsAt) await panel.screenshot({ path: join(shotsAt, `${name}.png`) }); };
const text = async (loc) => ((await loc.innerText()) ?? "").replace(/\s+/g, " ").trim();
const tab = async (id) => { await T(`tab-${id}`).click(); eq(await T(`tab-${id}`).getAttribute("aria-selected"), "true", `tab ${id} selected`); };
const lineCount = () => page.locator(".scr-line").count();
/** Nothing in the panel may stick out sideways at 400px: not the scroll area, not any element past the panel's right edge. */
async function fits(label) {
  const r = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="panel"]').getBoundingClientRect();
    const body = [...document.querySelectorAll(".psy-body, .scr-capt")].filter((e) => e.offsetParent);
    const wide = body.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => `${b.className} ${b.scrollWidth}>${b.clientWidth}`);
    const out = [...document.querySelectorAll('[data-testid="panel"] *')].filter((e) => {
      if (e.closest(".sr-only") || !e.offsetParent) return false;
      const b = e.getBoundingClientRect();
      return b.width > 0 && (b.right > p.right + 1 || b.left < p.left - 1);
    }).slice(0, 3).map((e) => `${e.tagName}.${e.className}`);
    return { w: Math.round(p.width), wide, out };
  });
  truthy(r.w === 400 || r.w === 399, `${label}: panel width is 400px (less its 1px border), got ${r.w}`);
  if (r.wide.length) throw new Error(`${label}: scrolls sideways (${r.wide.join("; ")})`);
  if (r.out.length) throw new Error(`${label}: sticks out of the panel (${r.out.join("; ")})`);
}
/** The number of cards the review will type: included, with something in them. */
const included = () => page.evaluate(() => {
  const filled = (c) => {
    const f = c.querySelector("textarea, input[type=text], select");
    if (f) return f.value.trim().length > 0;
    const r = [...c.querySelectorAll("input[type=radio]")];
    if (r.length) return r.some((x) => x.checked);
    return [...c.querySelectorAll("input[type=checkbox]")].slice(1).some((x) => x.checked);
  };
  return [...document.querySelectorAll("[data-draft]")].filter((c) => c.querySelector("input[type=checkbox]").checked && filled(c)).length;
});
const typeCount = async () => { const m = /Type (\d+) fields? into/.exec(await text(T("scribe-type"))); return m ? +m[1] : NaN; };
const focusedIsHeading = () => page.evaluate(() => !!document.activeElement && document.activeElement.matches("[data-stage-heading]"));

/** From the panel only: open some other document in the EHR through History. Returns its id, or null. */
async function openOtherDoc(notIn) {
  await tab("history");
  for (const t of ["documents", "sessions"]) {
    await T(`hist-tab-${t}`).click();
    const items = page.locator('[data-testid="hist-item"][data-doc-id]');
    for (let i = 0, n = await items.count(); i < n; i++) {
      const id = await items.nth(i).getAttribute("data-doc-id");
      const open = items.nth(i).locator('[data-testid="hist-open"]');
      if (id && !notIn.includes(id) && (await open.count())) { await open.click(); return id; }
    }
  }
  return null;
}

/** Put a Scribe document on the EHR page using only the panel: the start list, else History, else via a document that has no scenario (which lists them). */
async function gotoScribeDoc(id, otherThan) {
  const viaList = async () => {
    await tab("scribe");
    const b = page.locator(`[data-testid="scribe-open-doc"][data-doc-id="${id}"]`);
    if (!(await b.count())) return false;
    await b.click();
    return true;
  };
  if (await viaList()) return true;
  await tab("history");
  for (const t of ["documents", "sessions"]) {
    await T(`hist-tab-${t}`).click();
    const o = page.locator(`[data-testid="hist-item"][data-doc-id="${id}"] [data-testid="hist-open"]`);
    if (await o.count()) { await o.first().click(); await tab("scribe"); return true; }
  }
  if (await openOtherDoc(otherThan)) return viaList();
  return false;
}

console.log(`panel-scribe check on ${dist}`);

/* ----------------------------- Scribe: start ----------------------------- */
console.log("Scribe");
let docs = [];
await tab("scribe");
await check("no document open: empty state and the documents that have a scenario", async () => {
  truthy((await text(panel)).includes("Open a document in Lauris to scribe it"), "empty-state sentence");
  const b = page.locator('[data-testid="scribe-open-doc"]');
  truthy((await b.count()) >= 1, "at least one document with a scenario is listed (the loaded clinic needs a Scribe scenario)");
  docs = await b.evaluateAll((els) => els.map((e) => ({ id: e.dataset.docId, label: e.innerText.replace(/\s+/g, " ").trim(), live: /Live session/.test(e.innerText) })));
  await fits("empty state");
  await shot("scribe-0-empty");
});
if (docs.length === 0) { console.log("\nNo Scribe scenario in this build; nothing more to check for Scribe."); }
const doc = docs.find((d) => d.live) ?? docs[0];
const dicDoc = docs.find((d) => !d.live);
const scribeIds = docs.map((d) => d.id);
const short = doc ? (await page.locator(`[data-testid="scribe-open-doc"][data-doc-id="${doc.id}"] b`).innerText()).trim() : "";

if (doc) {
  await page.locator(`[data-testid="scribe-open-doc"][data-doc-id="${doc.id}"]`).click();
  await check("start: New session card, document, mode control, telehealth, chart summary, simulated line", async () => {
    await T("scribe-start").waitFor();
    const t = await text(panel);
    for (const s of ["New session", "Document:", short, "Consumer:", "Listening to:", "Microphone: built-in (simulated)", "Simulated recording: the demo plays a scripted conversation.", "Chart summary — what Psyflo reads first"])
      truthy(t.includes(s), `start screen shows "${s}"`);
    eq(await page.locator("[data-mode]").count(), 2, "two session types");
    eq(await page.locator('[data-mode="live"]').getAttribute("aria-pressed"), doc.live ? "true" : "false", "live pressed follows the scenario's mode");
    await fits("start");
    await shot("scribe-1-start");
  });
  await check("start: Live session / Dictation changes the button; telehealth is a switch", async () => {
    await page.locator('[data-mode="dictation"]').click();
    eq(await text(T("scribe-start")), "Start dictation", "dictation button label");
    await page.locator('[data-mode="live"]').click();
    eq(await text(T("scribe-start")), "Continue", "live button label");
    const sw = T("scribe-telehealth");
    eq(await sw.getAttribute("role"), "switch", "telehealth role");
    eq(await sw.getAttribute("aria-checked"), "false", "telehealth starts off");
    await sw.click();
    eq(await sw.getAttribute("aria-checked"), "true", "telehealth on");
    await sw.click();
    eq(await sw.getAttribute("aria-checked"), "false", "telehealth off again");
  });
  await check("start: the chart summary opens and lists stored records", async () => {
    const fold = page.locator("button.scr-fold");
    eq(await fold.getAttribute("aria-expanded"), "false", "closed first");
    await fold.click();
    eq(await fold.getAttribute("aria-expanded"), "true", "open");
    truthy((await page.locator(".scr-recs li").count()) >= 1, "at least one record");
    await fits("start with chart summary");
    await shot("scribe-1b-chart-summary");
    await fold.click();
  });

  /* ------------------------------ consent ------------------------------ */
  await check("consent: script in a quote, Declined says nothing was recorded, Back returns", async () => {
    await T("scribe-start").click();
    await T("consent-yes").waitFor();
    truthy(await focusedIsHeading(), "focus moved to the stage heading");
    truthy((await text(page.locator(".scr-quote"))).length > 10, "the consent script is shown");
    eq(await text(T("consent-yes")), "Patient consented — start recording", "yes label");
    eq(await text(T("consent-no")), "Declined", "no label");
    await shot("scribe-2-consent");
    await T("consent-no").click();
    truthy((await text(panel)).includes("Recording is off. Nothing was recorded."), "declined message");
    eq(await T("consent-yes").count(), 0, "no way to record after declining");
    await shot("scribe-2b-declined");
    await page.locator('[data-testid="consent-back"]').click();
    await T("scribe-start").waitFor();
  });

  /* ------------------------------ capturing ------------------------------ */
  await check("capturing: orb, timer, status, live transcript, pause and resume", async () => {
    await speed(6);
    await T("scribe-start").click();
    await T("consent-yes").click();
    await page.waitForFunction(() => document.querySelectorAll(".scr-line").length >= 3);
    truthy(await page.locator(".p-orb").isVisible(), "orb");
    eq(await text(T("scribe-status")), "Listening…", "status while listening");
    truthy(/^\d+:\d\d$/.test(await text(T("scribe-timer"))), "timer is a clock");
    const log = page.locator('.scr-log[role="log"]');
    eq(await log.getAttribute("aria-live"), "polite", "transcript is a polite live region");
    truthy((await text(log)).length > 20, "transcript text");
    await shot("scribe-3-capturing");
    await fits("capturing");
    await T("scribe-pause").click();
    eq(await text(T("scribe-pause")), "Resume", "pause turns into resume");
    eq(await text(T("scribe-status")), "Paused", "status while paused");
    truthy(await page.locator(".p-orb.paused").count(), "orb has the paused class");
    const n1 = await lineCount();
    await page.waitForTimeout(700);
    eq(await lineCount(), n1, "no new lines while paused");
    await T("scribe-pause").click();
    await page.waitForFunction((n) => document.querySelectorAll(".scr-line").length > n, n1, { timeout: 8000 });
    eq(await page.locator(".p-orb.paused").count(), 0, "orb pulses again");
    const both = await page.evaluate(() => ({ clock: document.querySelector('[data-testid="scribe-timer"]').textContent.trim(), last: [...document.querySelectorAll(".scr-line .t")].pop().textContent.trim() }));
    eq(both.clock, both.last, "timer shows the clock of the last heard line");
  });
  await check("generating: two steps and Cancel", async () => {
    await T("scribe-complete").waitFor();
    await speed(1);
    await T("scribe-complete").click();
    await T("scribe-generating").waitFor();
    const t = await text(T("scribe-generating"));
    truthy(/1\. Reading the chart/.test(t) && /2\. Writing the draft from what was said/.test(t), "both steps");
    eq(await page.locator('.scr-step[aria-current="step"]').count(), 1, "one current step");
    truthy(await focusedIsHeading(), "focus moved to the stage heading");
    await shot("scribe-4-generating");
    await T("scribe-cancel").click();
    await T("scribe-start").waitFor();
  });

  /* ------------------------------ review ------------------------------ */
  let typedKeysUnticked = null;
  let editedKey = null;
  let nBefore = 0;
  await speed(40);
  await T("scribe-start").click();
  await T("consent-yes").click();
  await page.waitForFunction(() => document.querySelectorAll(".scr-line").length >= 4);
  await T("scribe-complete").click();
  await check("review: one card per field in form order, with kind, source and the forced-review box", async () => {
    await page.waitForSelector("[data-draft]", { timeout: 20000 });
    truthy(await focusedIsHeading(), "focus moved to the review heading");
    const t = await text(panel);
    truthy(t.includes("Review the draft"), "heading");
    truthy(t.includes("Psyflo wrote only what was said or what the chart already says. Check every card."), "one-line promise");
    const cards = await page.locator("[data-draft]").evaluateAll((els) => els.map((e) => ({
      key: e.dataset.draft, source: e.dataset.source,
      firstIsCheckbox: e.querySelector("input")?.type === "checkbox",
      kind: e.querySelector(".p-kind")?.textContent,
      chip: (e.querySelector(".scr-src")?.innerText ?? e.querySelector(".scr-chips .p-chip")?.innerText ?? "").replace(/\s+/g, " ").trim(),
    })));
    truthy(cards.length >= 2, "at least two cards");
    truthy(cards.every((c) => c.firstIsCheckbox), "the include checkbox comes first in every card");
    truthy(cards.every((c) => ["session", "chart", "none"].includes(c.source)), "every card has a source");
    truthy(cards.every((c) => c.kind), "every card shows its kind");
    for (const c of cards) {
      if (c.source === "session") truthy(/^From the session/.test(c.chip), `session chip on ${c.key}: ${c.chip}`);
      if (c.source === "chart") truthy(/^From the chart · .+/.test(c.chip), `chart chip on ${c.key}: ${c.chip}`);
      if (c.source === "none") eq(c.chip, "Not stated", `not-stated chip on ${c.key}`);
    }
    eq(await T("scribe-reviewed").count(), 1, "the I-have-read box");
    truthy((await text(page.locator("label:has([data-testid=scribe-reviewed])"))).includes("I have read the whole draft"), "its label");
    truthy(await T("scribe-type").isDisabled(), "Type is disabled until the draft is read");
    await shot("scribe-5-review");
    await fits("review");
  });
  await check("review: a session chip shows its clock times and opens the transcript with the lines marked", async () => {
    const card = page.locator('[data-draft][data-source="session"]').first();
    if (!(await card.count())) throw new Error("no card is drafted from the session in this scenario");
    const chip = card.locator("button.scr-src");
    truthy(/\d+:\d\d/.test(await text(chip)), `the chip shows clock times: ${await text(chip)}`);
    eq(await chip.getAttribute("aria-expanded"), "false", "closed first");
    await chip.click();
    eq(await chip.getAttribute("aria-expanded"), "true", "open");
    truthy((await card.locator(".scr-line.hl").count()) >= 1, "a marked line");
    await shot("scribe-5b-source-open");
    await chip.click();
    eq(await card.locator(".scr-line").count(), 0, "closes again");
  });
  await check("review: a chart chip shows the quoted record", async () => {
    const card = page.locator('[data-draft][data-source="chart"]').first();
    if (!(await card.count())) return;
    await card.locator("button.scr-src").click();
    truthy((await text(card.locator(".scr-rec"))).length > 8, "the stored record's words");
    await card.locator("button.scr-src").click();
  });
  await check("review: not-stated cards say so, and typing creates the card, included", async () => {
    const empties = page.locator('[data-draft][data-source="none"]');
    const n = await empties.count();
    if (!n) return;
    const t = await text(empties.first());
    truthy(/does not guess/.test(t) && /Type your own words, or leave it for later\./.test(t), "the not-stated sentence");
    let typedInto = null;
    for (let i = 0; i < n && !typedInto; i++) {
      const c = empties.nth(i);
      const f = c.locator("textarea, input[type=text]");
      if (!(await f.count())) continue;
      const box = c.locator("input[type=checkbox]").first();
      eq(await box.isChecked(), false, "not included before typing");
      const before = await included();
      await f.fill("Typed by the clinician in the test.");
      eq(await box.isChecked(), true, "included once typed");
      eq(await included(), before + 1, "the count goes up by one");
      typedInto = await c.getAttribute("data-draft");
    }
    if (!typedInto) throw new Error("no not-stated card with a text input to type into");
  });
  await check("review: edit one card (edited chip), untick another, the count follows", async () => {
    const cards = page.locator('[data-draft][data-source="session"], [data-draft][data-source="chart"]');
    const n = await cards.count();
    let edited = null;
    for (let i = 0; i < n && !edited; i++) {
      const c = cards.nth(i);
      const f = c.locator("textarea, input[type=text]");
      if (!(await f.count())) continue;
      await f.fill(`${await f.inputValue()} (edited)`);
      truthy(await c.locator('[data-testid="draft-edited"]').count(), "edited chip");
      edited = await c.getAttribute("data-draft");
    }
    if (!edited) throw new Error("no card with a text editor to edit");
    editedKey = edited;
    nBefore = await included();
    const boxes = page.locator("[data-draft]");
    let un = null;
    for (let i = (await boxes.count()) - 1; i >= 0 && !un; i--) {
      const c = boxes.nth(i);
      const k = await c.getAttribute("data-draft");
      if (k === edited || !(await c.locator("input[type=checkbox]").first().isChecked())) continue;
      const f = c.locator("textarea, input[type=text], select");
      if ((await f.count()) && !(await f.first().inputValue()).trim()) continue;
      await c.locator("input[type=checkbox]").first().uncheck();
      un = k;
    }
    if (!un) throw new Error("no included card to untick");
    typedKeysUnticked = un;
    eq(await included(), nBefore - 1, "the count goes down by one");
    nBefore -= 1;
  });
  await check("review: Clinician only list, then the box enables Type with the right count", async () => {
    const t = await text(panel);
    const lockedList = page.locator(".scr-locks li");
    if (await lockedList.count()) truthy(t.includes("Clinician only (Psyflo does not draft these)"), "locked heading");
    else console.log("          (this form has no clinician-only fields)");
    await T("scribe-reviewed").check();
    eq(await T("scribe-type").isDisabled(), false, "Type is enabled after the box");
    eq(await typeCount(), nBefore, "the button's number matches the ticked cards");
    await T("scribe-reviewed").uncheck();
    truthy(await T("scribe-type").isDisabled(), "unticking the box disables Type again");
    await T("scribe-reviewed").check();
    await shot("scribe-5c-review-ready");
  });
  await check("review: Regenerate goes back to generating and a new review starts unread", async () => {
    await T("scribe-regenerate").click();
    await T("scribe-generating").waitFor();
    await page.waitForSelector("[data-draft]", { timeout: 20000 });
    eq(await T("scribe-reviewed").isChecked(), false, "the box is empty on the new draft");
    truthy(await T("scribe-type").isDisabled(), "Type is disabled again");
    // the fresh draft has the model's own choices again: edit one, untick one, read all, as before
    const cards = page.locator('[data-draft][data-source="session"], [data-draft][data-source="chart"]');
    for (let i = 0, n = await cards.count(); i < n; i++) {
      const f = cards.nth(i).locator("textarea, input[type=text]");
      if (!(await f.count())) continue;
      await f.fill(`${await f.inputValue()} (edited)`);
      editedKey = await cards.nth(i).getAttribute("data-draft");
      break;
    }
    const un = page.locator(`[data-draft="${typedKeysUnticked}"] input[type=checkbox]`).first();
    if (await un.isChecked()) await un.uncheck();
    await T("scribe-reviewed").check();
    nBefore = await included();
    eq(await typeCount(), nBefore, "count after regenerating");
  });

  /* ------------------------------ typed ------------------------------ */
  await check("typed: the fields typed, yellow, Psyflo does not save, next steps", async () => {
    await T("scribe-type").click();
    await T("scribe-typed").waitFor();
    truthy(await focusedIsHeading(), "focus moved to the typed heading");
    const t = await text(T("scribe-typed"));
    truthy(/\d+ fields? typed into Lauris/.test(t), `heading: ${t.slice(0, 60)}`);
    truthy(t.includes("They are yellow. Check them, then press Save in Lauris. Psyflo does not save."), "yellow and save sentence");
    const chips = await page.locator(".scr-typed-list li").count();
    truthy(chips >= 1 && chips <= nBefore, `typed ${chips} of ${nBefore} included`);
    eq(await T("scribe-to-scan").count(), 1, "scan button");
    truthy((await text(panel)).includes("Start another session") && (await text(panel)).includes("Back to Home"), "other buttons");
    await shot("scribe-6-typed");
    await fits("typed");
    // when the mock EHR is in place, the typed fields are yellow there and the unticked one is not
    if (await page.locator("[data-field]").count()) {
      eq(await page.locator('[data-field][data-state="typed"]').count(), chips, "yellow boxes in the EHR match the typed list");
      truthy((await page.locator(`[data-field="${typedKeysUnticked}"]`).getAttribute("data-state")) !== "typed", "the unticked card was not typed");
      const v = await page.locator(`[data-field="${editedKey}"] textarea, [data-field="${editedKey}"] input[type=text]`).first().inputValue().catch(() => "");
      if (v) truthy(v.includes("(edited)"), "the edited text is what was typed");
    } else console.log("          (the EHR is a stub here: the yellow boxes were not checked)");
  });
  await check("typed: Scan this note opens Scan & Enhance; Start another session returns to the start", async () => {
    await T("scribe-to-scan").click();
    eq(await T("tab-scan").getAttribute("aria-selected"), "true", "scan tab");
    await tab("scribe");
    await T("scribe-typed").waitFor();
    await page.locator('[data-testid="scribe-another"]').click();
    await T("scribe-start").waitFor();
  });

  /* ------------------------------ dictation ------------------------------ */
  await check("dictation: no consent step, a single speaker, same review", async () => {
    if (!dicDoc || dicDoc.id === doc.id) throw new Skip("this clinic has no dictation scenario");
    if (!(await gotoScribeDoc(dicDoc.id, scribeIds))) throw new Skip("the dictation document cannot be reached from the panel (stub EHR)");
    await T("scribe-start").waitFor();
    eq(await page.locator('[data-mode="dictation"]').getAttribute("aria-pressed"), "true", "dictation is the default for this scenario");
    eq(await text(T("scribe-start")), "Start dictation", "label");
    await T("scribe-start").click();
    await page.waitForFunction(() => document.querySelectorAll(".scr-line").length >= 2);
    eq(await T("consent-yes").count(), 0, "no consent step");
    eq(await page.locator(".scr-line b").count(), 0, "no speaker names: one speaker");
    truthy(/dictating/i.test(await text(panel)), "heading says dictating");
    await shot("scribe-7-dictating");
    await T("scribe-complete").click();
    await page.waitForSelector("[data-draft]", { timeout: 20000 });
    await T("scribe-discard").click();
  });

  /* ------------------------------ recover ------------------------------ */
  const scribeDoc = doc.id;
  async function startRecording() {
    if (!(await gotoScribeDoc(scribeDoc, scribeIds))) return false;
    if ((await T("scribe-start").count()) === 0) return false;
    await speed(6);
    await T("scribe-start").click();
    if (await T("consent-yes").count()) await T("consent-yes").click();
    await page.waitForFunction(() => document.querySelectorAll(".scr-line").length >= 3);
    return true;
  }
  let canLeave = true;
  await check("recover: leaving the document while recording keeps the lines; Resume returns and records", async () => {
    truthy(await startRecording(), "could not start a recording on the scenario document from the panel");
    const other = await openOtherDoc([scribeDoc]);
    if (!other) { canLeave = false; throw new Skip("History offers no other document to leave to, and the EHR is a stub"); }
    await tab("scribe");
    await T("scribe-resume").waitFor();
    eq(await T("scribe-discard").count(), 1, "discard offered");
    const t = await text(panel);
    truthy(/Recover session/.test(t) && /Your recording was interrupted\. \d+ lines? (was|were) captured\./.test(t), `recover wording: ${t.slice(0, 120)}`);
    await shot("scribe-8-recover");
    await fits("recover");
    await T("scribe-resume").click();
    await T("scribe-complete").waitFor();
    truthy((await text(T("context"))).includes(short), `the EHR page is the scribed document again (${short})`);
    await page.waitForFunction(() => document.querySelectorAll(".scr-line").length >= 4);
  });
  if (canLeave) {
    await check("recover: Discard drops the recording", async () => {
      const other = await openOtherDoc([scribeDoc]);
      truthy(other, "another document");
      await tab("scribe");
      await T("scribe-resume").waitFor();
      await T("scribe-discard").click();
      eq(await T("scribe-resume").count(), 0, "nothing left to resume");
      eq(await T("scribe-complete").count(), 0, "not recording");
    });
  }
  await speed(40);

  /* ------------------------------ no scenario ------------------------------ */
  const history = await (async () => {
    await tab("history");
    const ids = new Set();
    for (const t of ["documents", "sessions"]) {
      await T(`hist-tab-${t}`).click();
      for (const id of await page.locator('[data-testid="hist-item"][data-doc-id]').evaluateAll((els) => els.map((e) => e.dataset.docId))) ids.add(id);
    }
    return [...ids];
  })();
  const plain = history.find((id) => !scribeIds.includes(id));
  if (plain) {
    await check("no scenario: 'not set up' with a way to Scan & Enhance", async () => {
      const got = await openOtherDoc(scribeIds);
      truthy(got, "could not open a document without a scenario");
      await tab("scribe");
      truthy((await text(panel)).includes("Scribe is not set up for this form"), "not-set-up sentence");
      await shot("scribe-9-not-set-up");
      await page.locator('[data-testid="scribe-go-scan"]').click();
      eq(await T("tab-scan").getAttribute("aria-selected"), "true", "scan tab");
    });
  } else skip("no scenario: 'not set up' state", "every document reachable from History has a Scribe scenario");
}

/* ----------------------------------- Ask ----------------------------------- */
console.log("Ask");
await tab("ask");
await check("ask: heading, subtitle, disclaimer, suggested questions without {ini}", async () => {
  const t = await text(panel);
  truthy(t.includes("Ask Psyflo"), "heading");
  truthy(t.includes("Answers come from this consumer's chart and your clinic's own documents, with the sources shown."), "subtitle");
  const d = await text(T("ask-disclaimer"));
  truthy(/Pre-written for the demo \(Simulated\)/.test(d) && /decision support, not a clinical decision/.test(d), `disclaimer: ${d}`);
  const chips = page.locator("[data-topic]");
  truthy((await chips.count()) >= 1, "at least one suggested question");
  truthy(!(await chips.allInnerTexts()).some((x) => x.includes("{ini}")), "{ini} is replaced in the chips");
  await shot("ask-1-start");
  await fits("ask");
});
await check("ask: a chip asks the question: typing dots, then the answer with its sources", async () => {
  await speed(1);
  const chip = page.locator("[data-topic]").first();
  const q = await text(chip);
  await chip.click();
  await T("ask-typing").waitFor({ timeout: 500 });
  truthy(await page.locator(".p-bubble.you").count(), "the question appears as a bubble");
  eq(await text(page.locator(".p-bubble.you").first()), q, "the question reads as the chip");
  await T("ask-answer").waitFor({ timeout: 5000 });
  eq(await T("ask-typing").count(), 0, "the dots are gone");
  const a = T("ask-answer").first();
  const t = await text(a);
  truthy(!t.includes("{ini}"), "{ini} replaced in the answer");
  truthy(/sources/i.test(t), "sources shown");
  truthy((await a.locator(".ask-src").count()) >= 1, "at least one source");
  truthy((await a.locator(".ask-src .p-kind").allInnerTexts()).every((k) => ["CHART", "CLINIC", "REFERENCE"].includes(k.toUpperCase())), "each source names its kind");
  await speed(40);
  await shot("ask-2-answer");
  await fits("ask answer");
});
await check("ask: a chart source opens the stored record", async () => {
  const more = page.locator(".ask-more").first();
  if (!(await more.count())) {
    // ask each topic until one has a chart source
    for (const id of await page.locator("[data-topic]").evaluateAll((els) => els.map((e) => e.dataset.topic))) {
      await page.locator(`[data-topic="${id}"]`).click();
      await page.waitForFunction((n) => document.querySelectorAll('[data-testid="ask-answer"]').length > n, await T("ask-answer").count());
      if (await page.locator(".ask-more").count()) break;
    }
  }
  const m = page.locator(".ask-more").first();
  if (!(await m.count())) { console.log("          (no topic here has a chart source with a stored record)"); return; }
  await m.click();
  truthy((await text(page.locator(".ask-rec").first())).length > 8, "the record's words");
  eq(await m.getAttribute("aria-expanded"), "true", "expanded");
  await shot("ask-3-record");
});
await check("ask: typed question (Enter sends), no-match fallback, Send button, Clear", async () => {
  const before = await T("ask-answer").count();
  await T("ask-input").fill("zzqx purple elephants");
  await T("ask-input").press("Enter");
  eq(await T("ask-input").inputValue(), "", "the box clears when sent");
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="ask-answer"]').length > n, before);
  const fb = T("ask-answer").last();
  truthy(/will not guess/.test(await text(fb)), "the honest fallback is shown");
  truthy((await fb.locator("[data-suggest]").count()) >= 1, "the fallback offers questions it can answer");
  await shot("ask-4-fallback");
  // the Send button, with the first chip's own words
  const q = await text(page.locator("[data-topic]").first());
  const before2 = await T("ask-answer").count();
  truthy(await T("ask-send").isDisabled() === true, "Send is disabled with an empty box");
  await T("ask-input").fill(q);
  await T("ask-send").click();
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="ask-answer"]').length > n, before2);
  // Shift+Enter must not send
  await T("ask-input").fill("a");
  await T("ask-input").press("Shift+Enter");
  eq(await T("ask-answer").count(), before2 + 1, "Shift+Enter does not send");
  await T("ask-input").fill("");
  await page.locator('[data-testid="ask-clear"]').click();
  eq(await T("ask-answer").count(), 0, "cleared");
  eq(await page.locator(".p-bubble").count(), 0, "no bubbles left");
});
await check("ask: no horizontal overflow with a long conversation", async () => {
  for (const id of (await page.locator("[data-topic]").evaluateAll((els) => els.map((e) => e.dataset.topic))).slice(0, 4)) {
    const n = await T("ask-answer").count();
    await page.locator(`[data-topic="${id}"]`).click();
    await page.waitForFunction((k) => document.querySelectorAll('[data-testid="ask-answer"]').length > k, n);
  }
  await fits("ask conversation");
  await shot("ask-5-long");
  await page.locator('[data-testid="ask-clear"]').click();
});

/* --------------------------------- History --------------------------------- */
console.log("History");
await tab("history");
await check("history: Documents and Sessions tabs, grouped by day, newest first", async () => {
  await T("hist-tab-documents").click();
  eq(await T("hist-tab-documents").getAttribute("aria-pressed"), "true", "documents tab on");
  const days = async () => page.locator(".his-root h3").allInnerTexts();
  const re = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), [A-Z][a-z]{2} \d{1,2}(, \d{4})?$/;
  for (const t of ["documents", "sessions"]) {
    await T(`hist-tab-${t}`).click();
    const h = await days();
    truthy(h.every((x) => re.test(x.trim())), `day headings read like "Thursday, Oct 29": ${h.join(" | ")}`);
  }
  await T("hist-tab-documents").click();
  await shot("history-1-documents");
  await fits("history");
  truthy((await T("hist-item").count()) + (await (async () => { await T("hist-tab-sessions").click(); return T("hist-item").count(); })()) >= 1, "history has items");
});
await check("history: each item shows document, initials, status, by; Open in Lauris when it has a document", async () => {
  for (const t of ["documents", "sessions"]) {
    await T(`hist-tab-${t}`).click();
    const items = T("hist-item");
    for (let i = 0, n = await items.count(); i < n; i++) {
      const it = items.nth(i);
      const txt = await text(it);
      truthy(/ · /.test(txt) && /By .+/.test(txt), `item ${i} shows "document · initials" and "By …": ${txt}`);
      const has = (await it.getAttribute("data-doc-id")) !== null;
      eq(await it.locator('[data-testid="hist-open"]').count(), has ? 1 : 0, `open button iff docId (${txt})`);
    }
  }
});
await check("history: search by initials filters the list; no match shows an empty state; clearing restores it", async () => {
  await T("hist-tab-documents").click();
  let total = await T("hist-item").count();
  if (!total) { await T("hist-tab-sessions").click(); total = await T("hist-item").count(); }
  truthy(total >= 1, "an item to search for");
  const ini = (await T("hist-item").first().locator(".his-t span").innerText()).trim();
  await T("hist-search").fill(ini.toLowerCase());
  const items = T("hist-item");
  const n = await items.count();
  truthy(n >= 1 && n <= total, `${n} of ${total} match "${ini}"`);
  truthy((await items.allInnerTexts()).every((s) => s.includes(ini)), "every shown item is for those initials");
  await T("hist-search").fill("zzzz");
  eq(await T("hist-item").count(), 0, "no items for a bad search");
  truthy(await T("hist-empty").isVisible(), "empty state shown");
  await shot("history-2-empty");
  await T("hist-search").fill("");
  eq(await T("hist-item").count(), total, "everything is back");
});
await check("history: a Scribe session that was typed shows under Sessions, dated today", async () => {
  if (!doc) throw new Skip("no Scribe scenario in this build");
  await T("hist-tab-sessions").click();
  await T("hist-search").fill("");
  truthy((await T("hist-item").allInnerTexts()).some((t) => /Scribed: \d+ fields? typed into Lauris/.test(t)), "a 'Scribed: n fields typed into Lauris' item");
  await shot("history-3-sessions");
});
await check("history: Open in Lauris opens that document (the EHR page changes)", async () => {
  await T("hist-tab-documents").click();
  const o = page.locator('[data-testid="hist-item"][data-doc-id] [data-testid="hist-open"]').first();
  if (!(await o.count())) { await T("hist-tab-sessions").click(); }
  const b = page.locator('[data-testid="hist-item"][data-doc-id] [data-testid="hist-open"]').first();
  truthy(await b.count(), "an item with a document");
  const item = b.locator("xpath=ancestor::*[@data-testid='hist-item']");
  const name = (await item.locator(".his-t b").innerText()).trim();
  await b.click();
  truthy((await text(T("context"))).includes(name), `the page strip reads "${name}"`);
});

/* ---------------------------------- Clinic ---------------------------------- */
console.log("Clinic");
await tab("clinic");
await check("clinic: header, read-only line, the eight sections", async () => {
  const t = await text(panel);
  truthy((await text(page.locator(".cln-head h2"))).length > 1, "clinic name");
  truthy(t.includes("Set by your admin · you can read it, not change it"), "read-only line");
  const titles = await page.locator(".cln-sec > summary .ttl").allInnerTexts();
  eq(titles.join("|"), ["Programs and sites", "Payers", "Accreditations", "Wording rules", "Document standards", "Checks Psyflo runs", "Data retention", "Check before save"].join("|"), "sections in order");
  truthy(t.includes("This panel looks the same at every clinic. Only this profile and the checks change."), "closing note");
  truthy(t.includes("Demo: switch the clinic in the browser bar."), "demo line");
  await shot("clinic-1");
  await fits("clinic");
});
await check("clinic: sections open and close; checks are grouped by module with severity chips", async () => {
  const secs = page.locator("details.cln-sec");
  for (let i = 0, n = await secs.count(); i < n; i++) await secs.nth(i).evaluate((e) => { e.open = true; });
  await fits("clinic, all open");
  await shot("clinic-2-open");
  const checks = page.locator("[data-check]");
  const n = await checks.count();
  truthy(n >= 1, "at least one check listed");
  truthy((await checks.locator(".p-chip").allInnerTexts()).every((s) => ["Low", "Medium", "Severe"].includes(s.trim())), "severity chips");
  truthy((await page.locator(".cln-mod h3").count()) >= 1, "module headings");
  truthy((await checks.allInnerTexts()).every((s) => /Applies to: .+/.test(s)), "each check lists the documents it applies to");
  for (let i = 0, k = await secs.count(); i < k; i++) await secs.nth(i).evaluate((e, last) => { e.open = last; }, i === k - 1);
});
await check("clinic: Check before save: the switch and the severity select are live", async () => {
  const sw = T("set-onsave");
  eq(await sw.getAttribute("role"), "switch", "switch role");
  const was = await sw.getAttribute("aria-checked");
  await sw.click();
  eq(await sw.getAttribute("aria-checked"), was === "true" ? "false" : "true", "the switch flips");
  await sw.click();
  eq(await sw.getAttribute("aria-checked"), was, "and flips back");
  const sel = T("set-pauseat");
  eq((await sel.locator("option").evaluateAll((o) => o.map((x) => x.value))).join(","), "severe,medium,low,never", "options");
  eq((await sel.locator("option").allInnerTexts()).join(","), "Severe,Medium,Low,Never", "labels");
  const start = await sel.inputValue();
  await sel.selectOption("medium");
  truthy(/medium/i.test(await text(T("set-hint"))), "the hint follows the choice");
  await sel.selectOption("never");
  truthy(/never pauses/.test(await text(T("set-hint"))), "never");
  await sel.selectOption(start);
});
await check("clinic: switching the clinic in the browser bar reloads the panel without errors", async () => {
  const buttons = page.locator("[data-clinic]");
  const n = await buttons.count();
  truthy(n >= 2, "two demo clinics");
  const nameA = await text(page.locator(".cln-head h2"));
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    if ((await b.getAttribute("aria-pressed")) === "true") continue;
    await b.click();
    await tab("clinic");
    truthy((await text(page.locator(".cln-head h2"))).length > 1, "clinic name after the switch");
    await tab("scribe");
    truthy((await text(panel)).includes("Open a document in Lauris to scribe it"), "Scribe starts empty on the new clinic");
    await tab("ask");
    await tab("history");
    await shot(`clinic-3-switched-${await b.getAttribute("data-clinic")}`);
    await fits("after switching clinic");
    console.log(`          (${nameA} -> ${await (async () => { await tab("clinic"); return text(page.locator(".cln-head h2")); })()})`);
    break;
  }
});

await check("no console errors, warnings or page errors during the whole run", async () => {
  if (problems.length) throw new Error(problems.slice(0, 3).join(" | "));
});

await browser.close();
const failed = results.filter((r) => r.state === "FAIL");
const skipped = results.filter((r) => r.state === "SKIP");
console.log(`\n${results.filter((r) => r.state === "ok").length} ok, ${failed.length} failed, ${skipped.length} skipped`);
for (const s of skipped) console.log(`  skipped: ${s.name}: ${s.why}`);
process.exit(failed.length ? 1 : 0);
