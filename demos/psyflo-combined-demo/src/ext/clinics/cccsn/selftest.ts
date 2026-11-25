/* Self-test for the CCCSN content. Run with:  bun src/clinics/cccsn/selftest.ts
   Exits non-zero on any failure. It checks the structure of the config, every seed and Scribe scenario, runs the audit checks on each document before and
   after Scribe, simulates every proposed fix the way the store applies it, and probes the checks the demo documents do not reach. */
import { asText, fieldByKey, fieldsOf, findingSig, isEmpty, runChecks, usDate, writeInto } from "../../engine";
import type { ClinicConfig, DocKind, DocSeed, Finding, FieldSpec, Severity, Val } from "../../types";
import { cccsn } from "./index";
import { REQUESTS, SUBSTANCES } from "./forms";

const clinic: ClinicConfig = cccsn;
const errors: string[] = [];
const warnings: string[] = [];
const fail = (m: string) => errors.push(m);
const check = (cond: unknown, m: string) => { if (!cond) fail(m); };
const fired = new Set<string>();

const SAMPLE = "Sample answer in the clinician's own words.";
const REQUIRED_MODULES = ["Golden thread", "Wording", "Billing", "Medical necessity", "Completeness", "Consistency", "ASAM dimensions"];
const ASAM_REF = "The ASAM Criteria, 3rd edition (2013)";
const wordsIorWe = (s: string): boolean => /\b(I|we)\b/i.test(s);
const sevCounts = (fs: Finding[]): string => (["severe", "medium", "low"] as Severity[]).map((s) => `${fs.filter((f) => f.severity === s).length} ${s}`).join(", ");

/* ------------------------------ structure ------------------------------ */

const unique = (label: string, xs: string[]) => {
  const seen = new Set<string>();
  for (const x of xs) { if (seen.has(x)) fail(`${label}: duplicate "${x}"`); seen.add(x); }
};

const validVal = (f: FieldSpec, v: Val): boolean => {
  if (f.kind === "checks") return Array.isArray(v) && v.every((x) => (f.options ?? []).includes(x));
  if (Array.isArray(v)) return false;
  if (f.kind === "select") return v === "" || (f.options ?? []).includes(v);
  if (f.kind === "yesno") return v === "" || v === "Yes" || v === "No";
  if (f.kind === "date") return v === "" || /^\d\d\/\d\d\/\d{4}$/.test(v);
  return true;
};

