/* Selftest for the Harvest Outreach content. Run:   bun src/clinics/harvest/selftest.ts
   Exits non-zero on any failure and prints a summary. It checks the shape of the config, the Scribe scenarios, every check on every document,
   and the rules every fix must obey (quote the chart word for word; name no fact beyond the chart or the clinician; never come back after it is typed). */
import { asText, checksFor, fieldByKey, fieldsOf, isEmpty, runChecks, writeInto } from "../../engine";
import type { DocKind, FieldSpec, Finding, FormSpec, ScribeScenario, Val } from "../../types";
import { LEAVE_RE, PRIOR_OPTIONS } from "./checks";
import { CANS_RATING_KEYS, ELOPE, HOUSEHOLD_INCLUDE } from "./forms";
import { harvest as clinic } from "./index";

let failed = 0;
const fail = (msg: string) => { failed++; console.error(`  FAIL  ${msg}`); };
const expect = (cond: unknown, msg: string) => { if (!cond) fail(msg); };
const section = (t: string) => console.log(`\n== ${t}`);

const consumerOf = (id: string) => clinic.consumers.find((c) => c.id === id);
const seedOf = (docId: string) => clinic.docs.find((d) => d.id === docId)!;
const specOf = (kind: DocKind): FormSpec => clinic.forms[kind]!;
const KINDS: DocKind[] = ["dpn", "admission", "intake", "assessment", "sra"];

/* ------------------------------ helpers ------------------------------ */
function validValue(f: FieldSpec, v: Val): string | null {
  switch (f.kind) {
    case "checks": {
      if (!Array.isArray(v)) return "not a list";
      const bad = v.filter((x) => !f.options?.includes(x));
      return bad.length ? `unknown options: ${bad.join(" | ")}` : null;
    }
    case "select": return v === "" || (typeof v === "string" && f.options?.includes(v)) ? null : `"${asText(v)}" is not one of the options`;
    case "yesno": return v === "" || v === "Yes" || v === "No" ? null : `"${asText(v)}" is not Yes or No`;
    case "date": return v === "" || (typeof v === "string" && /^\d\d\/\d\d\/\d{4}$/.test(v)) ? null : `"${asText(v)}" is not mm/dd/yyyy`;
    default: return typeof v === "string" ? null : "not text";
  }
}
const scan = (docId: string, values: Record<string, Val>): Finding[] => runChecks(clinic, docId, seedOf(docId).kind, values, seedOf(docId).consumerId);
const tally = (fs: Finding[]): string => `${fs.length} finding${fs.length === 1 ? "" : "s"}: ${fs.filter((f) => f.severity === "severe").length} severe · ${fs.filter((f) => f.severity === "medium").length} medium · ${fs.filter((f) => f.severity === "low").length} low`;
const brief = (f: Finding): string => `${f.severity.padEnd(6)} ${f.checkId} → ${f.fieldKey} · ${f.fix ? f.fix.kind : "no fix"}${f.fix?.kind === "text" ? ` (quotes "${f.fix.source}")` : ""}`;

/** What a Scribe draft does to the document, exactly as the store's scribeType does (every included card, in form order, appended). */
function applyScribe(docId: string): Record<string, Val> {
  const seed = seedOf(docId);
  const sc = clinic.scribe.find((s) => s.docId === docId)!;
  const values: Record<string, Val> = { ...seed.values };
  for (const f of fieldsOf(specOf(seed.kind))) {
    const d = sc.draft[f.key];
    if (!d || d.from === "none" || f.lock || isEmpty(d.value)) continue;
    const cur = values[f.key];
    if (!isEmpty(cur) && asText(cur).trim() === asText(d.value).trim()) continue;
    values[f.key] = writeInto(f, cur, d.value, "append").value;
  }
  return values;
}

/** The short sample answers the selftest types for "ask" fixes. Most checks only need words; a few need a format. */
const SAMPLE: Record<string, string> = {
  "dpn-duration": "25 min (sample)",
  "dpn-date": "10/29/2026",
  "sra-isp-change-date": "Oct 22, 2026",
};
const DEFAULT_SAMPLE = "A short sample answer from the clinician.";
const sampleFor = (f: Finding): string => SAMPLE[f.checkId] ?? DEFAULT_SAMPLE;
const MARK = "§SAMPLE§";

