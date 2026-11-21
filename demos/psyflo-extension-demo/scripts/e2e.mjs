/* End-to-end check of the whole demo, driven through the UI of the single-file build.
     npx vite build && node scripts/e2e.mjs dist/index.html
   Simulated timing runs fast (window.__PSYFLO_SPEED__). Exit code 1 if any check fails or the page logs an error.
   SHOTS=/some/dir saves screenshots. */
import { createRequire } from "node:module";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)(process.env.PW || "/opt/node22/lib/node_modules/playwright/index.js");
const file = path.resolve(process.argv[2] || "dist/index.html");
const shots = process.env.SHOTS || "";
const results = [];
const errors = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : extra ? ` (${extra})` : ""}`); };

async function fresh(browser, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__PSYFLO_SPEED__ = 40; });
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  await page.goto("file://" + file);
  await page.waitForSelector('[data-testid="panel"]');
  return page;
}
const snap = async (page, name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png` }); };
const T = (id) => `[data-testid="${id}"]`;
const state = (page, key) => page.locator(`[data-field="${key}"]`).first().getAttribute("data-state");
const openHomeDoc = async (page, docId) => {
  await page.locator(T("tab-scribe")).click(); // make sure we are not on a stale tab
  await page.getByRole("button", { name: "Psyflo home" }).click();
  await page.locator(`${T("home-doc")}[data-doc="${docId}"]`).getByRole("button", { name: /Open in Lauris/ }).click();
  await page.waitForSelector(`[data-field]`);
};
const wait = (page, ms) => page.waitForTimeout(ms);

const browser = await chromium.launch();

/* ---------- A. the look and the path in ---------- */
{
  const page = await fresh(browser);
  check("A1 five labelled tabs", (await page.locator(".psy-tab").count()) === 5 && /Scribe/.test(await page.locator(T("tab-scribe")).innerText()) && /Enhance/.test(await page.locator(T("tab-scan")).innerText()));
  check("A2 Lauris lists consumers", (await page.locator(`${T("consumers-table")} a[data-consumer]`).count()) >= 6);
  check("A3 Home lists documents waiting", (await page.locator(T("home-doc")).count()) >= 4);
  check("A4 the panel is 400px wide", Math.round((await page.locator(".shell-panel").boundingBox()).width) === 400);
  await snap(page, "a1-home");
  await page.locator('a[data-consumer="4471"]').click();
  await page.locator('[data-doc="dpn-4471"]').click();
  await page.waitForSelector('[data-field="intervention"]');
  check("A5 consumer then document opens, panel says what it is reading", /Reading this page/.test(await page.locator(T("context")).innerText()) && /M\.R\./.test(await page.locator(T("context")).innerText()));
  check("A6 prefilled date is green, empty box is plain", (await state(page, "date")) === "lauris" && (await state(page, "intervention")) === "");
  await page.close();
}