function structure() {
  check(clinic.id === "cccsn", "id must be cccsn");
  const p = clinic.profile;
  check(p.name === "Community Counseling Center of Southern Nevada", "profile name");
  check(p.sub === "Substance use treatment · ASAM Levels 1 and 2.1 · Nevada", "profile sub");
  check(p.short === "CCCSN", "profile short");
  check(p.checks.pauseAt === "severe" && p.checks.onSave === true, "profile checks defaults");
  check(p.programs.some((x) => x.name === "IOP 2.1") && p.programs.some((x) => x.name === "Outpatient 1"), "programs IOP 2.1 and Outpatient 1");
  check(p.payers.length === 6, "six payers");
  for (const pay of p.payers) check(/sample/i.test(pay.criteria) && pay.criteria.length > 40, `payer ${pay.id}: criteria must say sample`);
  check(p.accreditations.length >= 2 && p.accreditations.every((a) => a.endsWith("(to confirm with the clinic)")), "accreditations end with (to confirm with the clinic)");
  check(p.verbiage.length >= 5, "wording rules");
  for (const k of Object.keys(clinic.forms) as DocKind[]) check(p.documentRules.some((r) => r.doc === k), `documentRule for ${k}`);
  unique("payer ids", p.payers.map((x) => x.id));

  const kinds = new Set<string>();
  for (const [k, spec] of Object.entries(clinic.forms)) {
    check(spec.kind === k, `form ${k}: kind mismatch`);
    const fields = fieldsOf(spec);
    unique(`form ${k} field keys`, fields.map((f) => f.key));
    for (const f of fields) {
      kinds.add(f.kind);
      if (f.kind === "select" || f.kind === "checks") check((f.options ?? []).length > 1, `form ${k}.${f.key}: options missing`);
      else check(!f.options, `form ${k}.${f.key}: ${f.kind} should not have options`);
      if (f.options) unique(`form ${k}.${f.key} options`, f.options);
    }
  }
  check(kinds.size === 6, `field kinds covered: ${[...kinds].join(", ")} (need all six)`);
  check(!!clinic.forms.dpn && !!clinic.forms.admission && !!clinic.forms.assessment && !!clinic.forms.sra, "forms for dpn, admission, assessment, sra");

  unique("consumer ids", clinic.consumers.map((c) => c.id));
  check(clinic.consumers.length >= 6, "about six consumers");
  for (const c of clinic.consumers) {
    check(/^[A-Z]\.[A-Z]\.$/.test(c.ini), `${c.id}: initials only`);
    check(c.age >= 18, `${c.id}: adult`);
    check(c.program === "IOP 2.1" || c.program === "Outpatient 1", `${c.id}: program`);
    check(c.site === "Las Vegas", `${c.id}: site`);
    check(p.payers.some((x) => x.id === c.payer), `${c.id}: payer ${c.payer}`);
    unique(`${c.id} chart ids`, c.chart.map((r) => r.id));
    for (const d of c.docs) {
      const seed = clinic.docs.find((x) => x.id === d);
      check(seed && seed.consumerId === c.id, `${c.id}: doc ${d} is not this consumer's`);
    }
    // the authorization record agrees with the roster line
    const auth = c.chart.find((r) => r.kind === "auth" && r.id === "auth");
    if (c.units && auth) {
      const left = /(\d+) units left/.exec(auth.text);
      check(left && Number(left[1]) === c.units.left, `${c.id}: authorization record says ${left?.[1]} units left, roster says ${c.units.left}`);
      const m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(c.units.ends);
      const mon = m ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[1] - 1] : "";
      check(m && auth.text.includes(`${mon} ${+m[2]}`), `${c.id}: authorization record does not mention the end date ${c.units.ends}`);
    }
    if (!c.units && c.docs.length) {
      check(auth && /No .* authorization|none on file|No authorization/i.test(auth.text + auth.label) || c.id === "c102", `${c.id}: no units, so the chart should say so`);
    }
  }
  const seedIds = clinic.docs.map((d) => d.id);
  unique("doc ids", seedIds);
  for (const id of ["dpn-c101", "adm-c102", "asam-c102", "sra-c101", "dpn-c103"]) check(seedIds.includes(id), `required doc ${id}`);
  for (const d of clinic.docs) {
    const c = clinic.consumers.find((x) => x.id === d.consumerId);
    check(c && c.docs.includes(d.id), `${d.id}: not listed on consumer ${d.consumerId}`);
  }
  unique("check ids", clinic.checks.map((c) => c.id));
  check(clinic.checks.length >= 14, `at least 14 checks (have ${clinic.checks.length})`);
  const mods = new Set(clinic.checks.map((c) => c.module));
  for (const m of REQUIRED_MODULES) check(mods.has(m), `module ${m} has no check`);
  for (const c of clinic.checks) for (const k of c.docs) check(!!clinic.forms[k], `check ${c.id}: no form for ${k}`);
  unique("history ids", clinic.history.map((h) => h.id));
  check(clinic.today === "2026-10-29", "today");
}

function hygiene() {
  const text = JSON.stringify(clinic, (_k, v) => (typeof v === "function" ? undefined : v));
  for (const name of ["Travis", "Maria", "Darnell", "Kevin", "Tanya", "Eric", "Jasmine", "Luis", "Paula"]) check(!new RegExp(`\\b${name}\\b`).test(text), `a full first name appears in the content: ${name}`);
  for (const w of ["school", "student", "teacher", "guardian", "parent", "IEP", "recess", "classroom", "adolescent", "Com Hab", "NYC", "Brooklyn", "Rockland", "eMedNY", "OMH", "DMAS", "Virginia", "TDT", "Harvest", "Lauris Online"]) {
    check(!new RegExp(`\\b${w}\\b`, "i").test(text), `leftover word from another clinic: ${w}`);
  }
}

/* ------------------------------ seeds and Scribe ------------------------------ */