/** The strings a fix puts in the box (or offers), without the clinician's own words. */
function typedByPsyflo(f: Finding): string[] {
  const fix = f.fix;
  if (!fix) return [];
  if (fix.kind === "text") return [fix.text];
  if (fix.kind === "choose") return fix.options;
  return [fix.frame(MARK).replace(MARK, "")];
}
/** Simulate one fix with writeInto (what the store does) and return the new values, or null when there is no fix. */
function applyFix(values: Record<string, Val>, f: Finding, spec: FormSpec): Record<string, Val> | null {
  const fix = f.fix;
  const field = fieldByKey(spec, f.fieldKey);
  if (!fix || !field) return null;
  const proposal: Val = fix.kind === "text" ? fix.text : fix.kind === "ask" ? fix.frame(sampleFor(f)) : fix.options[0];
  const mode = fix.kind === "choose" ? "replace" : fix.mode;
  return { ...values, [f.fieldKey]: writeInto(field, values[f.fieldKey], proposal, mode).value };
}

/* ====================================================================================================
   1. Shape of the config
   ==================================================================================================== */
section("Config");
expect(clinic.id === "harvest", "id is harvest");
expect(clinic.today === "2026-10-29", "today is 2026-10-29");
expect(clinic.profile.name === "Harvest Outreach" && clinic.profile.short === "Harvest", "profile name and short");
expect(clinic.profile.programs.length === 5 && clinic.profile.programs.every((p) => p.code.startsWith("H2016") && p.sites.length > 0), "five TDT programs with H2016 and sites");
expect(clinic.profile.payers.length === 6, "six payers");
for (const p of clinic.profile.payers) expect(/sample/i.test(p.criteria), `payer ${p.id} criteria says "sample"`);
expect(clinic.profile.accreditations.length === 2 && clinic.profile.accreditations.every((a) => a.endsWith("(to confirm with Harvest)")), "two accreditations, each ending (to confirm with Harvest)");
expect(clinic.profile.retention.transcripts === "Rolling: deleted 14 days after the note is saved", "transcript retention");
expect(clinic.profile.retention.documents === "Retained when saved", "document retention");
expect(clinic.profile.checks.pauseAt === "severe" && clinic.profile.checks.onSave === true, "checks defaults");
for (const k of KINDS) expect(clinic.profile.documentRules.some((r) => r.doc === k), `document rule for ${k}`);
expect(clinic.profile.verbiage.some((v) => /patient/i.test(v.rule) && /consumer/i.test(v.rule)), "verbiage rule: patient vs consumer");
expect(clinic.profile.verbiage.some((v) => /observed/i.test(v.rule)), "verbiage rule: observed");
expect(clinic.profile.verbiage.length >= 5, "at least five verbiage rules");
for (const c of clinic.consumers) expect(clinic.profile.payers.some((p) => p.id === c.payer), `consumer ${c.id} payer exists`);
for (const c of clinic.consumers) expect(clinic.profile.programs.some((p) => p.name === c.program), `consumer ${c.id} program "${c.program}" is a program`);
expect(new Set(clinic.consumers.map((c) => c.id)).size === clinic.consumers.length, "consumer ids are unique");
expect(["4471", "4492", "4458", "4441", "4466", "4455", "4449", "4437", "4430", "4426", "4419"].every((id) => consumerOf(id)), "all eleven roster consumers");
for (const c of clinic.consumers) {
  expect(/^[A-Z]\.[A-Z]\.$/.test(c.ini), `consumer ${c.id} has initials only (${c.ini})`);
  expect(new Set(c.chart.map((r) => r.id)).size === c.chart.length, `consumer ${c.id} chart ids are unique`);
  for (const id of c.docs) expect(clinic.docs.some((d) => d.id === id && d.consumerId === c.id), `consumer ${c.id} lists document ${id} that exists for them`);
  if (c.docs.length === 0) expect(c.docs.length === 0, "docs: [] for consumers without documents");
}
/* units agree between the roster and the authorization record */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
for (const c of clinic.consumers) {
  const auth = c.chart.find((r) => r.id === "auth");
  if (c.units) {
    expect(auth, `consumer ${c.id} has an authorization record`);
    if (auth) {
      expect(auth.text.includes(`${c.units.left} units available`) || auth.text.includes(`${c.units.left} sessions available`), `consumer ${c.id}: ${c.units.left} left matches the authorization record`);
      const m = /^(\d\d)\/(\d\d)\/\d{4}$/.exec(c.units.ends);
      expect(m && auth.text.includes(`${MONTHS[+m![1] - 1]} ${+m![2]} ·`), `consumer ${c.id}: authorization end ${c.units.ends} matches the record`);
    }
  } else expect(!auth, `consumer ${c.id} has no units and no authorization record`);
}

