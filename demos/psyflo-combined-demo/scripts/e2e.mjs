/* End-to-end check of the combined demo (the Psyflo platform, the mock Lauris EHR and the Psyflo extension in one page), driven through the UI of a build.
     npx vite build                          (HashRouter, the normal build)
     node scripts/e2e.mjs dist/index.html
     VITE_HOSTED=1 npx vite build --outDir dist-hosted && node scripts/e2e.mjs dist-hosted/index.html hosted
   The hosted build keeps the route in memory, so everything is reached by clicking. The extension's own behavior (Scribe, Scan & Enhance, History, Help, Settings on the Harvest and CCCSN content)
   is checked by scripts/ext-e2e.mjs. Exit code 1 if any check fails or the page logs an error. SHOTS=/some/dir saves screenshots. */
import { createRequire } from "node:module";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)(process.env.PW || "/opt/node22/lib/node_modules/playwright/index.js");
const file = path.resolve(process.argv[2] || "dist/index.html");
const hosted = process.argv[3] === "hosted";
const shots = process.env.SHOTS || "";
const results = [];
const errors = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : extra ? ` (${extra})` : ""}`); };
const T = (id) => `[data-testid="${id}"]`;
const snap = async (page, name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png` }); };

async function fresh(browser, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__PSYFLO_SPEED__ = 40; });
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  await page.goto("file://" + file);
  await page.waitForSelector(T("lauris-shell"));
  return page;
}
const wait = (page, ms) => page.waitForTimeout(ms);
const panelText = async (page) => (await page.locator(T("panel")).innerText()).replace(/\s+/g, " ");
const mainText = async (page) => (await page.locator(".lauris .l-main").innerText()).replace(/\s+/g, " ");
const toPlatform = async (page) => { await page.locator(T("open-platform")).click(); await wait(page, 500); };
const toLauris = async (page) => { await page.locator(T("open-lauris")).click(); await page.waitForSelector(T("lauris-shell")); await wait(page, 250); };
const openAuthOf = async (page, consumerNo) => {
  await page.locator('.lauris a.lnav', { hasText: "Consumers" }).first().click();
  await page.locator(`a[data-consumer="${consumerNo}"]`).click();
  await page.locator("a[data-auth]").click();
  await page.waitForSelector(T("auth-page"));
  await wait(page, 300);
};
const openDocOf = async (page, consumerNo, docId) => {
  await page.locator('.lauris a.lnav', { hasText: "Consumers" }).first().click();
  await page.locator(`a[data-consumer="${consumerNo}"]`).click();
  await page.locator(`.lauris a[data-doc="${docId}"]`).click();
  await page.waitForSelector("[data-field]");
};
/** Reach a Psyflo platform case page: by address, or (hosted) through the sidebar. */
async function openPlatformCase(page, id) {
  await toPlatform(page);
  await page.getByRole("link", { name: /^Authorizations/ }).first().click();
  await wait(page, 500);
  await page.getByText(id, { exact: true }).first().click();
  await wait(page, 700);
}
async function openPlatformDenial(page, id) {
  await toPlatform(page);
  await page.getByRole("link", { name: /^Denial Intelligence/ }).first().click();
  await wait(page, 500);
  await page.getByText(id, { exact: true }).first().click();
  await wait(page, 700);
}

const browser = await chromium.launch();