function seeds() {
  for (const d of clinic.docs) {
    const spec = clinic.forms[d.kind];
    if (!spec) { fail(`${d.id}: no form for ${d.kind}`); continue; }
    for (const [k, v] of Object.entries(d.values)) {
      const f = fieldByKey(spec, k);
      if (!f) { fail(`${d.id}: seed key "${k}" is not in the form`); continue; }
      check(validVal(f, v), `${d.id}.${k}: value is not valid for a ${f.kind}${f.options ? ` (options: ${f.options.join(" | ")})` : ""}`);
    }
    for (const k of d.prefilled ?? []) check(k in d.values, `${d.id}: prefilled key "${k}" has no value`);
    if (d.values.date) check(d.values.date === usDate(d.date), `${d.id}: form date ${d.values.date} differs from document date ${d.date}`);
  }
  const lineRange: Record<string, [number, number]> = { "dpn-c101": [10, 14], "adm-c102": [12, 16], "asam-c102": [10, 14], "sra-c101": [6, 10] };
  for (const sc of clinic.scribe) {
    const seed = clinic.docs.find((x) => x.id === sc.docId);
    const spec = seed ? clinic.forms[seed.kind] : undefined;
    const consumer = seed ? clinic.consumers.find((c) => c.id === seed.consumerId) : undefined;
    if (!seed || !spec || !consumer) { fail(`scribe ${sc.docId}: no document`); continue; }
    const [lo, hi] = lineRange[sc.docId] ?? [1, 99];
    check(sc.lines.length >= lo && sc.lines.length <= hi, `scribe ${sc.docId}: ${sc.lines.length} lines (expected ${lo}-${hi})`);
    if (sc.mode === "live") check(!!sc.consentScript, `scribe ${sc.docId}: live needs a consent script`);
    for (const id of sc.context) check(!!consumer.chart.find((r) => r.id === id), `scribe ${sc.docId}: context record ${id} not in the chart`);
    let none = 0;
    for (const [k, d] of Object.entries(sc.draft)) {
      const f = fieldByKey(spec, k);
      if (!f) { fail(`scribe ${sc.docId}: draft key "${k}" is not in the form`); continue; }
      check(!f.lock, `scribe ${sc.docId}: draft key "${k}" is locked`);
      check(validVal(f, d.value), `scribe ${sc.docId}.${k}: value is not valid for a ${f.kind}`);
      if (d.from === "none") { none++; check(isEmpty(d.value), `scribe ${sc.docId}.${k}: a none draft must be empty`); }
      if (d.from === "session") {
        check(!isEmpty(d.value) && !!d.lines?.length, `scribe ${sc.docId}.${k}: a session draft needs a value and lines`);
        for (const i of d.lines ?? []) check(Number.isInteger(i) && i >= 0 && i < sc.lines.length, `scribe ${sc.docId}.${k}: line ${i} does not exist`);
      }
      if (d.from === "chart") {
        const rec = d.chart ? consumer.chart.find((r) => r.id === d.chart) : undefined;
        check(!!rec, `scribe ${sc.docId}.${k}: chart record ${d.chart} not found`);
        if (rec && typeof d.value === "string") check(rec.text.includes(d.value), `scribe ${sc.docId}.${k}: chart value is not a quotation of ${rec.label}`);
      }
    }
    if (sc.docId === "dpn-c101") check(none === 1 && sc.draft.plan?.from === "none", "dpn-c101: exactly one none field, plan");
    if (sc.docId === "adm-c102") check(none === 1 && sc.draft.hiv?.from === "none", "adm-c102: exactly one none field, hiv");
    if (sc.docId === "asam-c102") check(Object.keys(sc.draft).every((k) => /^d[1-6]n$/.test(k)), "asam-c102: Scribe fills only rationale boxes");
    if (sc.docId === "sra-c101") check(sc.mode === "dictation", "sra-c101: dictation");
  }
  for (const id of ["dpn-c101", "adm-c102", "asam-c102"]) check(clinic.scribe.find((s) => s.docId === id)?.mode === "live", `${id}: live`);
}