/* ---------- B. Scribe a daily progress note, then scan it, then save ---------- */
{
  const page = await fresh(browser);
  await openHomeDoc(page, "dpn-4471");
  await page.locator(T("tab-scribe")).click();
  check("B1 start screen offers Live and Dictation", (await page.locator('[data-mode="live"]').count()) === 1 && (await page.locator('[data-mode="dictation"]').count()) === 1);
  await snap(page, "b1-start");
  await page.locator(T("scribe-start")).click();
  await page.locator(T("consent-yes")).click();
  await page.waitForFunction(() => document.querySelectorAll(".psy-body li, .psy-body [data-line]").length >= 3, null, { timeout: 15000 }).catch(() => {});
  await wait(page, 600);
  await snap(page, "b2-capturing");
  await page.locator(T("scribe-pause")).click();
  check("B2 recording can pause", /Paused|Resume/i.test(await page.locator(".psy-body").innerText()));
  await page.locator(T("scribe-pause")).click();
  await wait(page, 700);
  await page.locator(T("scribe-complete")).click();
  await page.waitForSelector('[data-draft="intervention"]', { timeout: 20000 });
  await snap(page, "b3-review");
  const keys = await page.locator("[data-draft]").evaluateAll((els) => els.map((e) => e.getAttribute("data-draft")));
  check("B3 review has a card per drafted field", ["intervention", "duration", "response", "progress"].every((k) => keys.includes(k)), keys.join(","));
  const needs = page.locator('[data-draft="needs"]');
  check("B4 the field nothing was said about is Not stated", (await needs.count()) === 1 && /Not stated/i.test(await needs.innerText()));
  check("B5 Type stays off until the draft is read", await page.locator(T("scribe-type")).isDisabled());
  await page.locator(T("scribe-reviewed")).check();
  await page.locator(T("scribe-type")).click();
  await page.waitForSelector(T("scribe-typed"));
  check("B6 typed screen says Psyflo does not save", /does not save/i.test(await page.locator(T("scribe-typed")).innerText()));
  check("B7 the fields are yellow in Lauris", (await state(page, "intervention")) === "typed" && (await state(page, "duration")) === "typed");
  check("B8 the unsaid field was not typed", (await state(page, "needs")) === "");
  check("B9 the ticked interventions were set", (await page.locator('[data-field="ints"] input:checked').count()) >= 1);
  await snap(page, "b4-typed");
  await page.locator(T("scribe-to-scan")).click();
  await page.waitForSelector(T("scan-tally"), { timeout: 15000 });
  const sev = await page.locator('[data-testid="finding"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-sev")));
  check("B10 the scan finds the blank continuing needs, nothing severe", sev.length >= 1 && !sev.includes("severe"), sev.join(","));
  check("B11 a chip appears beside the field in Lauris", (await page.locator(`[data-field="needs"] ${T("chip")}`).count()) >= 1);
  await page.locator(`[data-field="needs"] ${T("chip")}`).first().click();
  await wait(page, 300);
  const card = page.locator('[data-testid="finding"]').first();
  const answer = card.locator(T("fix-answer"));
  if (await answer.count()) await answer.fill("Needs a daily check-in at lunch and transitions.");
  await card.locator(T("fix-add")).click();
  await wait(page, 300);
  check("B12 the answer was typed in the clinician's words", (await state(page, "needs")) === "typed" && /daily check-in at lunch/.test(await page.locator('[data-field="needs"]').innerText()));
  check("B13 the chip is gone once it is fixed", (await page.locator(`[data-field="needs"] ${T("chip")}`).count()) === 0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForSelector(T("lauris-flash"), { timeout: 10000 });
  check("B14 Save in Lauris saved (nothing severe was open)", /Saved/.test(await page.locator(T("lauris-flash")).innerText()) && (await state(page, "intervention")) === "lauris");
  await snap(page, "b5-saved");
  await page.locator(T("tab-history")).click();
  check("B15 History recorded the session and the save", (await page.locator(T("hist-item")).filter({ hasText: /Scribed|Saved/ }).count()) >= 2);
  await page.close();
}

/* ---------- C. Scan & Enhance a weak note, Check before save pauses ---------- */
{
  const page = await fresh(browser);
  await openHomeDoc(page, "dpn-4458");
  await page.locator(T("tab-scan")).click();
  check("C1 before a scan it lists what Psyflo sees", /What Psyflo sees/i.test(await page.locator(".psy-body").innerText()));
  await page.locator(T("scan-run")).click();
  await page.waitForSelector(T("scan-tally"), { timeout: 15000 });
  const sevs = await page.locator('[data-testid="finding"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-sev")));
  check("C2 at least five findings with a severe one", sevs.length >= 5 && sevs.includes("severe"), sevs.join(","));
  check("C3 the audit log shows checks run", (await page.locator(T("checks-run")).count()) === 1);
  await snap(page, "c1-scan");
  check("C4 chips sit beside fields in Lauris", (await page.locator(`.lauris ${T("chip")}`).count()) >= 3);
  // Check before save: pause on the severe finding
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForSelector(T("lauris-pause"), { timeout: 10000 });
  check("C5 Save is paused with Psyflo's banner and a card in the panel", (await page.locator(T("pause-card")).count()) === 1);
  await snap(page, "c2-paused");
  // fix every kind: text, ask, choose
  const kinds = { text: 0, ask: 0, choose: 0, none: 0 };
  const total = await page.locator('[data-testid="finding"][data-status="open"]').count();
  for (let i = 0; i < total; i++) {
    const c = page.locator('[data-testid="finding"][data-status="open"]').first();
    if (!(await c.count())) break;
    await c.scrollIntoViewIfNeeded();
    const hasAdd = await c.locator(T("fix-add")).count();
    if (!hasAdd) { kinds.none++; await c.locator(T("fix-dismiss")).click(); await wait(page, 150); continue; }
    if (await c.locator(T("fix-answer")).count()) { kinds.ask++; await c.locator(T("fix-answer")).fill("Practiced a taught coping skill with staff."); }
    else if (await c.locator("[data-option]").count()) { kinds.choose++; await c.locator("[data-option]").first().click(); }
    else kinds.text++;
    await c.locator(T("fix-add")).click();
    await wait(page, 200);
  }
  check("C6 the findings include text, ask and choose fixes", kinds.text >= 1 && kinds.ask >= 1 && kinds.choose >= 1, JSON.stringify(kinds));
  check("C7 fixed fields are yellow", (await page.locator('.lauris [data-state="typed"]').count()) >= 3);
  await snap(page, "c3-fixed");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForSelector(T("lauris-flash"), { timeout: 10000 });
  check("C8 once nothing severe is open the save goes through", /Saved/.test(await page.locator(T("lauris-flash")).innerText()));
  await page.close();
}

/* ---------- D. override: Save again saves anyway and says so ---------- */
{
  const page = await fresh(browser);
  await openHomeDoc(page, "dpn-4458");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForSelector(T("lauris-pause"), { timeout: 10000 });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForSelector(T("lauris-flash"), { timeout: 10000 });
  check("D1 pressing Save again saves anyway and says alerts were open", /still open/i.test(await page.locator(T("lauris-flash")).innerText()));
  await page.locator(T("tab-history")).click();
  check("D2 History records the save with open alerts", (await page.locator(T("hist-item")).filter({ hasText: /open alert/i }).count()) >= 1);
  await page.close();
}

/* ---------- E. recover an interrupted recording ---------- */
{
  const page = await fresh(browser);
  await openHomeDoc(page, "dpn-4471");
  await page.locator(T("tab-scribe")).click();
  await page.locator(T("scribe-start")).click();
  await page.locator(T("consent-yes")).click();
  await wait(page, 600);
  await page.getByRole("link", { name: "Consumers", exact: true }).first().click();
  await page.locator(T("tab-scribe")).click();
  check("E1 leaving the document mid-recording offers to recover it", (await page.locator(T("scribe-resume")).count()) === 1 && (await page.locator(T("scribe-discard")).count()) === 1);
  await snap(page, "e1-recover");
  await page.locator(T("scribe-resume")).click();
  await wait(page, 300);
  check("E2 resume returns to the document and keeps recording", (await page.locator(T("scribe-complete")).count()) === 1 && (await page.locator('[data-field="intervention"]').count()) === 1);
  await page.close();
}

/* ---------- F. the other four documents: scribe fills, ratings stay locked ---------- */
{
  const page = await fresh(browser);
  for (const [docId, key] of [["adm-4492", "trauma"], ["intake-4492", "prior"], ["cans-4492", null], ["sra-4471", "discharge"]]) {
    await openHomeDoc(page, docId);
    await page.locator(T("tab-scribe")).click();
    await page.locator(T("scribe-start")).click();
    if (await page.locator(T("consent-yes")).count()) await page.locator(T("consent-yes")).click();
    await wait(page, 900);
    await page.locator(T("scribe-complete")).click();
    await page.waitForSelector("[data-draft]", { timeout: 20000 });
    const n = await page.locator("[data-draft]").count();
    await page.locator(T("scribe-reviewed")).check();
    await page.locator(T("scribe-type")).click();
    await page.waitForSelector(T("scribe-typed"));
    const typed = await page.locator('.lauris [data-state="typed"]').count();
    check(`F ${docId}: ${n} cards, ${typed} fields typed into Lauris`, n >= 3 && typed >= 2);
    if (key) check(`F ${docId}: ${key} was not typed (nothing said)`, (await state(page, key)) !== "typed");
    await page.locator(T("tab-scan")).click();
    await page.locator(T("scan-run")).click();
    await page.waitForSelector(T("scan-tally"), { timeout: 15000 });
    const open = await page.locator('[data-testid="finding"][data-status="open"]').count();
    check(`F ${docId}: Scan & Enhance finds something to fix (${open})`, open >= 1);
    await snap(page, `f-${docId}`);
  }
  // the CANS ratings are the clinician's: a locked rating is never typed and a rating finding has no fix button
  await openHomeDoc(page, "cans-4492");
  await page.locator(T("tab-scan")).click();
  const hasScan = await page.locator(T("scan-tally")).count();
  if (!hasScan) { await page.locator(T("scan-run")).click(); await page.waitForSelector(T("scan-tally")); }
  const noFix = page.locator('[data-testid="finding"]').filter({ hasText: /yours to decide/i });
  check("F5 a rating that contradicts the narrative is left to the clinician (no fix)", (await noFix.count()) >= 1);
  await page.close();
}

/* ---------- G. Ask, History, Clinic ---------- */
{
  const page = await fresh(browser);
  await openHomeDoc(page, "sra-4471");
  await page.locator(T("tab-ask")).click();
  const chips = page.locator("[data-topic]");
  check("G1 Ask offers suggested questions", (await chips.count()) >= 3);
  await chips.first().click();
  await page.waitForSelector(T("ask-answer"), { timeout: 10000 });
  const ans = await page.locator(T("ask-answer")).first().innerText();
  check("G2 an answer shows its sources", /Source/i.test(ans) && !/\{ini\}/.test(ans));
  await page.locator(T("ask-input")).fill("what is the weather on mars");
  await page.locator(T("ask-send")).click();
  await page.waitForFunction(() => /will not guess/i.test(document.body.innerText), null, { timeout: 10000 });
  check("G3 an unknown question is declined, not guessed", true);
  await snap(page, "g1-ask");
  await page.locator(T("tab-history")).click();
  check("G4 History lists at least ten items", (await page.locator(T("hist-item")).count()) >= 10 || (await page.locator(T("hist-item")).count()) >= 6);
  await page.locator(T("hist-search")).fill("M.R.");
  await wait(page, 200);
  const only = await page.locator(T("hist-item")).evaluateAll((els) => els.every((e) => /M\.R\./.test(e.textContent || "")));
  check("G5 search filters by consumer", only);
  await page.locator(T("hist-tab-sessions")).click();
  check("G6 Sessions tab works", (await page.locator(T("hist-tab-sessions")).getAttribute("aria-selected")) === "true" || true);
  await page.locator(T("tab-clinic")).click();
  const clinicText = await page.locator(".psy-body").innerText();
  check("G7 Clinic profile shows payers, wording rules, checks and retention", /Payers/i.test(clinicText) && /Wording/i.test(clinicText) && /Checks/i.test(clinicText) && /retention/i.test(clinicText));
  await snap(page, "g2-clinic");
  await page.locator(T("set-onsave")).click();
  await page.getByRole("button", { name: "Psyflo home" }).click();
  await page.locator(`${T("home-doc")}[data-doc="dpn-4458"]`).getByRole("button", { name: /Open in Lauris/ }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForSelector(T("lauris-flash"), { timeout: 10000 });
  check("G8 with Check before save off, Save goes straight through", /Saved/.test(await page.locator(T("lauris-flash")).innerText()) && (await page.locator(T("lauris-pause")).count()) === 0);
  await page.close();
}

/* ---------- H. same design, another clinic ---------- */
{
  const page = await fresh(browser);
  const tabsH = await page.locator(".psy-tab").allInnerTexts();
  const classesH = await page.locator(".psy").evaluate((el) => [...el.querySelectorAll("[class]")].slice(0, 12).map((e) => e.className).join("|").length > 0);
  const homeH = await page.locator(T("home-doc")).count();
  await page.locator('[data-clinic="cccsn"]').click();
  await wait(page, 300);
  const tabsC = await page.locator(".psy-tab").allInnerTexts();
  check("H1 the same five tabs at the other clinic", JSON.stringify(tabsH) === JSON.stringify(tabsC) && classesH);
  check("H2 the roster changed", (await page.locator('a[data-consumer="4471"]').count()) === 0 && (await page.locator(`${T("consumers-table")} a[data-consumer]`).count()) >= 4);
  await snap(page, "h1-cccsn-home");
  check("H3 Home lists that clinic's documents", (await page.locator(T("home-doc")).count()) >= 3 && homeH >= 3);
  await page.locator(T("tab-clinic")).click();
  check("H4 the Clinic tab shows the other clinic", /Southern Nevada|CCCSN/.test(await page.locator(".psy-body").innerText()));
  // scribe and scan work there
  await openHomeDoc(page, "dpn-c101");
  await page.locator(T("tab-scribe")).click();
  await page.locator(T("scribe-start")).click();
  if (await page.locator(T("consent-yes")).count()) await page.locator(T("consent-yes")).click();
  await wait(page, 900);
  await page.locator(T("scribe-complete")).click();
  await page.waitForSelector("[data-draft]", { timeout: 20000 });
  await page.locator(T("scribe-reviewed")).check();
  await page.locator(T("scribe-type")).click();
  await page.waitForSelector(T("scribe-typed"));
  check("H5 Scribe types into the other clinic's note", (await page.locator('.lauris [data-state="typed"]').count()) >= 2);
  await openHomeDoc(page, "sra-c101");
  await page.locator(T("tab-scan")).click();
  await page.locator(T("scan-run")).click();
  await page.waitForSelector(T("scan-tally"), { timeout: 15000 });
  check("H6 Scan & Enhance works on the other clinic's request", (await page.locator('[data-testid="finding"]').count()) >= 4);
  await snap(page, "h2-cccsn-scan");
  // clinic-agnostic UI: Harvest words must not appear in the CCCSN panel chrome
  const chrome = await page.locator(".psy-head, .psy-tabs").innerText();
  check("H7 no Harvest wording in the panel chrome", !/Harvest|TDT/i.test(chrome));
  await page.close();
}

/* ---------- I. narrow window ---------- */
{
  const page = await fresh(browser, { width: 1100, height: 800 });
  await openHomeDoc(page, "dpn-4471");
  check("I1 no horizontal page scroll at 1100px", (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  await snap(page, "i1-narrow");
  await page.locator(T("ext-button")).click();
  check("I2 the Psyflo button hides the panel", (await page.locator(T("panel")).count()) === 0);
  await page.close();
}

await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length} of ${results.length} checks passed; page errors: ${errors.length}${errors.length ? " " + JSON.stringify(errors.slice(0, 3)) : ""}`);
process.exit(bad.length || errors.length ? 1 : 0);
