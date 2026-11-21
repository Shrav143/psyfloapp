#!/usr/bin/env node
/* Check of the panel's Home, Scan & Enhance, Check before save and Legend views against the stable hooks in ARCHITECTURE.md.
     npx vite build && node scripts/panel-scan-check.mjs [dist/index.html]
   PSYFLO_CHECK_WIDTH=880 runs it with a narrow window (the panel shrinks to 340px there).
   It drives the built demo through the UI, once per clinic in the "Demo clinic" switch, and works from whatever content the clinic has:
   it finds the documents on Home, scans them, and exercises each kind of fix it meets (text, ask, choose, none).
   Pressing Save needs the mock Lauris (`lauris-save`). When that button is not there the check falls back to window.__store
   (a dev hook some local builds expose) and otherwise says SKIP. Exit code 1 if anything failed. */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const url = pathToFileURL(resolve(process.argv[2] ?? "dist/index.html")).href;

let pass = 0;
let fail = 0;
let where = "";
const ok = (name, cond, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`  ${cond ? "ok  " : "FAIL"}  ${name}${!cond && detail ? `\n          ${detail}` : ""}`);
};
const note = (m) => console.log(`  note  ${m}`);
const skip = (m) => console.log(`  SKIP  ${m}`);

const browser = await chromium.launch();