/** What the document holds after the person types the Scribe draft into Lauris (the store appends, and skips locked, empty and none cards). */
function scribed(seed: DocSeed): Record<string, Val> {
  const sc = clinic.scribe.find((s) => s.docId === seed.id);
  const spec = clinic.forms[seed.kind];
  const values: Record<string, Val> = { ...seed.values };
  if (!sc || !spec) return values;
  for (const f of fieldsOf(spec)) {
    const d = sc.draft[f.key];
    if (f.lock || !d || d.from === "none" || isEmpty(d.value)) continue;
    const cur = values[f.key];
    if (!isEmpty(cur) && asText(cur).trim() === asText(d.value).trim()) continue;
    values[f.key] = writeInto(f, cur, d.value, "append").value;
  }
  return values;
}

/* ------------------------------ findings and fixes ------------------------------ */

const run = (c: ClinicConfig, seed: DocSeed, values: Record<string, Val>): Finding[] => {
  const fs = runChecks(c, seed.id, seed.kind, values, seed.consumerId);
  for (const f of fs) fired.add(f.checkId);
  return fs;
};

function applyFix(c: ClinicConfig, seed: DocSeed, values: Record<string, Val>, f: Finding): Record<string, Val> {
  const spec = c.forms[seed.kind]!;
  const field = fieldByKey(spec, f.fieldKey)!;
  const fix = f.fix!;
  const w = fix.kind === "text" ? writeInto(field, values[f.fieldKey], fix.text, fix.mode)
    : fix.kind === "ask" ? writeInto(field, values[f.fieldKey], fix.frame(SAMPLE), fix.mode)
    : writeInto(field, values[f.fieldKey], fix.options[0], "replace");
  return { ...values, [f.fieldKey]: w.value };
}

function verifyFindings(label: string, seed: DocSeed, values: Record<string, Val>): Finding[] {
  const findings = run(clinic, seed, values);
  const consumer = clinic.consumers.find((x) => x.id === seed.consumerId)!;
  const spec = clinic.forms[seed.kind]!;
  for (const f of findings) {
    const where = `${label} · ${f.id}`;
    const field = fieldByKey(spec, f.fieldKey);
    check(!!field, `${where}: field ${f.fieldKey} is not in the form`);
    check(f.title.length > 8 && f.why.length > 30 && f.rule.length > 8, `${where}: title, why and rule must be written out`);
    check(![f.title, f.why, f.rule].some(wordsIorWe), `${where}: finding text uses "I" or "we"`);
    if (field?.lock) check(f.fix === null, `${where}: a locked field's finding must have fix: null`);
    const fix = f.fix;
    if (!fix) continue;
    if (fix.kind === "text") {
      const rec = consumer.chart.find((r) => r.label === fix.source);
      check(!!rec, `${where}: text fix source "${fix.source}" is not a chart record label`);
      check(rec && rec.text.includes(fix.text), `${where}: text fix is not a verbatim substring of "${fix.source}"`);
      check(!wordsIorWe(fix.text), `${where}: text fix uses "I" or "we"`);
    } else if (fix.kind === "ask") {
      const out = fix.frame(SAMPLE);
      check(out.includes(SAMPLE), `${where}: ask frame drops the clinician's words`);
      check(out.replace(SAMPLE, "").length <= 60, `${where}: ask frame adds more than a short fixed lead-in ("${out.replace(SAMPLE, "")}")`);
      check(![out, fix.prompt, fix.placeholder ?? ""].some((s) => wordsIorWe(s.replace(SAMPLE, ""))), `${where}: ask text uses "I" or "we"`);
    } else {
      check(fix.options.length >= 1, `${where}: choose has no options`);
      check(!fix.options.some(wordsIorWe) && !wordsIorWe(fix.prompt), `${where}: choose text uses "I" or "we"`);
      for (const o of fix.options) {
        if (field && (field.kind === "select" || field.kind === "checks")) check((field.options ?? []).includes(o), `${where}: option "${o}" is not an option of the field`);
        if (field?.kind === "yesno") check(o === "Yes" || o === "No", `${where}: option "${o}" is not Yes or No`);
      }
    }
    // the same finding must not come back after the fix
    const after = run(clinic, seed, applyFix(clinic, seed, values, f));
    check(!after.some((x) => findingSig(x) === findingSig(f)), `${where}: the same finding comes back after its fix`);
    const fresh = after.filter((x) => !findings.some((y) => findingSig(y) === findingSig(x)));
    for (const x of fresh) {
      if (x.severity === "severe") fail(`${where}: applying the fix creates a new severe finding (${x.id})`);
      else warnings.push(`${where}: applying the fix opens "${x.title}"`);
    }
  }
  // applying every fix one after the other settles, and only fix: null findings are left
  let cur = values;
  const done = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const fs = run(clinic, seed, cur).filter((x) => x.fix);
    if (!fs.length) break;
    const f = fs[0];
    if (done.has(findingSig(f))) { fail(`${label}: fixing "${f.title}" does not settle (it comes back)`); break; }
    done.add(findingSig(f));
    cur = applyFix(clinic, seed, cur, f);
  }
  const left = run(clinic, seed, cur);
  check(left.every((x) => !x.fix), `${label}: findings with a fix are left after applying every fix: ${left.filter((x) => x.fix).map((x) => x.id).join(", ")}`);
  return findings;
}