section("Forms");
for (const k of KINDS) expect(clinic.forms[k], `form for ${k}`);
const seenKinds = new Set<string>();
for (const k of KINDS) {
  const spec = specOf(k);
  expect(spec.kind === k, `form ${k} has kind ${k}`);
  const keys = fieldsOf(spec).map((f) => f.key);
  expect(new Set(keys).size === keys.length, `form ${k}: field keys are unique`);
  for (const f of fieldsOf(spec)) {
    seenKinds.add(f.kind);
    if (f.kind === "select" || f.kind === "checks") expect(f.options && f.options.length > 1, `form ${k}.${f.key}: options listed`);
  }
}
for (const fk of ["text", "textarea", "date", "select", "checks", "yesno"]) expect(seenKinds.has(fk), `a ${fk} field is used somewhere`);
const cans = specOf("assessment");
expect(CANS_RATING_KEYS.length === 12, "twelve CANS rating items");
for (const k of CANS_RATING_KEYS) {
  const f = fieldByKey(cans, k);
  expect(f && f.kind === "select" && f.lock === true, `CANS ${k} is a locked dropdown`);
  expect(f?.options?.join("|") === ["0 – No evidence", "1 – Watchful waiting", "2 – Action needed", "3 – Immediate or intensive action"].join("|"), `CANS ${k} options`);
}
for (const k of ["sig"]) expect(fieldByKey(specOf("admission"), k)?.lock && fieldByKey(specOf("intake"), k)?.lock, `${k} is locked in admission and intake`);
for (const k of ["dx", "loc"]) expect(fieldByKey(specOf("intake"), k)?.lock, `intake ${k} is locked`);
expect(fieldByKey(specOf("sra"), "dx")?.lock, "sra dx is locked");
expect(fieldByKey(specOf("admission"), "trauma")?.kind === "textarea" && fieldByKey(specOf("admission"), "risk")?.kind === "checks", "admission trauma and risk fields");

section("Documents");
const wanted = ["dpn-4471", "dpn-4458", "adm-4492", "intake-4492", "cans-4492", "sra-4471"];
expect(clinic.docs.length === wanted.length && wanted.every((id) => clinic.docs.some((d) => d.id === id)), "the six required documents, and no others");
for (const d of clinic.docs) {
  const spec = specOf(d.kind);
  expect(consumerOf(d.consumerId), `${d.id}: consumer exists`);
  expect(consumerOf(d.consumerId)?.docs.includes(d.id), `${d.id}: listed on its consumer`);
  for (const [k, v] of Object.entries(d.values)) {
    const f = fieldByKey(spec, k);
    if (!f) { fail(`${d.id}: seed key "${k}" is not in the ${d.kind} form`); continue; }
    const bad = validValue(f, v);
    if (bad) fail(`${d.id}.${k}: ${bad}`);
  }
  for (const k of d.prefilled ?? []) expect(k in d.values && !isEmpty(d.values[k]), `${d.id}: prefilled key "${k}" has a value`);
}
expect(seedOf("dpn-4471").consumerId === "4471" && seedOf("dpn-4471").date === "2026-10-29", "dpn-4471 is M.R., today");
expect(Object.keys(seedOf("dpn-4471").values).sort().join() === "date,service" && (seedOf("dpn-4471").prefilled ?? []).join() === "date,service", "dpn-4471 is nearly empty: date and service prefilled");
expect(seedOf("dpn-4458").status === "draft" && /R\. Diaz/.test(seedOf("dpn-4458").author ?? "") && /10\/28\/2026/.test(seedOf("dpn-4458").author ?? ""), "dpn-4458: saved by someone else on 10/28, status draft");
expect(seedOf("adm-4492").consumerId === "4492" && seedOf("intake-4492").consumerId === "4492" && seedOf("cans-4492").consumerId === "4492", "T.W. has three documents");
expect(seedOf("sra-4471").consumerId === "4471", "sra-4471 is M.R.");
for (const k of CANS_RATING_KEYS) expect((seedOf("cans-4492").prefilled ?? []).includes(k), `cans ${k} is prefilled green`);
expect(isEmpty(seedOf("cans-4492").values.n_life) && isEmpty(seedOf("cans-4492").values.n_risk), "CANS narratives start empty");
expect(isEmpty(seedOf("sra-4471").values.household), "household decision starts blank (never preselected)");