/** A fresh page on the demo. speed 40 runs the simulated timing fast; speed 1 lets the short "busy" states be seen. */
async function open({ speed = 40, clinic } = {}) {
  const page = await browser.newPage({ viewport: { width: +(process.env.PSYFLO_CHECK_WIDTH ?? 1440), height: 900 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(5000);
  page.problems = [];
  page.on("pageerror", (e) => page.problems.push(`page error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && page.problems.push(`console: ${m.text()}`));
  await page.addInitScript((s) => { window.__PSYFLO_SPEED__ = s; }, speed);
  await page.goto(url);
  await page.waitForSelector('[data-testid="panel"]');
  if (clinic && (await page.locator(`[data-clinic="${clinic}"]`).getAttribute("aria-pressed")) !== "true") await page.click(`[data-clinic="${clinic}"]`);
  return page;
}

async function stage(name, fn) {
  console.log(`\n${where} · ${name}`);
  try { await fn(); } catch (e) { ok(`${name}: finished without an error`, false, String(e.message).split("\n")[0]); }
}

const card = (page, id) => page.locator(`[data-testid="finding"][data-finding="${id}"]`);
const goHome = (page) => page.click('button[aria-label="Psyflo home"]');
const selected = (page, tab) => page.locator(`[data-testid="tab-${tab}"]`).getAttribute("aria-selected");
const homeDocs = (page) => page.$$eval('[data-testid="home-doc"]', (els) => els.map((e) => e.dataset.doc));
const homeBtn = (page, id, name) => page.locator(`[data-testid="home-doc"][data-doc="${id}"]`).getByRole("button", { name, exact: true });
const hasStore = (page) => page.evaluate(() => !!window.__store);
const storeCall = (page, fn, ...args) => page.evaluate(([f, a]) => window.__store.getState()[f](...a), [fn, args]);

/** Every card in the panel: what it is, what state it is in, and which kind of fix it offers. */
const cards = (page) => page.$$eval('[data-testid="finding"]', (els) => els.map((el) => ({
  id: el.dataset.finding, sev: el.dataset.sev, status: el.dataset.status,
  kind: el.querySelector('[data-testid="fix-answer"]') ? "ask" : el.querySelector("[data-option]") ? "choose" : el.querySelector('[data-testid="fix-none"]') ? "none" : el.querySelector(".sn-quote") ? "text" : "",
})));

/** Nothing in the panel may stick out past its right edge (the panel is 400px wide). */
async function noOverflow(page, label) {
  const bad = await page.evaluate(() => {
    const right = document.querySelector(".shell-panel").getBoundingClientRect().right;
    return [...document.querySelectorAll(".shell-panel *")]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > right + 0.5; })
      .slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
  });
  ok(`nothing sticks out of the panel (${label})`, bad.length === 0, bad.join(", "));
}

/** Scan one document through the UI: Home, its Scan button, Scan this document. */
async function scanDoc(page, id) {
  await goHome(page);
  await homeBtn(page, id, "Scan").click();
  await page.locator('[data-testid="scan-run"]').click();
  await page.locator('[data-testid="scan-tally"]').waitFor();
}

/* ----------------------------------------------------------------------------------------------------------------------------- */

async function noDocumentStage(page) {
  await page.click('[data-testid="tab-scan"]');
  const empty = page.locator('[data-testid="scan-empty"]');
  ok("Scan with no document open says so", (await empty.count()) === 1 && /Open a document in Lauris to scan it/.test(await empty.innerText()));
  const buttons = await page.locator('[data-testid="scan-open-doc"]').count();
  ok("...and lists the documents as buttons", buttons > 0, `${buttons} buttons`);
  await noOverflow(page, "Scan with no document");
  await page.locator('[data-testid="scan-open-doc"]').first().click();
  ok("a document button opens it, and Scan shows the scan card", (await page.locator('[data-testid="scan-run"]').count()) === 1);
}

async function homeStage(page) {
  await goHome(page);
  const docs = await homeDocs(page);
  ok("Home lists documents that are waiting", docs.length > 0, "no [data-testid=home-doc]");
  ok("Home greets the clinician by first name", await page.getByRole("heading", { name: /^Hello, \S+/ }).isVisible());
  ok("Home says what Psyflo does in one line", await page.getByText("Psyflo reads the page you are on in Lauris. It types, you check, you save.", { exact: true }).first().isVisible());
  ok("no interrupted-recording card when nothing was interrupted", (await page.locator('[data-testid="home-recover"]').count()) === 0);
  let badRow = "";
  for (const id of docs) {
    const txt = await page.locator(`[data-testid="home-doc"][data-doc="${id}"]`).innerText();
    if (!(/Draft|Saved/.test(txt) && (await homeBtn(page, id, "Open in Lauris").count()) === 1 && (await homeBtn(page, id, "Scan").count()) === 1)) { badRow = `${id}: ${txt}`; break; }
  }
  ok('every row has a status chip, "Open in Lauris" and "Scan"', !badRow, badRow);
  const how = page.locator("section", { hasText: "How Psyflo works here" });
  ok('"How Psyflo works here" has four steps and the promise', (await how.locator("li").count()) === 4 && /never saves for you/.test(await how.innerText()));
  await noOverflow(page, "Home");

  await page.getByRole("button", { name: "Ask Psyflo" }).click();
  ok("quick link: Ask", (await selected(page, "ask")) === "true");
  await goHome(page);
  await page.getByRole("button", { name: "Clinic profile" }).click();
  ok("quick link: Clinic", (await selected(page, "clinic")) === "true");
  await goHome(page);
}

async function beforeScanStage(page) {
  await goHome(page);
  const ids = await homeDocs(page);
  await homeBtn(page, ids[0], "Scan").click();
  const intro = page.locator('[data-testid="scan-intro"]');
  const introText = await intro.innerText();
  ok("before a scan: what Scan & Enhance does is explained", /Scan & Enhance/.test(introText) && /checks it against .+'s rules and .+ criteria, and proposes fixes you can type into Lauris with one click/.test(introText), introText.slice(0, 200));
  const ctx = await page.locator('[data-testid="context"]').innerText();
  const m = /(\d+) fields · Psyflo can type in (\d+)/.exec(ctx);
  await page.click('[data-testid="scan-sees"] summary');
  const seen = await page.locator("[data-field-seen]").count();
  ok("What Psyflo sees lists every field with a kind badge", !!m && seen === +m[1] && (await page.locator("[data-field-seen] .p-kind").count()) === seen, `${seen} listed, strip says ${m?.[1]}`);
  ok('...and marks each "Psyflo may type here" or "Clinician only"', !!m && (await page.getByText("Psyflo may type here").count()) === +m[2] && (await page.getByText("Clinician only").count()) === +m[1] - +m[2]);
  ok("a primary Scan this document button", /Scan this document/.test(await page.locator('[data-testid="scan-run"]').innerText()));
  await noOverflow(page, "before a scan");
  ok("the sticky footer line is there", await page.getByText("Psyflo types. You check it and press Save in Lauris.").isVisible());
  ok("the Check before save status line is there", /Check before save is (on|off)/.test(await page.locator('[data-testid="save-status"]').innerText()));
  // a document with nothing in it points to Scribe
  for (const id of ids) {
    await goHome(page);
    await homeBtn(page, id, "Scan").click();
    if (await page.getByText("There is nothing to scan yet. Scribe it first.").count()) {
      await page.getByRole("button", { name: "Go to Scribe" }).click();
      ok("an empty document says to Scribe it first, with a link to the Scribe tab", (await selected(page, "scribe")) === "true");
      return;
    }
  }
  note("no empty document in this content: the Scribe-first message was not seen");
}

/** Find the findings, exercise every kind of fix once, then "Add all that are ready". */
async function fixStage(page) {
  const covered = new Set();
  let severeDoc = null;
  let sawStale = false;
  let sawFocus = false;
  await goHome(page);
  const ids = await homeDocs(page);
  ok("there are documents on Home to scan", ids.length > 0);
  for (const id of ids.slice(0, 8)) {
    await scanDoc(page, id);
    const tallyText = (await page.locator('[data-testid="scan-tally"]').innerText()).replace(/\s+/g, " ");
    ok(`${id}: tally strip has Severe, Medium, Low and Typed`, /Severe \d+ Medium \d+ Low \d+ Typed \d+/.test(tallyText), tallyText);
    ok(`${id}: says when it was scanned and offers Scan again`, /Scanned \d\d\/\d\d\/\d{4}/.test(await page.locator(".sn-when").innerText()) && /Scan again/.test(await page.locator('[data-testid="scan-run"]').innerText()));
    const all = await cards(page);
    const open = all.filter((c) => c.status === "open");
    if (!severeDoc && open.some((c) => c.sev === "severe")) severeDoc = id;
    let bad = "";
    for (const c of open) {
      const t = await card(page, c.id).innerText();
      if (!(/^(Severe|Medium|Low)/.test(t) && t.includes("→") && /^why /im.test(t))) { bad = `${c.id}: ${t.slice(0, 120)}`; break; }
    }
    if (open.length) ok(`${id}: every open card has severity, title, "→ field", rule and Why`, !bad, bad);
    await noOverflow(page, `${id} results`);

    /* a chip click in Lauris (or the store) highlights and shows one card, without taking keyboard focus */
    if (!sawFocus && open.length >= 2) {
      const [a, b] = open;
      const chip = page.locator(`[data-testid="chip"][data-finding="${b.id}"]`);
      const viaChip = (await chip.count()) > 0;
      if (viaChip || (await hasStore(page))) {
        await goHome(page);
        if (viaChip) await chip.first().click(); else await storeCall(page, "focusFinding", b.id);
        await page.waitForTimeout(400);
        ok("focusing a finding opens Scan and highlights that card", (await selected(page, "scan")) === "true" && (await card(page, b.id).getAttribute("class")).includes("sel"));
        ok("...without moving keyboard focus into the panel's cards", !(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="finding"]'))));
        await card(page, a.id).locator('[data-testid="fix-dismiss"]').click();
        ok("acting on another card clears the highlight", !(await card(page, b.id).getAttribute("class")).includes("sel"));
        await card(page, a.id).locator('[data-testid="fix-restore"]').click();
        sawFocus = true;
      }
    }

    const firstOf = (k) => open.find((c) => c.kind === k);
    const enabledAll = await page.locator('[data-testid="fix-all"]').isEnabled().catch(() => null);

    const ask = firstOf("ask");
    if (ask && !covered.has("ask")) {
      const el = card(page, ask.id);
      ok("ask: Type into Lauris waits for words", await el.locator('[data-testid="fix-add"]').isDisabled());
      ok("ask: no preview before there is text", (await el.locator('[data-testid="fix-preview"]').count()) === 0);
      await el.locator('[data-testid="fix-answer"]').fill("check text from the clinician");
      ok('ask: a live "Psyflo will type: ..." preview that includes the words', /^Psyflo will type: .*check text from the clinician/.test((await el.locator('[data-testid="fix-preview"]').innerText()).replace(/\s+/g, " ")));
      ok("ask: Type into Lauris is enabled once there is text", await el.locator('[data-testid="fix-add"]').isEnabled());
      await el.locator('[data-testid="fix-add"]').click();
      ok("ask: the card collapses to the green line", (await el.getAttribute("data-status")) === "added" && /Typed into Lauris · check it, then Save in Lauris/.test(await el.innerText()));
      covered.add("ask");
    }
    const choose = firstOf("choose");
    if (choose && !covered.has("choose")) {
      const el = card(page, choose.id);
      ok("choose: nothing is preselected", (await el.locator('[data-option][aria-pressed="true"]').count()) === 0);
      ok("choose: Type into Lauris waits for a pick", await el.locator('[data-testid="fix-add"]').isDisabled());
      await el.locator("[data-option]").last().click();
      ok("choose: the picked option shows as selected and Type is enabled", (await el.locator('[data-option][aria-pressed="true"]').count()) === 1 && (await el.locator('[data-testid="fix-add"]').isEnabled()));
      await el.locator('[data-testid="fix-add"]').click();
      ok("choose: typed, the card is handled", (await el.getAttribute("data-status")) === "added");
      covered.add("choose");
    }
    const none = firstOf("none");
    if (none && !covered.has("none")) {
      const el = card(page, none.id);
      ok("no fix: says it is the clinician's to decide, offers no Type button", /This one is yours to decide\. Psyflo can name it but not fix it\./.test(await el.innerText()) && (await el.locator('[data-testid="fix-add"]').count()) === 0);
      await el.locator('[data-testid="fix-dismiss"]').click();
      ok('dismiss: the card shows "Dismissed · Restore"', (await el.getAttribute("data-status")) === "dismissed" && /Dismissed · Restore/.test(await el.innerText()));
      await el.locator('[data-testid="fix-restore"]').click();
      ok("restore: the card is open again", (await el.getAttribute("data-status")) === "open");
      covered.add("none");
    }
    const text = open.find((c) => c.kind === "text");
    if (text && !covered.has("text")) {
      const el = card(page, text.id);
      ok("text: the sentence is quoted with its chart source", (await el.locator(".sn-quote").count()) === 1 && /From the chart · \S/.test(await el.innerText()));
      ok("text: Type into Lauris is enabled straight away", await el.locator('[data-testid="fix-add"]').isEnabled());
      ok("fix-all is enabled when a text fix is open", enabledAll === true, `fix-all enabled: ${enabledAll}`);
      const before = (await cards(page)).filter((c) => c.status === "open" && c.kind === "text").map((c) => c.id);
      await page.locator('[data-testid="fix-all"]').click();
      const after = await cards(page);
      ok("fix-all types every ready text fix", before.every((tid) => after.find((c) => c.id === tid)?.status === "added"), before.join(","));
      covered.add("text");
    }
    const now = await cards(page);
    const typedChip = await page.locator('[data-tally="typed"] b').innerText();
    ok(`${id}: Typed in the tally equals the cards typed into Lauris`, +typedChip === now.filter((c) => c.status === "added").length, `chip ${typedChip}`);
    if (now.some((c) => c.status === "added")) {
      await goHome(page);
      const row = await page.locator(`[data-testid="home-doc"][data-doc="${id}"]`).innerText().catch(() => "");
      ok(`${id}: Home shows "n yellow, not saved" for what was typed`, /\d+ yellow, not saved/.test(row), row.replace(/\n/g, " | "));
      await homeBtn(page, id, "Scan").click();
    }

    /* a change made after the scan makes it stale */
    if (!sawStale) {
      const field = page.locator('[data-field] textarea, [data-field] input[type="text"]').first();
      if (await field.count()) { await field.click(); await field.press("End"); await field.pressSequentially(" "); sawStale = true; }
      else if (await hasStore(page)) {
        await page.evaluate((docId) => { const s = window.__store.getState(); const k = Object.keys(s.docs[docId].values)[0]; s.editField(docId, k, s.docs[docId].values[k]); }, id);
        sawStale = true;
      }
      if (sawStale) ok("a change after the scan shows the stale banner", /You changed the document after the scan\. Scan again\./.test(await page.locator('[data-testid="scan-stale"]').innerText()));
    }

    /* Checks run: a tick for a check that passed, the number for one that is flagged */
    const log = page.locator('[data-testid="checks-run"]');
    if (await log.count()) {
      const rows = await log.locator("li[data-check]").evaluateAll((els) => els.map((e) => ({ check: e.dataset.check, result: e.dataset.result, chip: e.querySelector(".p-chip")?.textContent?.replace(/\D/g, "") ?? null, tick: !!e.querySelector(".sn-tick") })));
      const openNow = now.filter((c) => c.status === "open");
      const wrong = rows.filter((r) => {
        const n = openNow.filter((c) => c.id.split(":")[1] === r.check).length;
        return n ? !(r.result === "flagged" && +r.chip === n && !r.tick) : !(r.result !== "flagged" && r.tick && r.chip === null);
      });
      ok(`${id}: Checks run shows a tick for each check that passed and the number for each that is flagged`, rows.length > 0 && wrong.length === 0, JSON.stringify(wrong.slice(0, 2)));
      ok(`${id}: Checks run is collapsible and grouped by module`, (await log.locator("summary").count()) === 1 && (await log.locator(".sn-mod").count()) >= 1);
    } else note(`${id}: no checks apply to this kind`);
    if (["ask", "choose", "none", "text"].every((k) => covered.has(k)) && severeDoc && sawFocus) break;
  }
  const missing = ["text", "ask", "choose", "none"].filter((k) => !covered.has(k));
  if (missing.length) note(`this content has no open finding of kind: ${missing.join(", ")} (not exercised)`);
  if (!sawFocus) note("focus-from-Lauris not exercised: no Lauris chips and no window.__store");
  ok("at least one kind of fix was exercised", covered.size > 0);
  return { severeDoc };
}

/** Press Save on a document with an open Severe finding. startTab: the tab the person is on when they press it. */
async function saveRound(clinic, severeDoc, startTab) {
  const page = await open({ speed: 1, clinic });
  try {
    await homeBtn(page, severeDoc, "Open in Lauris").click();
    const lauris = (await page.locator('[data-testid="lauris-save"]').count()) > 0;
    if (!lauris && !(await hasStore(page))) { skip("neither the Lauris Save button nor window.__store is available: Save-pause not exercised"); return; }
    const press = () => (lauris ? page.click('[data-testid="lauris-save"]') : storeCall(page, "requestSave", severeDoc));
    await page.click('[data-testid="tab-scan"]');
    await page.locator('[data-testid="scan-run"]').click();
    if (startTab === "scan") ok("while scanning: Reading n fields… checking n checks", /Reading \d+ fields?… checking \d+ checks?/.test(await page.locator('[data-testid="scan-running"]').innerText()));
    await page.locator('[data-testid="scan-tally"]').waitFor();
    if (startTab !== "scan") await page.click(`[data-testid="tab-${startTab}"]`);
    await press();
    if (startTab === "scan") await page.locator('[data-testid="checking-card"]').waitFor({ timeout: 3000 }).then(() => ok('a "Checking before save…" card while it checks', true), () => ok('a "Checking before save…" card while it checks', false, "never appeared"));
    const pause = page.locator('[data-testid="pause-card"]');
    await pause.waitFor({ timeout: 5000 });
    ok(`pressing Save on the ${startTab} tab: the panel jumps to Scan and shows Save paused on top`, (await selected(page, "scan")) === "true" && /Save paused/.test(await pause.innerText()));
    if (startTab !== "scan") return;
    const line = (await pause.innerText()).replace(/\s+/g, " ");
    const n = /(\d+) alerts? at (Severe|Medium|Low) or above (is|are) still open/.exec(line);
    ok('it says "n alert(s) at {level} or above are still open"', !!n, line);
    const items = await pause.locator('[data-testid="pause-item"]').count();
    ok("it lists those findings", !!n && items === +n[1], `${items} listed`);
    ok("it offers Fix them first and Save anyway", (await pause.getByRole("button", { name: "Fix them first" }).count()) === 1 && (await pause.locator('[data-testid="save-anyway"]').count()) === 1);
    await noOverflow(page, "Save paused");
    const ref = await pause.locator('[data-testid="pause-item"]').first().getAttribute("data-finding-ref");
    await pause.locator('[data-testid="pause-item"]').first().click();
    await page.waitForTimeout(600);
    const inView = await page.evaluate((id) => {
      const el = document.querySelector(`[data-testid="finding"][data-finding="${id}"]`);
      const body = document.querySelector(".psy-body").getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { sel: el.classList.contains("sel"), visible: r.top >= body.top - 2 && r.top < body.bottom - 20 };
    }, ref);
    ok("clicking a listed finding scrolls to its card and highlights it", inView.sel && inView.visible, JSON.stringify(inView));
    ok("nothing is dismissed by looking at the list", (await cards(page)).filter((c) => c.status === "dismissed").length === 0);
    await pause.locator('[data-testid="save-anyway"]').click();
    await pause.waitFor({ state: "detached" });
    ok("Save anyway saves and the paused card goes", true);
    if (lauris) ok("Lauris shows its saved message", /Saved in Lauris/.test(await page.locator('[data-testid="lauris-flash"]').innerText()));
    else {
      ok("the document is saved", (await page.evaluate((id) => window.__store.getState().docs[id].status, severeDoc)) === "saved");
      ok("History records the save with its open alerts", await page.evaluate(() => window.__store.getState().history.some((h) => /open alert/.test(h.status))));
    }
  } finally {
    ok(`no page or console errors in the Save-pause run (${startTab} tab)`, page.problems.length === 0, page.problems.join(" | "));
    await page.close();
  }
}

async function recoverStage(page) {
  const store = await hasStore(page);
  await goHome(page);
  const docs = await homeDocs(page);
  const withScribe = [];
  for (const id of docs) if ((await homeBtn(page, id, "Scribe").count()) === 1) withScribe.push(id);
  if (!withScribe.length) { skip("no document on Home offers Scribe: the interrupted-recording card was not exercised"); return; }
  const target = withScribe[0];
  const other = docs.find((d) => d !== target);
  if (!other) { skip("only one document: cannot leave the recorded one"); return; }
  await homeBtn(page, target, "Scribe").click();
  ok("Home Scribe opens the Scribe tab", (await selected(page, "scribe")) === "true");
  if (store) { await storeCall(page, "scribeContinue"); await storeCall(page, "scribeConsent", "yes"); }
  else if (await page.locator('[data-testid="scribe-start"]').count()) {
    await page.click('[data-testid="scribe-start"]');
    if (await page.locator('[data-testid="consent-yes"]').count()) await page.click('[data-testid="consent-yes"]');
  } else { skip("Scribe has no start button yet and there is no window.__store: cannot start a recording"); return; }
  const leave = async () => { await goHome(page); await homeBtn(page, other, "Open in Lauris").click(); };
  await leave();
  const rec = page.locator('[data-testid="home-recover"]');
  ok('leaving the document mid-recording shows "A recording was interrupted" on Home', (await rec.count()) === 1 && /A recording was interrupted/.test(await rec.innerText()));
  ok("the card has Resume and Discard", (await page.locator('[data-testid="home-resume"]').count()) === 1 && (await page.locator('[data-testid="home-discard"]').count()) === 1);
  ok("Scribe on another row is held back while a recording is interrupted", (await homeBtn(page, other, "Scribe").count()) === 0 || (await homeBtn(page, other, "Scribe").isDisabled()));
  await noOverflow(page, "Home with the interrupted card");
  await page.click('[data-testid="home-resume"]');
  ok("Resume goes back to Scribe", (await selected(page, "scribe")) === "true");
  await leave();
  await page.click('[data-testid="home-discard"]');
  ok("Discard removes the card", (await page.locator('[data-testid="home-recover"]').count()) === 0);
}

async function legendStage(page) {
  const clinicShort = (await page.locator(".psy-head .ttl span").innerText()).split("·").pop().trim();
  await page.click('button[aria-label^="Legend"]');
  const lg = page.locator('[data-testid="legend"]');
  const t = await lg.innerText();
  ok("Legend: green and yellow", /Green/.test(t) && /Yellow/.test(t));
  ok("Legend: Severe, Medium, Low and Handled", ["Severe", "Medium", "Low", "Handled"].every((w) => t.includes(w)));
  ok("Legend: the Psyflo mark, ?, ×, and the five tabs", ["Psyflo mark", "?", "×", "Scribe", "Scan & Enhance", "History", "Ask", "Clinic"].every((w) => t.includes(w)));
  ok("Legend: the alert chips beside the form, and Check before save", /chips beside a field/.test(t) && /Check before save/.test(t));
  ok("Legend: Psyflo never presses Save", /Psyflo never presses Save/.test(t));
  ok("Legend names no clinic", clinicShort.length < 3 || !t.includes(clinicShort), clinicShort);
  await noOverflow(page, "Legend");
  await page.click('button[aria-label^="Legend"]');
  ok("the ? closes the legend again", (await page.locator('[data-testid="legend"]').count()) === 0);
}

/* ----------------------------------------------------------------------------------------------------------------------------- */

const probe = await open();
const clinics = await probe.$$eval("[data-clinic]", (els) => els.map((e) => e.dataset.clinic));
await probe.close();

for (const clinic of clinics) {
  where = clinic;
  console.log(`\n=== Demo clinic: ${clinic} ===`);
  const page = await open({ clinic });
  await stage("Scan with no document open", () => noDocumentStage(page));
  await stage("Home", () => homeStage(page));
  await stage("Scan & Enhance before a scan", () => beforeScanStage(page));
  let found = { severeDoc: null };
  await stage("Scan results and every kind of fix", async () => { found = await fixStage(page); });
  await stage("Interrupted recording on Home", () => recoverStage(page));
  await stage("Legend", () => legendStage(page));
  ok("no page or console errors", page.problems.length === 0, page.problems.join(" | "));
  await page.close();
  if (!found.severeDoc) skip("no document with an open Severe finding: Save-pause not exercised");
  else {
    await stage("Check before save (pressed on the Scan tab)", () => saveRound(clinic, found.severeDoc, "scan"));
    await stage("Check before save (pressed on another tab)", () => saveRound(clinic, found.severeDoc, "ask"));
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
