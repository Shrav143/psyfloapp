/* End-to-end check of the combined demo (the Psyflo platform, the mock Lauris EHR and the Psyflo extension in one page), driven through the UI of a build.
     npx vite build                          (HashRouter, the normal build)
     node scripts/e2e.mjs dist/index.html
     VITE_HOSTED=1 npx vite build --outDir dist-hosted && node scripts/e2e.mjs dist-hosted/index.html hosted
   The hosted build keeps the route in memory, so everything is reached by clicking. Exit code 1 if any check fails or the page logs an error. SHOTS=/some/dir saves screenshots. */
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
const toPlatform = async (page) => { await page.locator(T("view-platform")).click(); await wait(page, 500); };
const toLauris = async (page) => { await page.locator(T("view-extension")).click(); await page.waitForSelector(T("lauris-shell")); await wait(page, 250); };
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

/* ---- A. one link: the demo opens on Lauris with the extension; a toggle at the top goes to the Psyflo platform and back ---- */
{
  const page = await fresh(browser);
  const names = await page.locator(".psy-ic[role=tab]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  check("A1 the demo opens on Lauris with the extension docked, six icons in order", JSON.stringify(names) === JSON.stringify(["Scribe", "History", "Patients", "Scan & Enhance", "Help", "Settings"]), names.join(","));
  check("A2 a toggle at the top switches between the Extension and the Psyflo platform", (await page.locator(T("view-extension")).getAttribute("aria-pressed")) === "true" && (await page.locator(T("view-platform")).count()) === 1);
  check("A3 there is only one demo clinic: no Harvest or CCCSN switch", (await page.locator(".shell-demo [data-clinic]").count()) === 0);
  const rows = await page.locator(`${T("consumers-table")} a[data-consumer]`).count();
  check("A4 Lauris lists the clinic's own clients first, then every consumer of the platform's queue", rows >= 62 && (await page.locator(`${T("consumers-table")} a[data-consumer]`).first().getAttribute("data-consumer")) === "c101", `rows=${rows}`);
  check("A5 platform consumers show where the authorization stands", (await page.locator(`${T("consumers-table")} tbody .st`).count()) >= 56);
  check("A6 the panel is 400px wide, opens on Start a new session and names the clinic", Math.round((await page.locator(".shell-panel").boundingBox()).width) === 400 && /Start a new session/.test(await panelText(page)) && /CCCSN/.test(await page.locator(".psy-head").innerText()));
  const chrome = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  check("A7 the language is substance use treatment: no school, TDT or child-mental-health wording", !/TDT|Harvest|school|CANS|therapeutic day/i.test(chrome));
  await snap(page, "a1-start");

  await page.locator('a[data-consumer="4042"]').click();
  await wait(page, 200);
  await toPlatform(page);
  check("A8 the toggle opens the platform (dashboard with its sidebar, no Lauris)", (await page.getByRole("navigation", { name: "Main" }).count()) > 0 && (await page.locator(T("lauris-shell")).count()) === 0);
  await snap(page, "a2-platform");
  check("A9 the platform has the same toggle, with the platform side on", (await page.locator(T("view-platform")).getAttribute("aria-pressed")) === "true" && (await page.locator(T("view-extension")).count()) === 1);
  await toLauris(page);
  check("A10 going back finds Lauris where it was left (J.M.'s record)", /J\.M\./.test(await mainText(page)) && (await page.locator(T("auth-card")).count()) === 1);
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
  await page.locator(T("view-platform")).click();
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
  await page.locator(T("view-platform")).click();
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

/* ---- F. Scribe a progress note for one of the clinic's clients, scan it, save it ---- */
{
  const page = await fresh(browser);
  await page.locator(T("tab-patients")).click();
  await page.locator(T("pat-search")).fill("M.R.");
  await wait(page, 200);
  check("F1 Patients is one searchable roster that holds the clinic's clients and the platform's consumers", (await page.locator(T("pat-row")).count()) >= 2);
  await page.locator(`${T("pat-row")}[data-patient="c101"]`).click();
  check("F2 a client shows their documents", (await page.locator(T("pat-doc")).count()) === 2);
  await page.locator(`${T("pat-doc")}[data-doc-id="dpn-c101"] ${T("pat-scribe")}`).click();
  await page.locator(T("scribe-start")).click();
  await page.locator(T("consent-yes")).click();
  await page.waitForSelector(T("scribe-complete"));
  await wait(page, 900);
  await page.locator(T("scribe-complete")).click();
  await page.waitForSelector('[data-draft="time"]', { timeout: 15000 });
  const cards = await page.locator("[data-draft]").evaluateAll((els) => els.map((e) => e.getAttribute("data-draft")));
  check("F3 Scribe drafts from what was said: the time, units, goal, intervention and response", ["time", "units", "goal", "intervention", "response"].every((k) => cards.includes(k)), cards.join());
  await page.locator(T("scribe-reviewed")).check();
  await page.locator(T("scribe-type")).click();
  await page.waitForSelector(T("scribe-typed"));
  check("F4 the typed fields are yellow in Lauris", (await page.locator('.lauris [data-state="typed"]').count()) >= 5);
  await snap(page, "f1-typed");
  await page.locator(T("scribe-to-scan")).click();
  await page.locator(T("scan-run")).click();
  await wait(page, 1100);
  const plan = page.locator("[data-finding]").filter({ hasText: /Plan \/ next steps is blank/ });
  check("F5 Scan & Enhance finds the one thing nobody said (the next step)", (await plan.count()) === 1 && /Medium 1/.test((await page.locator(T("scan-tally")).innerText()).replace(/\s+/g, " ")));
  await plan.locator(T("fix-answer")).fill("Continue the craving plan and attend Thursday's group.");
  await plan.locator(T("fix-add")).click();
  await wait(page, 500);
  check("F6 the person's own words went into the box (yellow) and the finding does not come back", /craving plan and attend Thursday/.test(await page.locator('[data-field="plan"]').first().innerText()) && (await page.locator("[data-finding][data-status=open]").count()) === 0);
  await page.locator(T("lauris-save")).click();
  await page.waitForSelector(T("lauris-flash"), { timeout: 5000 });
  check("F7 Save checks first, then saves, and the typed text turns green", (await page.locator('.lauris [data-state="typed"]').count()) === 0);
  await page.locator(T("tab-history")).click();
  check("F8 History lists the session that was scribed", (await page.locator(T("hist-item")).count()) >= 1);
  await page.close();
}

/* ---- G. Scan & Enhance on a saved note written by someone else ---- */
{
  const page = await fresh(browser);
  await openDocOf(page, "c103", "dpn-c103");
  await page.locator(T("tab-scan")).click();
  await page.locator(T("scan-run")).click();
  await wait(page, 1200);
  const tally = (await page.locator(T("scan-tally")).innerText()).replace(/\s+/g, " ");
  check("G1 the scan finds the gaps in the saved note (2 severe, 4 medium)", /Severe 2/.test(tally) && /Medium 4/.test(tally), tally);
  const observed = page.locator("[data-finding]").filter({ hasText: /Observed.*describes watching/ });
  check("G2 the wording check flags the word and asks the clinician for their own words", (await observed.count()) === 1 && (await observed.locator(T("fix-answer")).count()) === 1);
  await observed.locator(T("fix-answer")).fill("Facilitated relapse prevention skills with the group.");
  await observed.locator(T("fix-add")).click();
  await wait(page, 500);
  check("G3 the person's sentence replaced the word in Lauris, yellow", /Facilitated relapse prevention skills/.test(await page.locator('[data-field="intervention"]').first().innerText()));
  check("G4 Lauris shows Psyflo chips beside the fields that have findings", (await page.locator(`.l-main ${T("chip")}`).count()) >= 3);
  await page.locator(T("lauris-save")).click();
  await page.waitForSelector(T("lauris-pause"));
  check("G5 Save pauses on what is still severe, and the panel shows the paused-save card", (await page.locator(T("pause-card")).count()) === 1);
  await snap(page, "g1-paused");
  await page.locator(T("save-anyway")).click();
  await wait(page, 600);
  check("G6 Save anyway saves and says alerts were still open", /still open/.test(await page.locator(T("lauris-flash")).innerText()));
  await page.close();
}

/* ---- H. any client, any document; Help and Settings ---- */
{
  const page = await fresh(browser);
  await page.locator(T("tab-scribe")).click();
  await page.locator(T("pick-patient")).selectOption({ label: "K.W., 26 (4101)" });
  await page.locator(T("pick-doc")).selectOption({ label: "ASAM assessment (new)" });
  await page.waitForSelector("[data-field]");
  check("H1 any consumer, any kind of document: a new blank document opens in Lauris", /ASAM assessment/i.test(await mainText(page)) && /K\.W\./.test(await mainText(page)));
  check("H2 the panel is ready to scribe it", (await page.locator(T("scribe-start")).count()) === 1);
  await page.locator(T("tab-help")).click();
  check("H3 Help is three options: Chat with Psyflo, FAQs, Training videos", (await page.locator('[data-testid^="help-"]').count()) === 3);
  await page.locator(T("tab-settings")).click();
  check("H4 Settings is Recording and Check before save", (await page.locator(T("set-onsave")).count()) === 1 && (await page.locator(T("set-mic")).count()) === 1);
  await page.close();
}

/* ---- J. the simplified platform: no New Case, no EMR Connect, an icon dashboard, Payers as context for the agents ---- */
{
  const page = await fresh(browser);
  await toPlatform(page);
  const nav = (await page.getByRole("navigation", { name: "Main" }).innerText()).replace(/\s+/g, " ");
  check("J1 the sidebar has no New Case and no EMR Connect, and keeps Eligibility and Payers", !/New Case/i.test(nav) && !/EMR/i.test(nav) && /Payer settings/.test(nav) && /Eligibility & Benefits/.test(nav) && !/All Authorizations/.test(nav) && (await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Authorizations/ }).count()) === 1 && /Denial Intelligence/.test(nav));
  const body = (await page.locator("main").innerText()).replace(/\s+/g, " ");
  check("J2 the dashboard has no Do next card and no Lifecycle card", !/Do next/i.test(body) && !/Lifecycle/i.test(body));
  check("J3 it is six icon tiles with a number each", (await page.locator(`${T("dash-tiles")} [data-tile]`).count()) === 6);
  check("J4 the first group of the table is what needs attention, in red", (await page.locator("[data-group]").first().getAttribute("data-group")) === "attention" && (await page.locator('[data-tier="attention"]').count()) >= 3);
  check("J5 two date menus, then payer, program and request type", (await page.locator(`${T("dash-filters")} button[aria-haspopup]`).count()) >= 5 || (await page.locator(`${T("dash-filters")} [role=combobox], ${T("dash-filters")} button`).count()) >= 5);
  await snap(page, "j1-dashboard");
  const all = await page.locator("tr[data-request]").count();
  await page.locator('[data-tile="upcoming"]').click();
  await wait(page, 200);
  const soon = await page.locator("tr[data-request]").count();
  check("J6 a tile filters the table to that colour", soon > 0 && soon < all && (await page.locator('tr[data-request]:not([data-tier="upcoming"])').count()) === 0, `all=${all} soon=${soon}`);
  await page.locator('[data-tile="upcoming"]').click();
  await page.locator("tr[data-request] button[data-action]").first().click();
  await wait(page, 500);
  check("J7 a row's icon button opens that request", (await page.getByRole("dialog").count()) >= 1);
  await page.keyboard.press("Escape");
  // payers
  await page.getByRole("link", { name: /^Payer settings/ }).first().click();
  await wait(page, 500);
  check("J8 Payers is a plain list with how many notes each payer has", (await page.locator(`${T("payers-list")} li`).count()) >= 6);
  await page.locator('[data-payer="cardinal"]').click();
  await wait(page, 500);
  check("J9 a payer is one page: a box to tell the agents, and the rules Psyflo already follows", (await page.locator(T("payer-context-input")).count()) === 1 && /What Psyflo already knows/.test(await page.locator("main").innerText()) && (await page.getByRole("tab", { name: /Workflow Builder|Test Workflow/ }).count()) === 0);
  await page.locator(T("payer-context-input")).fill("Cardinal asks for the drug screen on every continued-stay request.");
  await page.locator(T("payer-context-add")).click();
  await wait(page, 300);
  check("J10 what you add is listed, and the agents will read it", (await page.locator(`${T("payer-notes")} li`).count()) === 2 && /drug screen on every continued-stay/.test(await page.locator(T("payer-notes")).innerText()));
  await page.getByRole("button", { name: /What the agents will read/ }).click();
  check("J11 the prompt the agents read includes the note", /drug screen on every continued-stay/.test(await page.locator(T("payer-prompt")).innerText()));
  // eligibility stays
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Eligibility/ }).click();
  await wait(page, 500);
  check("J12 Eligibility & Benefits is its own tab, and Authorizations is not lit while it is open", /Eligibility/.test(await page.locator("main").innerText()) && (await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Authorizations/ }).getAttribute("class") ?? "").indexOf("bg-forest") < 0);
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