section("Scribe scenarios");
for (const sc of clinic.scribe) {
  const seed = clinic.docs.find((d) => d.id === sc.docId);
  if (!seed) { fail(`scenario for unknown document ${sc.docId}`); continue; }
  const spec = specOf(seed.kind);
  const consumer = consumerOf(seed.consumerId)!;
  expect(sc.lines.length >= 8, `${sc.docId}: has a real conversation (${sc.lines.length} lines)`);
  expect(sc.mode === "dictation" || !!sc.consentScript, `${sc.docId}: live mode has a consent script`);
  expect(/^\d+(:\d\d){1,2}$/.test(sc.length), `${sc.docId}: length looks like a clock`);
  sc.lines.forEach((l, i) => expect(/^\d+(:\d\d){1,2}$/.test(l.t) && l.who && l.text, `${sc.docId}: line ${i} is complete`));
  for (const id of sc.context) expect(consumer.chart.some((r) => r.id === id), `${sc.docId}: context record "${id}" exists`);
  for (const [k, d] of Object.entries(sc.draft)) {
    const f = fieldByKey(spec, k);
    if (!f) { fail(`${sc.docId}: draft key "${k}" is not in the form`); continue; }
    expect(!f.lock, `${sc.docId}.${k}: a locked field is never drafted`);
    const bad = validValue(f, d.value);
    if (bad) fail(`${sc.docId}.${k}: ${bad}`);
    if (d.from === "session") {
      expect(d.lines && d.lines.length > 0 && d.lines.every((i) => Number.isInteger(i) && i >= 0 && i < sc.lines.length), `${sc.docId}.${k}: session lines are in range`);
      expect(!isEmpty(d.value), `${sc.docId}.${k}: a session draft has a value`);
    } else if (d.from === "chart") {
      const rec = consumer.chart.find((r) => r.id === d.chart);
      expect(rec, `${sc.docId}.${k}: chart record "${d.chart}" exists`);
      expect(rec && typeof d.value === "string" && rec.text.includes(d.value), `${sc.docId}.${k}: the chart draft is a quotation of "${d.chart}"`);
    } else expect(isEmpty(d.value), `${sc.docId}.${k}: a "none" draft is empty`);
  }
}
const scribeOf = (id: string): ScribeScenario => clinic.scribe.find((s) => s.docId === id)!;
expect(scribeOf("dpn-4471").mode === "live" && scribeOf("dpn-4471").lines.length >= 10 && scribeOf("dpn-4471").lines.length <= 14, "dpn-4471: live, 10 to 14 lines");
expect(scribeOf("adm-4492").mode === "live" && scribeOf("intake-4492").mode === "live" && scribeOf("cans-4492").mode === "live", "T.W. scenarios are live");
expect(scribeOf("sra-4471").mode === "dictation" && scribeOf("sra-4471").lines.length >= 6 && scribeOf("sra-4471").lines.length <= 10, "sra-4471: dictation, about 8 lines");
expect(scribeOf("dpn-4471").draft.needs?.from === "none", "dpn-4471: needs is from none");
expect(scribeOf("dpn-4471").draft.goal?.from === "chart" && scribeOf("dpn-4471").draft.ints?.from === "session", "dpn-4471: goal from the chart, interventions from the session");
expect(scribeOf("adm-4492").draft.trauma?.from === "none", "adm-4492: trauma is from none");
expect(Object.keys(scribeOf("cans-4492").draft).every((k) => k.startsWith("n_")), "cans-4492: only narrative boxes are drafted");
expect(scribeOf("sra-4471").draft.discharge?.from === "none" && Object.keys(scribeOf("sra-4471").draft).sort().join() === "discharge,family,g1_lack,g1_progress", "sra-4471: fills g1_progress, g1_lack, family; discharge is none");

/* ====================================================================================================
   2. Checks
   ==================================================================================================== */
section("Checks");
const MODULES = ["Golden thread", "Wording", "Billing", "Medical necessity", "Completeness", "Consistency"];
expect(clinic.checks.length >= 24, `at least 24 checks (${clinic.checks.length})`);
expect(new Set(clinic.checks.map((c) => c.id)).size === clinic.checks.length, "check ids are unique");
for (const m of MODULES) expect(clinic.checks.some((c) => c.module === m), `module "${m}" has checks`);
for (const c of clinic.checks) expect(MODULES.includes(c.module), `check ${c.id} is in a known module (${c.module})`);
for (const k of KINDS) expect(checksFor(clinic, k).length >= 4, `at least four checks for ${k} (${checksFor(clinic, k).length})`);
console.log(`  ${clinic.checks.length} checks · ${KINDS.map((k) => `${k} ${checksFor(clinic, k).length}`).join(" · ")}`);
console.log("  modules: " + MODULES.map((m) => `${m} ${clinic.checks.filter((c) => c.module === m).length}`).join(" · "));

/* ====================================================================================================
   3. Every document: run the checks, verify the rules every fix obeys, simulate every fix
   ==================================================================================================== */