/* ---- A. one link: the demo opens on Lauris with the extension; the Psyflo platform is the other tab ---- */
{
  const page = await fresh(browser);
  const names = await page.locator(".psy-ic[role=tab]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  check("A1 the demo opens on Lauris with the extension docked, six icons in order", JSON.stringify(names) === JSON.stringify(["Scribe", "History", "Patients", "Scan & Enhance", "Help", "Settings"]), names.join(","));
  check("A2 the browser has a Psyflo platform tab and a Lauris Online tab", (await page.locator(T("open-platform")).count()) === 1 && /Lauris Online/.test(await page.locator(T("tab-lauris")).innerText()));
  check("A3 Demo data offers the platform's consumers, Harvest and CCCSN", (await page.locator(".shell-demo [data-clinic]").evaluateAll((els) => els.map((e) => e.getAttribute("data-clinic")))).join() === "platform,harvest,cccsn");
  const rows = await page.locator(`${T("consumers-table")} a[data-consumer]`).count();
  check("A4 Lauris lists every consumer of the platform's queue (56 or more)", rows >= 56, `rows=${rows}`);
  check("A5 each consumer row shows where the authorization stands", (await page.locator(`${T("consumers-table")} tbody .st`).count()) >= 56);
  check("A6 the panel is 400px wide and opens on Start a new session", Math.round((await page.locator(".shell-panel").boundingBox()).width) === 400 && /Start a new session/.test(await panelText(page)));
  await snap(page, "a1-start");

  await page.locator('a[data-consumer="4042"]').click();
  await wait(page, 200);
  await toPlatform(page);
  check("A7 the Psyflo platform tab opens the platform (dashboard with its sidebar, no Lauris)", (await page.getByRole("navigation", { name: "Main" }).count()) > 0 && (await page.locator(T("lauris-shell")).count()) === 0);
  await snap(page, "a2-platform");
  check("A8 the platform has a button that goes back to Lauris with the extension", (await page.locator(T("open-lauris")).count()) === 1);
  await toLauris(page);
  check("A9 going back finds Lauris where it was left (J.M.'s record)", /J\.M\./.test(await mainText(page)) && (await page.locator(T("auth-card")).count()) === 1);
  await page.close();
}

/* ---- B. the authorization form: recommendations in Scan & Enhance, typed into Lauris ---- */
{
  const page = await fresh(browser);
  await openAuthOf(page, "4042");
  check("B1 the authorization form opens with the extension on Scan & Enhance", (await page.locator(T("tab-scan")).getAttribute("aria-selected")) === "true" && (await page.locator(T("rec-view")).count()) === 1);
  check("B2 the panel says what it is reading", /Authorization form/.test(await page.locator(T("context")).innerText()) && /J\.M\./.test(await page.locator(T("context")).innerText()));
  check("B3 six suggestions are waiting", (await page.locator(T("rec-card")).count()) === 6 && (await page.locator(T("rec-count")).innerText()).trim() === "6");
  check("B4 the approval chance reads 62% with every suggestion 88%", /62%.*88%/.test((await page.locator(T("rec-chance")).innerText()).replace(/\s+/g, " ")));
  check("B5 the form starts green and nothing is yellow", (await page.locator(".l-main .in.g").count()) >= 4 && (await page.locator(".l-main .in.y").count()) === 0);
  check("B6 chips beside the boxes say how many suggestions go there", (await page.locator(`.l-main ${T("chip")}`).count()) >= 3);
  await snap(page, "b1-auth");

  await page.locator(T("rec-add")).click();
  await wait(page, 500);
  check("B7 suggestions that need the person's words stop the add (Psyflo never writes them)", (await page.locator(".l-main .in.y").count()) === 0 && (await page.getByText(/Type your answer before/).count()) >= 1);
  const boxes = page.locator(T("rec-input"));
  await boxes.nth(0).fill("Partial hospitalization at Harbor Clinic, first visit Mon 11/2 at 9 am");
  await boxes.nth(1).fill("9/21, as written in the psychiatric evaluation");
  await page.locator(T("rec-add")).click();
  await wait(page, 1800);
  check("B8 the extension typed into the form: boxes turn yellow", (await page.locator(".l-main .in.y").count()) >= 3);
  check("B9 the typed sentence is the person's own words in the model's sentence", /Step-down plan: Partial hospitalization at Harbor Clinic/.test(await mainText(page)));
  check("B10 typed text is marked for checking", (await page.locator(".l-main mark").count()) >= 3);
  check("B11 the panel says every suggestion is added and the chance follows", (await page.locator(T("rec-none")).count()) === 1 && /88%/.test(await panelText(page)));
  await snap(page, "b2-typed");
  await page.locator(T("lauris-save")).click();
  await wait(page, 500);
  check("B12 Save in Lauris turns yellow into green and says so", (await page.locator(".l-main .in.y").count()) === 0 && (await page.locator(T("lauris-flash")).count()) === 1);
  check("B13 typed suggestions now read Saved in Lauris", (await page.locator(`${T("rec-typed")} .p-chip.saved`).count()) >= 6);
  await page.locator(T("rec-open-psyflo")).click();
  await wait(page, 700);
  check("B14 Open in Psyflo shows the case page with every recommendation applied", (await page.getByText("Every recommendation is applied").count()) > 0);
  check("B15 each applied card says Added in Lauris", (await page.getByText("Added in Lauris").count()) >= 6);
  check("B16 the approval chance followed (88%)", (await page.getByText(/88%/).count()) > 0);
  await snap(page, "b3-case");
  await page.close();
}

/* ---- C. from the platform to Lauris and back ---- */
{
  const page = await fresh(browser);
  await openPlatformCase(page, "R-1042");
  check("C1 the case page has Add in Lauris and Apply here in Psyflo", (await page.locator(T("add-in-lauris")).count()) === 1 && (await page.locator(T("apply-in-psyflo")).count()) === 1);
  await page.locator(T("add-in-lauris")).click();
  await wait(page, 700);
  check("C2 Add in Lauris opens J.M.'s authorization form with the extension's suggestions", (await page.locator(T("auth-page")).count()) === 1 && (await page.locator(T("rec-card")).count()) === 6);
  check("C3 no Psyflo shell inside Lauris (a separate app in its own tab)", (await page.getByRole("navigation", { name: "Main" }).count()) === 0);
  await page.locator(T("open-platform")).click();
  await wait(page, 700);
  check("C4 the Psyflo platform tab returns to the case page it came from", (await page.getByText("R-1042").count()) > 0 && (await page.locator(T("add-in-lauris")).count()) === 1);
  // the same recommendations added in Psyflo still work
  const ta = page.locator("main textarea");
  await ta.nth(0).fill("Partial hospitalization at Harbor Clinic, first visit Mon 11/2 at 9 am");
  await ta.nth(1).fill("9/21, as written in the psychiatric evaluation");
  await page.locator(T("apply-in-psyflo")).click();
  await wait(page, 9500);
  check("C5 Apply here in Psyflo still applies them, and they are not marked Added in Lauris", (await page.getByText("Every recommendation is applied").count()) > 0 && (await page.getByText("Added in Lauris").count()) === 0);
  await page.close();
}

/* ---- D. a denied authorization re-edited in Lauris; the appeal letter stays in Psyflo ---- */
{
  const page = await fresh(browser);
  await openPlatformDenial(page, "D-3318");
  check("D1 the denial page has Edit authorization in Lauris and Fix in Lauris", (await page.locator(T("edit-auth-in-lauris")).count()) === 1 && (await page.locator('[data-testid^="fix-in-lauris-"]').count()) >= 1);
  await page.locator('[data-testid^="fix-in-lauris-"]').first().click();
  await wait(page, 800);
  check("D2 Fix in Lauris opens the denied authorization with the denial corrections", (await page.locator(T("rec-tab-denial")).getAttribute("aria-selected")) === "true" && (await page.locator(T("denial-view")).count()) === 1);
  const d3 = [/Corrections for resubmission/i.test(await mainText(page)), /Written in Psyflo, not in Lauris/.test(await panelText(page))];
  check("D3 the corrections box exists on the denied form and the appeal stays in Psyflo", d3[0] && d3[1], JSON.stringify(d3));
  await page.locator(T("denial-add")).click();
  await wait(page, 1800);
  const text = await mainText(page);
  check("D4 the corrections are typed with the chart excerpt (stored text), yellow", /Progress note 10\/14: /.test(text) && (await page.locator(".l-main .in.y").count()) >= 1);
  await snap(page, "d1-denial-typed");
  await page.locator(T("lauris-save")).click();
  await wait(page, 500);
  await page.locator(T("open-platform")).click();
  await wait(page, 800);
  check("D5 the Psyflo tab returns to the denial, which marks the corrections Added in Lauris", (await page.getByText("Added in Lauris").count()) >= 1);
  await page.getByRole("button", { name: /Draft the appeal/ }).click();
  await wait(page, 500);
  const confirm = page.getByRole("dialog").getByRole("button", { name: /appeal|confirm|start|yes|continue/i }).last();
  if (await confirm.count()) { await confirm.click(); await wait(page, 2600); }
  check("D6 the appeal letter is in Psyflo (drawer says Kept in Psyflo)", (await page.getByText("Kept in Psyflo").count()) > 0);
  await page.close();
}

/* ---- E. Check before save on an authorization ---- */
{
  const page = await fresh(browser);
  await openAuthOf(page, "4042");
  await page.locator(T("lauris-save")).click();
  await page.waitForSelector(T("lauris-pause"));
  check("E1 Save pauses while a suggestion the request needs is still open (Lauris says so)", /Psyflo paused this save/.test(await page.locator(T("lauris-pause")).innerText()));
  check("E2 the panel shows the paused-save card with the suggestions", (await page.locator(T("pause-card")).count()) === 1 && (await page.locator(T("pause-item")).count()) >= 1);
  await snap(page, "e1-paused");
  await page.locator(T("lauris-save")).click();
  await wait(page, 500);
  check("E3 pressing Save again saves anyway", (await page.locator(T("lauris-flash")).count()) === 1 && (await page.locator(T("lauris-pause")).count()) === 0);
  // with the check off, Save does not pause
  await page.locator(T("tab-settings")).click();
  await page.locator(T("set-onsave")).click();
  await page.locator(T("tab-scan")).click();
  await page.locator(T("rec-input")).first().fill("Partial hospitalization at Harbor Clinic, first visit Mon 11/2 at 9 am");
  await page.locator(T("rec-input")).nth(1).fill("9/21, as written in the psychiatric evaluation");
  await page.locator(T("rec-include")).nth(2).click();
  await page.locator(T("rec-add")).click();
  await wait(page, 1500);
  await page.locator(T("lauris-save")).click();
  await wait(page, 500);
  check("E4 with Check before save off, Save saves at once", (await page.locator(T("lauris-pause")).count()) === 0 && (await page.locator(".l-main .in.y").count()) === 0);
  await page.close();
}

/* ---- F. Scribe a daily note for a platform consumer, scan it, save it ---- */
{
  const page = await fresh(browser);
  await page.locator(T("tab-patients")).click();
  await page.locator(T("pat-search")).fill("J.M.");
  await wait(page, 200);
  check("F1 Patients is one searchable roster", (await page.locator(T("pat-row")).count()) === 1);
  await page.locator(T("pat-row")).click();
  check("F2 a patient shows the authorization form and their documents", (await page.locator(T("pat-auth")).count()) === 1 && (await page.locator(T("pat-doc")).count()) === 3);
  await page.locator(`${T("pat-doc")}[data-doc-id="dpn-4042"] ${T("pat-scribe")}`).click();
  await page.locator(T("scribe-start")).click();
  await page.locator(T("consent-yes")).click();
  await page.waitForSelector(T("scribe-complete"));
  await wait(page, 900);
  await page.locator(T("scribe-complete")).click();
  await page.waitForSelector('[data-draft="duration"]', { timeout: 15000 });
  const cards = await page.locator("[data-draft]").evaluateAll((els) => els.map((e) => e.getAttribute("data-draft")));
  check("F3 Scribe drafts from what was said: minutes, intervention, response, craving and safety", ["duration", "intervention", "response", "sx", "risk"].every((k) => cards.includes(k)), cards.join());
  check("F4 what nobody said is Not stated (plan goal and next step)", (await panelText(page)).includes("Not stated") || (await page.locator('[data-draft="goal"]').count()) === 1);
  await page.locator(T("scribe-reviewed")).check();
  await page.locator(T("scribe-type")).click();
  await page.waitForSelector(T("scribe-typed"));
  check("F5 the typed fields are yellow in Lauris", (await page.locator('[data-field="duration"]').first().getAttribute("data-state")) === "typed" && /45 min/.test(await page.locator('[data-field="duration"] input').first().inputValue()));
  check("F6 the safety screen was typed from what was said, not guessed", /None reported/.test(await mainText(page)) && (await page.locator('[data-field="goal"]').first().getAttribute("data-state")) !== "typed");
  await snap(page, "f1-typed");
  await page.locator(T("scribe-to-scan")).click();
  await page.locator(T("scan-run")).click();
  await wait(page, 1000);
  const goal = page.locator(`${T("rec-card")}, [data-finding]`).filter({ hasText: /No plan goal is named/ });
  check("F7 Scan & Enhance finds the plan goal nobody named and offers the clinic's own goals to pick from", (await goal.count()) === 1 && (await goal.locator("[data-option]").count()) === 4);
  await goal.locator("[data-option]").first().click();
  await goal.locator(T("fix-add")).click();
  await wait(page, 600);
  check("F8 the picked goal is typed into the select (Psyflo never preselects)", /Goal 1/.test(await page.locator('[data-field="goal"] select').first().evaluate((el) => el.options[el.selectedIndex]?.text ?? "")));
  await page.locator(T("lauris-save")).click();
  await wait(page, 1900);
  const pausedOrSaved = (await page.locator(T("lauris-flash")).count()) + (await page.locator(T("lauris-pause")).count());
  check("F9 Save checks first, then saves (or pauses on what is still severe)", pausedOrSaved >= 1);
  if (await page.locator(T("lauris-pause")).count()) { await page.locator(T("lauris-save")).click(); await wait(page, 500); }
  await page.locator(T("tab-history")).click();
  check("F10 History lists the session that was scribed", (await page.locator(`${T("hist-item")}`).count()) >= 1);
  await page.close();
}

/* ---- G. Scan & Enhance on a saved note written by someone else ---- */
{
  const page = await fresh(browser);
  await openDocOf(page, "4207", "dpn-4207");
  await page.locator(T("tab-scan")).click();
  await page.locator(T("scan-run")).click();
  await wait(page, 1100);
  const tally = (await page.locator(T("scan-tally")).innerText()).replace(/\s+/g, " ");
  check("G1 the scan finds the gaps in the saved note (severe, medium, low)", /Severe 1/.test(tally) && /Medium 4/.test(tally) && /Low 1/.test(tally), tally);
  const wording = page.locator("[data-finding]").filter({ hasText: /noncompliant/ });
  check("G2 the wording check flags the label and asks the clinician for their own words", (await wording.count()) === 1 && (await wording.locator(T("fix-answer")).count()) === 1);
  await wording.locator(T("fix-answer")).fill("Missed the sign-in time on two mornings.");
  await wording.locator(T("fix-add")).click();
  await wait(page, 500);
  check("G3 the person's sentence replaced the label in Lauris, yellow, and the finding does not come back", /Missed the sign-in time on two mornings\./.test(await page.locator('[data-field="response"]').first().innerText()) && (await page.locator("[data-finding]").filter({ hasText: /noncompliant/ }).locator('[data-status="open"]').count()) === 0);
  check("G4 Lauris shows Psyflo chips beside the fields that have findings", (await page.locator(`.l-main ${T("chip")}`).count()) >= 3);
  await page.locator(T("lauris-save")).click();
  await page.waitForSelector(T("lauris-pause"));
  check("G5 Save pauses on the severe safety gap", (await page.locator(T("pause-card")).count()) === 1);
  await snap(page, "g1-paused");
  await page.close();
}

/* ---- H. any patient, any document; the clinic switch ---- */
{
  const page = await fresh(browser);
  await page.locator(T("tab-scribe")).click();
  await page.locator(T("pick-patient")).selectOption({ label: "K.W., 26 (4101)" });
  await page.locator(T("pick-doc")).selectOption({ label: "Assessment summary (new)" });
  await page.waitForSelector("[data-field]");
  check("H1 any patient, any kind of document: a new blank document opens in Lauris", /ASAM Assessment Summary/.test(await mainText(page)) && /K\.W\./.test(await mainText(page)));
  check("H2 the panel is ready to scribe it", (await page.locator(T("scribe-start")).count()) === 1);
  await page.locator(T("open-platform")).click();
  await wait(page, 500);
  await toLauris(page);
  await page.locator('[data-clinic="harvest"]').click();
  await page.waitForSelector('a[data-consumer="4471"]');
  check("H3 the Harvest content of the extension demo is one click away", (await page.locator(`${T("consumers-table")} a[data-consumer]`).count()) < 20);
  await page.locator('[data-clinic="platform"]').click();
  await page.waitForSelector('a[data-consumer="4042"]');
  check("H4 and the platform's consumers come back", (await page.locator(`${T("consumers-table")} a[data-consumer]`).count()) >= 56);
  await page.close();
}

/* ---- I. a narrow window ---- */
{
  const page = await fresh(browser, { width: 760, height: 900 });
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check("I1 at 760px wide nothing spills sideways", w <= 762, `scrollWidth=${w}`);
  await page.close();
}

await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length} of ${results.length} checks passed; page errors: ${errors.length}${errors.length ? " " + JSON.stringify(errors.slice(0, 3)) : ""}`);
process.exit(bad.length || errors.length ? 1 : 0);
