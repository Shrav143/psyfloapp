/* End-to-end check of the EHR round, driven through the UI of a build.
     npx vite build                       (HashRouter, the normal build)
     node scripts/ehr-e2e.mjs dist/index.html
     VITE_HOSTED=1 npx vite build --outDir dist-hosted && node scripts/ehr-e2e.mjs dist-hosted/index.html hosted
   The hosted build keeps the route in memory, so it is driven by clicking only. Exit code 1 if any check fails. */
import { createRequire } from "node:module";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)(process.env.PW || "/opt/node22/lib/node_modules/playwright/index.js");
const file = path.resolve(process.argv[2] || "dist/index.html");
const hosted = process.argv[3] === "hosted";
const shots = process.env.SHOTS || "";

const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : extra ? ` (${extra})` : ""}`); };
const errors = [];

async function fresh(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  await page.goto("file://" + file);
  await page.waitForTimeout(900);
  return page;
}
const go = async (page, hash) => { if (!hosted) { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(500); } };
const hashOf = (page) => page.evaluate(() => location.hash);
const snap = async (page, name) => { if (shots) await page.screenshot({ path: `${shots}/${name}.png` }); };

/** In the hosted build there is no address bar: reach a case through the sidebar and the queue. */
async function openCase(page, id) {
  if (!hosted) return go(page, `#/authorizations/case/${id}`);
  await page.getByRole("link", { name: /^Authorizations/ }).first().click();
  await page.waitForTimeout(500);
  await page.getByText(id, { exact: true }).first().click();
  await page.waitForTimeout(600);
}
async function openDenial(page, id) {
  if (!hosted) return go(page, `#/denials/${id}`);
  await page.getByRole("link", { name: /^Denial Intelligence/ }).first().click();
  await page.waitForTimeout(500);
  await page.getByText(id, { exact: true }).first().click();
  await page.waitForTimeout(600);
}

const browser = await chromium.launch();

/* ---- A. an authorization: Psyflo case page -> Lauris -> extension -> save -> back ---- */
{
  const page = await fresh(browser);
  await openCase(page, "R-1042");
  const before = await page.locator('[data-testid="add-in-lauris"]').count();
  check("A1 case page has Add in Lauris (primary) and Apply here in Psyflo (second)", before === 1 && (await page.locator('[data-testid="apply-in-psyflo"]').count()) === 1);
  check("A2 case page header has Edit in Lauris", (await page.locator('[data-testid="edit-in-lauris"]').count()) === 1);
  await snap(page, "a1-case");
  await page.locator('[data-testid="add-in-lauris"]').click();
  await page.waitForTimeout(700);
  if (!hosted) check("A3 Add in Lauris goes to the Lauris form for R-1042", (await hashOf(page)).startsWith("#/lauris/case/R-1042"), await hashOf(page));
  check("A4 the Lauris page and the Psyflo extension are both there", (await page.getByText("Lauris Online").first().isVisible()) && (await page.getByText("Suggested by Psyflo").first().isVisible()));
  check("A5 no Psyflo shell inside Lauris (separate app)", (await page.getByRole("navigation", { name: "Main" }).count()) === 0);
  check("A6 the form starts green: four boxes already in Lauris, none yellow", (await page.locator(".l-main .in.g, .l-main .fld .in.g").count()) >= 4 && (await page.locator(".l-main .in.y").count()) === 0);

  // needs-your-words cards refuse until the person has typed their own words
  await page.getByRole("button", { name: /Add 6 to the Lauris form/ }).click();
  await page.waitForTimeout(500);
  check("A7 cards that need the person's words stop the add (Psyflo never writes them)", (await page.locator(".l-main .in.y").count()) === 0 && (await page.getByText(/Add your answer first|Type your answer/).count()) > 0);
  const boxes = page.locator("aside textarea");
  await boxes.nth(0).fill("Partial hospitalization at Harbor Clinic, first visit Mon 11/2 at 9 am");
  await boxes.nth(1).fill("9/21, as written in the psychiatric evaluation");
  await page.getByRole("button", { name: /Add 6 to the Lauris form/ }).click();
  await page.waitForTimeout(1800);
  const yellow = await page.locator(".l-main .in.y").count();
  check("A8 the extension typed into the form: boxes turn yellow", yellow >= 3, `yellow=${yellow}`);
  const planText = (await page.locator('.l-main [data-field="plan"], .l-main .fld').filter({ hasText: "Plan" }).first().innerText()).replace(/\s+/g, " ");
  check("A9 the typed sentence is the person's own words in the model's sentence", /Step-down plan: Partial hospitalization at Harbor Clinic/.test(planText), planText.slice(0, 160));
  check("A10 typed text is marked for checking (<mark>)", (await page.locator(".l-main mark").count()) >= 3);
  check("A11 the panel says every recommendation is added", (await page.getByText("Every recommendation is added").count()) > 0);
  await snap(page, "a2-typed");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(500);
  check("A12 Save in Lauris turns yellow into green", (await page.locator(".l-main .in.y").count()) === 0 && (await page.locator(".l-main .in.g").count()) >= 4);
  await snap(page, "a3-saved");
  await page.getByRole("tab", { name: /Psyflo/ }).click();
  await page.waitForTimeout(700);
  if (!hosted) check("A13 the Psyflo tab returns to the case page", (await hashOf(page)).startsWith("#/authorizations/case/R-1042"), await hashOf(page));
  check("A14 the case page shows every recommendation applied", (await page.getByText("Every recommendation is applied").count()) > 0);
  await page.getByText("Applied", { exact: false }).first().scrollIntoViewIfNeeded();
  check("A15 each applied card says Added in Lauris", (await page.getByText("Added in Lauris").count()) >= 6);
  check("A16 the approval chance followed (88%)", (await page.getByText(/88%/).count()) > 0);
  await snap(page, "a4-back");
  await page.close();
}