const FORBIDDEN = /\bI\b|\b[Ww]e\b|\b[Mm]y\b|\b[Oo]ur\b/;
const digitsOf = (s: string): string[] => (s.match(/\d[\d:./–-]*/g) ?? []).map((t) => t.replace(/[.:/–-]+$/, ""));

function verifyFindings(label: string, docId: string, values: Record<string, Val>): Finding[] {
  const seed = seedOf(docId);
  const spec = specOf(seed.kind);
  const consumer = consumerOf(seed.consumerId)!;
  const found = scan(docId, values);
  console.log(`  ${label}: ${tally(found)}`);
  for (const f of found) console.log(`      ${brief(f)}`);
  expect(new Set(found.map((f) => f.id)).size === found.length, `${label}: finding ids are unique`);
  const corpus = consumer.chart.map((r) => r.text).join(" ") + " " + Object.values(values).map(asText).join(" ");
  for (const f of found) {
    const where = `${label} · ${f.checkId} → ${f.fieldKey}`;
    const field = fieldByKey(spec, f.fieldKey);
    expect(field, `${where}: field exists in the form`);
    if (!field) continue;
    expect(f.title && f.why && f.rule, `${where}: title, why and rule are written`);
    for (const [name, s] of [["title", f.title], ["why", f.why], ["rule", f.rule]] as const) expect(!FORBIDDEN.test(s), `${where}: ${name} has no "I" or "we": ${s}`);
    expect(!/ASAM|\bIOP\b/.test(`${f.title} ${f.why} ${f.rule}`), `${where}: no ASAM or IOP`);
    const fix = f.fix;
    if (!fix) {
      if (field.lock) continue;
      continue;
    }
    if (field.lock) fail(`${where}: Psyflo may not type into a locked field`);
    if (fix.kind === "text") {
      const recs = consumer.chart.filter((r) => r.text.includes(fix.text));
      expect(recs.length > 0, `${where}: text fix is not a verbatim part of any chart record: "${fix.text}"`);
      expect(recs.some((r) => r.label === fix.source), `${where}: text fix source "${fix.source}" is not the label of the record it quotes`);
      expect(!FORBIDDEN.test(fix.text), `${where}: text fix has "I" or "we": ${fix.text}`);
    } else if (fix.kind === "ask") {
      expect(!FORBIDDEN.test(fix.prompt), `${where}: prompt has "I" or "we"`);
      expect(!FORBIDDEN.test(fix.frame(MARK).replace(MARK, "")), `${where}: frame has "I" or "we"`);
      expect(fix.frame(MARK).includes(MARK), `${where}: frame keeps the clinician's words`);
      if (fix.source) expect(consumer.chart.some((r) => r.label === fix.source), `${where}: ask source "${fix.source}" is a chart record`);
    } else {
      expect(fix.options.length >= 2 || field.kind === "checks", `${where}: choose offers options`);
      expect(new Set(fix.options).size === fix.options.length, `${where}: options are unique`);
      expect(!FORBIDDEN.test(fix.prompt), `${where}: prompt has "I" or "we"`);
      if (fix.source) expect(consumer.chart.some((r) => r.label === fix.source), `${where}: choose source "${fix.source}" is a chart record`);
      for (const o of fix.options) {
        if (field.kind === "select" || field.kind === "checks") expect(field.options?.includes(o), `${where}: option "${o}" is not an option of the field`);
        if (field.kind === "yesno") expect(o === "Yes" || o === "No", `${where}: yes/no option "${o}"`);
        expect(!FORBIDDEN.test(o), `${where}: option has "I" or "we": ${o}`);
      }
      expect(isEmpty(values[f.fieldKey]) || field.kind !== "select" || !fix.options.includes(asText(values[f.fieldKey])), `${where}: a choose fix never preselects`);
    }
    /* no fact the chart and the clinician did not give: every number it types is already in the chart or in the document */
    /* (the options of a dropdown, tick list or Yes/No are Lauris's own labels, such as "QMHP 1.3 Psychoeducation": they are not facts) */
    const ehrOptions = fix.kind === "choose" && (field.kind === "select" || field.kind === "checks" || field.kind === "yesno");
    if (!ehrOptions) for (const t of typedByPsyflo(f)) for (const tok of digitsOf(t)) expect(corpus.includes(tok), `${where}: "${tok}" in "${t.slice(0, 60)}…" is not in the chart or the document`);
    /* after the fix is typed, the same finding does not come back */
    const next = applyFix(values, f, spec);
    if (!next) { fail(`${where}: could not simulate the fix`); continue; }
    const after = scan(docId, next);
    expect(!after.some((x) => x.checkId === f.checkId && x.fieldKey === f.fieldKey), `${where}: the finding came back after the fix`);
    expect(after.length <= found.length, `${where}: the fix produced new findings (${found.length} → ${after.length})`);
    /* every option of a choose that is about this finding should clear it, except boxes that add to a list */
    if (fix.kind === "choose" && field.kind !== "checks") for (const o of fix.options) {
      const v2 = { ...values, [f.fieldKey]: writeInto(field, values[f.fieldKey], o, "replace").value };
      expect(!scan(docId, v2).some((x) => x.checkId === f.checkId && x.fieldKey === f.fieldKey), `${where}: option "${o.slice(0, 50)}" does not clear the finding`);
    }
  }
  /* "Fix everything": apply the fixes one at a time; only findings with fix: null may remain */
  let cur = { ...values };
  for (let i = 0; i < 40; i++) {
    const open = scan(docId, cur).find((f) => f.fix);
    if (!open) break;
    const next = applyFix(cur, open, spec);
    if (!next) break;
    cur = next;
    if (i === 39) fail(`${label}: fixes keep producing findings`);
  }
  const rest = scan(docId, cur);
  expect(rest.every((f) => !f.fix), `${label}: after every fix is typed, findings with a fix remain: ${rest.filter((f) => f.fix).map((f) => f.checkId).join(", ")}`);
  console.log(`      after every fix is typed: ${rest.length} left, all for the clinician (${rest.map((f) => f.checkId).join(", ") || "none"})`);
  return found;
}