function documents() {
  const report: string[] = [];
  const byId: Record<string, { seed: Finding[]; after?: Finding[] }> = {};
  for (const seed of clinic.docs) {
    const hasScribe = clinic.scribe.some((s) => s.docId === seed.id);
    const s0 = verifyFindings(`${seed.id} (as Lauris has it)`, seed, seed.values);
    byId[seed.id] = { seed: s0 };
    report.push(`${seed.id.padEnd(10)} as Lauris has it: ${String(s0.length).padStart(2)} findings (${sevCounts(s0)})`);
    if (hasScribe) {
      const s1 = verifyFindings(`${seed.id} (after Scribe)`, seed, scribed(seed));
      byId[seed.id].after = s1;
      report.push(`${seed.id.padEnd(10)} after Scribe:      ${String(s1.length).padStart(2)} findings (${sevCounts(s1)})`);
    }
  }
  console.log(report.join("\n"));

  /* the required finding mixes */
  const dpn = byId["dpn-c101"]?.after ?? [];
  check(dpn.length === 1 && dpn[0].fieldKey === "plan" && dpn[0].fix?.kind === "ask", `dpn-c101 after Scribe must leave only the none field (plan); found: ${dpn.map((f) => f.id).join(", ") || "nothing"}`);

  const adm = byId["adm-c102"]?.after ?? [];
  check(adm.every((f) => f.fix === null), "adm-c102 after Scribe: only clinician-decision findings are left");
  check(!adm.some((f) => f.fieldKey === "hiv"), "adm-c102: the optional HIV / HCV field is never flagged");

  const asam = byId["asam-c102"]?.after ?? [];
  check(asam.length >= 3, `asam-c102 needs at least 3 findings after Scribe (has ${asam.length})`);
  check(asam.some((f) => f.severity === "medium" && f.fix?.kind === "ask" && /^d[345]n$/.test(f.fieldKey) && /rated [34]/.test(f.title)), "asam-c102: a rating of 3 or 4 with no rationale (medium, ask)");
  check(asam.some((f) => f.severity === "severe" && f.fix === null && /do not match/.test(f.title)), "asam-c102: a rationale that contradicts a rating (severe, fix null)");
  check(asam.some((f) => f.checkId === "asam-rationale-empty"), "asam-c102: a dimension with no rationale at all");

  const sra = byId["sra-c101"]?.after ?? [];
  check(sra.length >= 5, `sra-c101 needs at least 5 findings after Scribe (has ${sra.length})`);
  check(sra.some((f) => f.severity === "severe"), "sra-c101: at least one severe finding");
  check(sra.filter((f) => f.fix?.kind === "text").length >= 3, "sra-c101: at least three fixes that quote the chart (attendance, UDS, dimensions)");
  for (const key of ["attendance", "uds", "dims"]) check(sra.some((f) => f.fieldKey === key && f.fix?.kind === "text"), `sra-c101: a chart quotation for ${key}`);
  check(sra.some((f) => f.fix?.kind === "ask"), "sra-c101: an ask fix");
  check(sra.some((f) => f.fix?.kind === "choose"), "sra-c101: a choose fix");

  const weak = byId["dpn-c103"]?.seed ?? [];
  check(weak.length >= 4, `dpn-c103 needs at least 4 findings (has ${weak.length})`);
  check(weak.some((f) => f.severity === "severe"), "dpn-c103: at least one severe finding");
  check(weak.some((f) => f.checkId === "dpn-wording-observed" && f.severity === "severe"), "dpn-c103: the \"observed\" wording finding");

  // the per-document counts in the profile say the Scribe fill is small enough to be believable
  for (const id of ["dpn-c101", "adm-c102", "asam-c102", "sra-c101"]) check((byId[id]?.seed.length ?? 0) >= (byId[id]?.after?.length ?? 0), `${id}: Scribe should not add findings`);
}