/* ---- B. the same recommendations added in Psyflo still work ---- */
{
  const page = await fresh(browser);
  await openCase(page, "R-1042");
  const ta = page.locator('main textarea');
  await ta.nth(0).fill("Partial hospitalization at Harbor Clinic, first visit Mon 11/2 at 9 am");
  await ta.nth(1).fill("9/21, as written in the psychiatric evaluation");
  await page.locator('[data-testid="apply-in-psyflo"]').click();
  await page.waitForTimeout(9500);
  check("B1 Apply here in Psyflo still applies them", (await page.getByText("Every recommendation is applied").count()) > 0);
  check("B2 they are not marked as added in Lauris", (await page.getByText("Added in Lauris").count()) === 0);
  await page.close();
}

/* ---- C. a denied authorization re-edited in Lauris; the appeal letter stays in Psyflo ---- */
{
  const page = await fresh(browser);
  await openDenial(page, "D-3318");
  check("C1 denial page has Edit authorization in Lauris and Fix in Lauris", (await page.locator('[data-testid="edit-auth-in-lauris"]').count()) === 1 && (await page.locator('[data-testid^="fix-in-lauris-"]').count()) >= 1);
  check("C2 the evidence button says it is for the appeal", (await page.getByRole("button", { name: /Add to the appeal evidence/ }).count()) >= 1);
  await snap(page, "c1-denial");
  await page.locator('[data-testid^="fix-in-lauris-"]').first().click();
  await page.waitForTimeout(700);
  if (!hosted) check("C3 Fix in Lauris opens the denied authorization in denial view", /^#\/lauris\/case\/R-0997\?view=denial/.test(await hashOf(page)), await hashOf(page));
  check("C4 the corrections box exists on a denied authorization", (await page.getByText("Corrections for resubmission").count()) > 0);
  check("C5 the extension shows Denial corrections and the appeal stays in Psyflo", (await page.getByText("Denial corrections").count()) > 0 && (await page.getByText(/Written in Psyflo, not in Lauris/).count()) > 0);
  await page.getByRole("button", { name: /Add \d+ to the Lauris form/ }).click();
  await page.waitForTimeout(1800);
  const text = (await page.locator(".l-main").innerText()).replace(/\s+/g, " ");
  check("C6 the corrections are typed with the chart excerpt (stored text), yellow", /Progress note 10\/14: /.test(text) && (await page.locator(".l-main .in.y").count()) >= 1);
  await snap(page, "c2-typed");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole("tab", { name: /Psyflo/ }).click();
  await page.waitForTimeout(700);
  if (!hosted) check("C7 the Psyflo tab returns to the denial", (await hashOf(page)).startsWith("#/denials/D-3318"), await hashOf(page));
  check("C8 the denial marks the corrections Added in Lauris", (await page.getByText("Added in Lauris").count()) >= 1);
  await page.getByRole("button", { name: /Draft the appeal/ }).click();
  await page.waitForTimeout(500);
  const confirm = page.getByRole("dialog").getByRole("button", { name: /appeal|confirm|start|yes|continue/i }).last();
  if (await confirm.count()) { await confirm.click(); await page.waitForTimeout(2600); }
  check("C9 the appeal letter is in Psyflo (drawer says Kept in Psyflo)", (await page.getByText("Kept in Psyflo").count()) > 0);
  await snap(page, "c3-appeal");
  await page.close();
}

/* ---- D. the extension home and the Lauris lists ---- */
{
  const page = await fresh(browser);
  if (!hosted) {
    await go(page, "#/lauris");
    check("D1 the Consumers page lists consumers with Lauris numbers", (await page.locator(".l-main table tbody tr").count()) >= 10);
    check("D2 the extension home lists authorizations to edit", (await page.getByText("To edit in Lauris").count()) > 0 && (await page.getByRole("button", { name: /Open the form/ }).count()) >= 3);
    await page.getByRole("button", { name: /Open the form/ }).first().click();
    await page.waitForTimeout(600);
    check("D3 Open the form goes to that authorization form", /^#\/lauris\/case\//.test(await hashOf(page)));
    await go(page, "#/lauris/authorizations");
    check("D4 the Authorizations list opens", (await page.getByText("Open form").count()) >= 1);
    await go(page, "#/lauris/case/R-0000");
    check("D5 an unknown authorization says not found", (await page.getByText(/not found/i).count()) > 0);
    // the toolbar button hides and shows the panel
    await go(page, "#/lauris");
    await page.getByRole("button", { name: /psyflo/i }).first().click();
    await page.waitForTimeout(300);
    check("D6 the extension button hides the panel", (await page.getByText("Suggested by Psyflo").count()) === 0 && (await page.getByText("To edit in Lauris").count()) === 0);
  }
  await page.close();
}

await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length} of ${results.length} checks passed; page errors: ${errors.length}${errors.length ? " " + JSON.stringify(errors.slice(0, 3)) : ""}`);
process.exit(bad.length || errors.length ? 1 : 0);