section("Findings on every document, as Lauris has it when the demo opens");
const seedFindings: Record<string, Finding[]> = {};
for (const d of clinic.docs) seedFindings[d.id] = verifyFindings(`${d.id} (seed)`, d.id, d.values);

section("Findings after the Scribe has typed its draft");
const typed: Record<string, Record<string, Val>> = {};
const typedFindings: Record<string, Finding[]> = {};
for (const d of clinic.docs) {
  if (!clinic.scribe.some((s) => s.docId === d.id)) continue;
  typed[d.id] = applyScribe(d.id);
  typedFindings[d.id] = verifyFindings(`${d.id} (after Scribe)`, d.id, typed[d.id]);
}

/* ====================================================================================================
   4. The findings each document is built to show
   ==================================================================================================== */
section("Required findings");
const has = (fs: Finding[], checkId: string) => fs.find((f) => f.checkId === checkId);

/* dpn-4471: after the Scribe, "needs" is the only thing left */
{
  const fs = typedFindings["dpn-4471"];
  expect(fs.length === 1 && fs[0].fieldKey === "needs" && fs[0].checkId === "dpn-needs", `dpn-4471 after Scribe: only "needs" is left (got ${fs.map((f) => f.fieldKey).join(", ") || "nothing"})`);
  expect(fs[0]?.fix?.kind === "ask", "dpn-4471: the needs fix asks the clinician");
  const v = typed["dpn-4471"];
  expect(asText(v.goal).startsWith("Obj. 1"), "dpn-4471: the goal names Objective 1");
  expect(Array.isArray(v.ints) && v.ints.length === 2, "dpn-4471: two interventions ticked");
  expect(!/observed/i.test(Object.values(v).map(asText).join(" ")), "dpn-4471: no 'observed' anywhere");
  console.log("  dpn-4471: only needs is left after the Scribe");
}

/* dpn-4458: the Scan & Enhance document */
{
  const fs = seedFindings["dpn-4458"];
  expect(fs.length >= 5, `dpn-4458: at least 5 findings (${fs.length})`);
  const obs = has(fs, "dpn-observed");
  expect(obs && obs.severity === "severe" && obs.fix?.kind === "ask", "dpn-4458: a severe 'Observed' finding");
  expect(has(fs, "dpn-duration"), "dpn-4458: a duration finding");
  const goal = has(fs, "dpn-goal-link");
  expect(goal && goal.fix?.kind === "text" && goal.fix.source === "ISP 2.0 · Goal 1" && goal.fix.text.startsWith("Obj. 1"), "dpn-4458: a goal-link finding with a text fix quoting the ISP goal record");
  expect(fs.some((f) => f.fix?.kind === "ask"), "dpn-4458: at least one ask fix");
  expect(fs.some((f) => f.fix?.kind === "choose"), "dpn-4458: at least one choose fix");
  expect(fs.some((f) => f.severity === "low"), "dpn-4458: at least one low finding");
  const passed = checksFor(clinic, "dpn").filter((c) => !fs.some((f) => f.checkId === c.id));
  expect(passed.length >= 2, `dpn-4458: at least two DPN checks pass (${passed.length})`);
  console.log(`  dpn-4458: ${fs.length} findings; ${passed.length} of ${checksFor(clinic, "dpn").length} DPN checks pass (${passed.map((c) => c.id).join(", ")})`);
}