/* ------------------------------ probes: checks the demo documents do not reach ------------------------------ */

interface Probe { label: string; doc: string; base: "seed" | "scribed"; patch: Record<string, Val>; consumer?: Partial<ClinicConfig["consumers"][number]>; expect: { checkId: string; fieldKey: string; severity?: Severity; fix?: "text" | "ask" | "choose" | null } }

function probes() {
  const p: Probe[] = [
    { label: "a percentage in the response", doc: "dpn-c101", base: "scribed", patch: { response: "Participated in 80% of the exercises." }, expect: { checkId: "dpn-wording-percent", fieldKey: "response", severity: "low", fix: "ask" } },
    { label: "a goal that is not on the plan", doc: "dpn-c101", base: "scribed", patch: { goal: "Goal 9 – something else" }, expect: { checkId: "dpn-goal-match", fieldKey: "goal", fix: "choose" } },
    { label: "an intervention that is not on the plan", doc: "dpn-c101", base: "scribed", patch: { ints: ["CBT-RP Relapse prevention (CBT)", "MAT-C MAT coordination"] }, expect: { checkId: "dpn-ints-plan", fieldKey: "ints", fix: null } },
    { label: "a urine screen in the text and no UDS answer", doc: "dpn-c101", base: "scribed", patch: { uds: "", response: "UDS collected today." }, expect: { checkId: "dpn-uds-consistency", fieldKey: "uds", severity: "low", fix: "choose" } },
    { label: "more units than are left", doc: "dpn-c101", base: "scribed", patch: { units: "12" }, expect: { checkId: "dpn-billing-auth", fieldKey: "units", severity: "severe", fix: null } },
    { label: "blank units", doc: "dpn-c101", base: "scribed", patch: { units: "" }, expect: { checkId: "dpn-billing-units", fieldKey: "units", fix: "ask" } },
    { label: "no release for the court", doc: "adm-c102", base: "scribed", patch: { release: "" }, expect: { checkId: "adm-release", fieldKey: "release", fix: "choose" } },
    { label: "a ticked substance with no description", doc: "adm-c102", base: "scribed", patch: { subs: [SUBSTANCES[0], SUBSTANCES[1], SUBSTANCES[3]] }, expect: { checkId: "adm-substances", fieldKey: "use", fix: "ask" } },
    { label: "a dimension with no rating", doc: "asam-c102", base: "seed", patch: { d4r: "" }, expect: { checkId: "asam-rating-missing", fieldKey: "d4r", fix: null } },
    { label: "a low rating with high-risk words", doc: "asam-c102", base: "seed", patch: { d2n: "Severe, unstable medical condition." }, expect: { checkId: "asam-contradiction", fieldKey: "d2n", severity: "severe", fix: null } },
    { label: "no UDS at assessment for SilverSummit", doc: "asam-c102", base: "seed", patch: { uds: "" }, expect: { checkId: "asam-uds-silversummit", fieldKey: "uds", fix: "ask" } },
    { label: "no level of care", doc: "asam-c102", base: "seed", patch: { loc: "" }, expect: { checkId: "asam-loc", fieldKey: "loc", fix: null } },
    { label: "an attendance count that differs from the chart", doc: "sra-c101", base: "scribed", patch: { attendance: "20 IOP days attended since August." }, expect: { checkId: "sra-attendance-count", fieldKey: "attendance", fix: "text" } },
    { label: "abstinent with no reason Level 2.1 is still needed", doc: "sra-c101", base: "scribed", patch: { d5: "Abstinent since September 24." }, expect: { checkId: "sra-abstinent", fieldKey: "d5", fix: "ask" } },
    { label: "a plan that authorizes five sessions at a time", doc: "sra-c101", base: "scribed", patch: { request: REQUESTS[0] }, consumer: { payer: "molina" }, expect: { checkId: "sra-molina-five", fieldKey: "request", fix: "choose" } },
    { label: "HIV status in a request", doc: "sra-c101", base: "scribed", patch: { barriers: "HIV status was shared with the group." }, expect: { checkId: "sra-wording-hiv", fieldKey: "barriers", severity: "severe", fix: null } },
    { label: "no goal and no plan in the chart", doc: "dpn-c103", base: "seed", patch: {}, consumer: { chart: [] }, expect: { checkId: "dpn-goal-named", fieldKey: "goal", fix: null } },
  ];
  for (const pr of p) {
    const seed = clinic.docs.find((d) => d.id === pr.doc)!;
    const base = pr.base === "scribed" ? scribed(seed) : { ...seed.values };
    const values = { ...base, ...pr.patch };
    const c: ClinicConfig = pr.consumer ? { ...clinic, consumers: clinic.consumers.map((x) => (x.id === seed.consumerId ? { ...x, ...pr.consumer } : x)) } : clinic;
    const fs = run(c, seed, values);
    const hit = fs.find((f) => f.checkId === pr.expect.checkId && f.fieldKey === pr.expect.fieldKey);
    if (!hit) { fail(`probe "${pr.label}": ${pr.expect.checkId} on ${pr.expect.fieldKey} did not fire (got: ${fs.map((f) => f.id).join(", ") || "nothing"})`); continue; }
    if (pr.expect.severity) check(hit.severity === pr.expect.severity, `probe "${pr.label}": severity ${hit.severity}, expected ${pr.expect.severity}`);
    if (pr.expect.fix !== undefined) check((hit.fix?.kind ?? null) === pr.expect.fix, `probe "${pr.label}": fix is ${hit.fix?.kind ?? null}, expected ${pr.expect.fix}`);
    // and the fix, when there is one, clears it
    if (hit.fix) {
      const after = run(c, seed, applyFix(c, seed, values, hit));
      check(!after.some((x) => findingSig(x) === findingSig(hit)), `probe "${pr.label}": the same finding comes back after its fix`);
      if (hit.fix.kind === "text") {
        const consumer = c.consumers.find((x) => x.id === seed.consumerId)!;
        const rec = consumer.chart.find((r) => r.label === (hit.fix as { source: string }).source);
        check(rec && rec.text.includes(hit.fix.text), `probe "${pr.label}": text fix is not a quotation`);
      }
    }
  }
  const never = clinic.checks.filter((c) => !fired.has(c.id)).map((c) => c.id);
  check(never.length === 0, `these checks never fire on any document or probe: ${never.join(", ")}`);
}