/* adm-4492 */
{
  const fs = typedFindings["adm-4492"];
  const tr = has(fs, "adm-trauma");
  expect(tr && tr.severity === "severe" && tr.fix?.kind === "ask", "adm-4492: trauma blank is severe with an ask fix");
  expect(isEmpty(typed["adm-4492"].trauma), "adm-4492: the Scribe left trauma empty");
  const el = has(fs, "risk-leaving-building");
  expect(el && el.severity === "medium" && el.fix?.kind === "choose" && el.fix.options[0] === ELOPE, "adm-4492: elopement mentioned but not ticked (medium, choose)");
  expect(LEAVE_RE.test(asText(typed["adm-4492"].concerns)) && !(typed["adm-4492"].risk as string[]).includes(ELOPE), "adm-4492: the text mentions leaving the building and the box is not ticked");
  expect(has(fs, "adm-concerns-counts")?.fix?.kind === "text", "adm-4492: the counts come from the school referral");
  expect(has(fs, "adm-safety-plan")?.fix?.kind === "choose", "adm-4492: safety plan decision (choose)");
  expect(has(fs, "signature-signed") && has(fs, "signature-signed")!.fix === null, "adm-4492: the signature is flagged and left to the clinician");
  expect(fs.length >= 5, `adm-4492: at least 5 findings after the Scribe (${fs.length})`);
}

/* intake-4492 */
{
  const fs = typedFindings["intake-4492"];
  const pr = has(fs, "intake-prior-outcome");
  expect(pr && pr.severity === "severe" && pr.fix?.kind === "choose" && pr.fix.options.length === 3, "intake-4492: prior-service outcome unstated (severe, choose with three options)");
  expect(pr?.fix?.kind === "choose" && pr.fix.options.join("|") === PRIOR_OPTIONS.join("|"), "intake-4492: the three options are the original ones");
  const st = has(fs, "intake-strengths");
  expect(st && st.severity === "low" && st.fix?.kind === "ask", "intake-4492: strengths empty (low, ask)");
  expect(has(fs, "intake-abs")?.fix?.kind === "text" && has(fs, "intake-classes")?.fix?.kind === "text", "intake-4492: school-functioning gaps with quotes from the school record");
  expect(has(fs, "risk-leaving-building")?.fix?.kind === "choose", "intake-4492: leaving the building not ticked in the risk box");
  expect(has(fs, "intake-summary")?.fix === null && has(fs, "intake-loc")?.fix === null, "intake-4492: summary and level of care are the clinician's");
  expect(!has(fs, "intake-dx"), "intake-4492: the diagnosis check passes (the clinician chose it)");
  expect(typed["intake-4492"].dx === seedOf("intake-4492").values.dx, "intake-4492: the Scribe never touches the diagnosis");
}

/* cans-4492 */
{
  const fs = typedFindings["cans-4492"];
  const n2 = has(fs, "cans-narrative-2plus");
  expect(n2 && n2.severity === "medium" && n2.fix?.kind === "ask", "cans-4492: a rating of 2 or 3 with no narrative (medium, ask)");
  const el = has(fs, "cans-elopement-rating");
  expect(el && el.severity === "severe" && el.fix === null && el.fieldKey === "r_runaway", "cans-4492: narrative mentions leaving the building while Runaway/Elopement is 0 (severe, fix null)");
  for (const k of CANS_RATING_KEYS) expect(asText(typed["cans-4492"][k]) === asText(seedOf("cans-4492").values[k]), `cans-4492: the Scribe left rating ${k} alone`);
  expect(!has(seedFindings["cans-4492"], "cans-elopement-rating"), "cans-4492: with empty narratives the elopement check has nothing to compare");
  expect(has(seedFindings["cans-4492"], "cans-narrative-2plus"), "cans-4492 (seed): narratives are empty while ratings are 2 or 3");
}

/* sra-4471 */
{
  for (const [label, fs] of [["seed", seedFindings["sra-4471"]], ["after dictation", typedFindings["sra-4471"]]] as const) {
    expect(fs.length >= 5, `sra-4471 (${label}): at least 5 findings (${fs.length})`);
    const lack = has(fs, "sra-lack");
    expect(lack && lack.severity === "severe" && lack.fix?.kind === "text", `sra-4471 (${label}): lack of progress (severe, text fix from the chart)`);
    const prog = has(fs, "sra-progress-counts");
    expect(prog && prog.severity === "medium" && prog.fix?.kind === "text", `sra-4471 (${label}): progress not measured (medium, text fix with the notes' counts)`);
    expect(has(fs, "sra-stepdown")?.fix?.kind === "ask", `sra-4471 (${label}): no step-down criteria (ask)`);
    const hh = has(fs, "sra-household");
    expect(hh && hh.fix?.kind === "choose" && hh.fix.options.includes(HOUSEHOLD_INCLUDE), `sra-4471 (${label}): household detail needs a decision (choose)`);
    expect(has(fs, "sra-observed-note")?.fix?.kind === "ask", `sra-4471 (${label}): the Oct 14 'Observed' note`);
  }
  const afterD = typedFindings["sra-4471"];
  const isp = has(afterD, "sra-isp-change-date");
  expect(isp && isp.fix?.kind === "ask" && isp.fieldKey === "g1_lack", "sra-4471 (after dictation): undated ISP change (ask for the date)");
  expect(has(seedFindings["sra-4471"], "sra-avg")?.fix?.kind === "text", "sra-4471: the average units per week comes from the direct-hours log");
  expect(has(afterD, "sra-family")?.fix?.kind === "text", "sra-4471 (after dictation): family involvement quotes the weekly-calls record");
  expect(isEmpty(typed["sra-4471"].household), "sra-4471: the household decision is still blank after the dictation");
}

/* ====================================================================================================
   5. History, wording
   ==================================================================================================== */
section("History, wording");
expect(clinic.history.length >= 10, `at least 10 history items (${clinic.history.length})`);
expect(new Set(clinic.history.map((h) => h.id)).size === clinic.history.length, "history ids are unique");
for (const h of clinic.history) {
  expect(h.date >= "2026-10-20" && h.date <= "2026-10-28", `history ${h.id}: date ${h.date} is in 10/20 to 10/28`);
  expect(h.consumerId === "" || consumerOf(h.consumerId), `history ${h.id}: consumer exists (or no patient assigned)`);
  if (h.docId) expect(clinic.docs.some((d) => d.id === h.docId && d.consumerId === h.consumerId && d.kind === h.doc), `history ${h.id}: docId matches a document of that consumer and kind`);
}
expect(clinic.history.filter((h) => h.docId).length >= 1 && clinic.history.filter((h) => !h.docId).length > clinic.history.filter((h) => h.docId).length, "some history items point at documents, most do not");
expect(new Set(clinic.history.map((h) => h.consumerId)).size >= 5, "history spans several consumers");
expect(clinic.history.some((h) => /^Scanned: \d+ open$/.test(h.status)) && clinic.history.some((h) => /Saved in Lauris with \d+ open alert/.test(h.status)) && clinic.history.some((h) => h.status === "Typed into Lauris and saved"), "history statuses read like the product");

/* the original TDT content only: no IEP/IOP/ASAM wording anywhere; initials only */
const dump = JSON.stringify(clinic, (_k, v) => (typeof v === "function" ? undefined : v));
expect(!/ASAM/i.test(dump), "no ASAM anywhere");
expect(!/\bIOP\b|intensive outpatient/i.test(dump), "no IOP wording anywhere");
const sourceOfCheck = clinic.checks.map((c) => `${c.id} ${c.title} ${c.module}`).join(" ");
expect(!/ASAM|\bIOP\b/.test(sourceOfCheck), "no ASAM or IOP in the checks");
const bareNames = dump.match(/\b(?:Mr|Mrs|Ms|Dr)\.\s+[A-Z][a-z]+/g);
expect(!bareNames, `no named people beyond staff: ${bareNames?.join(", ")}`);

/* ====================================================================================================
   Summary
   ==================================================================================================== */
section("Summary");
console.log(`  documents: ${clinic.docs.length} · consumers: ${clinic.consumers.length} · chart records: ${clinic.consumers.reduce((n, c) => n + c.chart.length, 0)} · scenarios: ${clinic.scribe.length}`);
console.log(`  checks: ${clinic.checks.length} · history: ${clinic.history.length}`);
for (const d of clinic.docs) console.log(`  ${d.id.padEnd(12)} seed ${tally(seedFindings[d.id])}${typedFindings[d.id] ? `  |  after Scribe ${tally(typedFindings[d.id])}` : ""}`);
if (failed) {
  console.error(`\n${failed} check${failed === 1 ? "" : "s"} FAILED`);
  process.exit(1);
}
console.log("\nAll selftest checks passed.");