/* ------------------------------ History ------------------------------ */

function history() {
  check(clinic.history.length >= 8, `at least 8 history items (have ${clinic.history.length})`);
  for (const h of clinic.history) {
    check(h.consumerId === "" || clinic.consumers.some((c) => c.id === h.consumerId), `${h.id}: consumer ${h.consumerId}`);
    check(/^\d{4}-\d\d-\d\d$/.test(h.date) && h.date <= clinic.today, `${h.id}: date`);
    if (h.docId) {
      const d = clinic.docs.find((x) => x.id === h.docId);
      check(d && d.kind === h.doc && d.consumerId === h.consumerId, `${h.id}: docId ${h.docId} does not match`);
    }
  }
}

structure();
hygiene();
seeds();
documents();
probes();
history();

console.log(`\n${clinic.profile.short}: ${clinic.forms ? Object.keys(clinic.forms).length : 0} forms, ${clinic.consumers.length} consumers, ${clinic.docs.length} documents, ${clinic.scribe.length} Scribe scenarios, ${clinic.checks.length} checks in ${new Set(clinic.checks.map((c) => c.module)).size} modules, ${clinic.history.length} history items.`);
if (warnings.length) console.log(`\n${warnings.length} note${warnings.length === 1 ? "" : "s"} (a fix opens a follow-up the clinician then sees):\n- ${warnings.join("\n- ")}`);
if (errors.length) {
  console.error(`\nFAILED: ${errors.length} problem${errors.length === 1 ? "" : "s"}\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll checks passed.");
