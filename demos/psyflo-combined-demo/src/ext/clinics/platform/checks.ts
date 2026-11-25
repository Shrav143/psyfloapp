import { asText, fieldsOf, isEmpty } from "../../engine";
import type { Check, DocKind, Fix, RawFinding, ScanCtx, Severity } from "../../types";
import { DIMENSIONS, PLAN_GOALS, SAFETY_ADM, SAFETY_DPN, STIGMA_RE } from "./forms";

/* Audit checks for the sample treatment center. Every check is pure: it reads ctx.doc.values and the chart, and returns nothing when the document passes.
   The rules every fix obeys: a "text" fix quotes a stored record word for word; "ask" and "choose" fixes name no clinical fact beyond the clinician's own words or pick;
   a finding's fix is null where only the clinician can decide. After a fix is typed, the same finding does not come back. */

const M = { wording: "Wording", billing: "Billing", medical: "Medical necessity", completeness: "Completeness", safety: "Safety", thread: "Golden thread" } as const;

const txt = (ctx: ScanCtx, key: string): string => asText(ctx.doc.values[key]).trim();
const blank = (ctx: ScanCtx, key: string): boolean => isEmpty(ctx.doc.values[key]);
const ticks = (ctx: ScanCtx, key: string): string[] => { const v = ctx.doc.values[key]; return Array.isArray(v) ? v : []; };
const labelOf = (ctx: ScanCtx, key: string): string => fieldsOf(ctx.spec).find((f) => f.key === key)?.label ?? key;
const RULE = (topic: string) => `Clinic standard · ${topic}`;

/** A text fix: the exact words of a stored record. Null when the record, or the words, are not in this consumer's chart. */
function quote(ctx: ScanCtx, id: string, needle: string, mode: "replace" | "append"): Fix | null {
  const r = ctx.chart(id);
  if (!r || !r.text.includes(needle)) return null;
  return { kind: "text", text: needle, source: r.label, mode };
}
const ask = (prompt: string, mode: "replace" | "append", frame: (a: string) => string = (a) => a, placeholder?: string): Fix => ({ kind: "ask", prompt, placeholder, frame, mode });
const choose = (prompt: string, options: string[]): Fix => ({ kind: "choose", prompt, options });

type Run = (ctx: ScanCtx) => RawFinding[];
const check = (id: string, title: string, module: string, docs: DocKind[], severity: Severity, run: Run): Check => ({ id, title, module, docs, severity, run });
const one = (f: RawFinding | null): RawFinding[] => (f ? [f] : []);

/* =============================== every document: person-first wording =============================== */
const wording = check("wording", "Person-first wording", M.wording, ["dpn", "admission", "intake", "assessment"], "medium", (ctx) =>
  fieldsOf(ctx.spec)
    .filter((f) => (f.kind === "text" || f.kind === "textarea") && !f.lock && STIGMA_RE.test(txt(ctx, f.key)))
    .map((f) => ({
      severity: "medium" as const, fieldKey: f.key, title: `"${STIGMA_RE.exec(txt(ctx, f.key))?.[0]}" describes the person by the condition or judges them`,
      why: "Records are read by payers and by the patient. Wording that labels or blames the person invites a reviewer to read the rest the same way.", rule: RULE("wording"),
      fix: ask("How would you put it, in your words?", "replace", (a) => a, "Say what happened"),
    })));

/* =============================== Daily progress note =============================== */
const dpnDuration = check("dpn-duration", "Minutes of direct time are recorded", M.billing, ["dpn"], "medium", (ctx) =>
  one(blank(ctx, "duration") ? {
    severity: "medium", fieldKey: "duration", title: "The duration is blank", why: "A unit cannot be billed without the minutes of direct time.", rule: RULE("billing"),
    fix: ask("How many minutes of direct time?", "replace", (a) => a, "e.g. 45 min"),
  } : null));
const dpnGoal = check("dpn-goal", "The note names the plan goal it serves", M.thread, ["dpn"], "medium", (ctx) =>
  one(blank(ctx, "goal") ? {
    severity: "medium", fieldKey: "goal", title: "No plan goal is named", why: "The note has to trace to a goal on the treatment plan; a note that does not is the first thing an auditor sets aside.", rule: RULE("golden thread"),
    fix: choose("Which plan goal did this session serve?", PLAN_GOALS),
  } : null));
const dpnSx = check("dpn-sx", "Craving, withdrawal and mood are recorded", M.medical, ["dpn"], "medium", (ctx) =>
  one(blank(ctx, "sx") ? {
    severity: "medium", fieldKey: "sx", title: "Craving, withdrawal and mood are not recorded", why: "These scores show why the level of care is still needed. A continued-stay review reads them first.", rule: RULE("medical necessity"),
    fix: ask("What did the patient report, or what were the scores?", "replace", (a) => `Patient report today: ${a}`, "Craving, withdrawal, mood"),
  } : null));
const dpnRisk = check("dpn-risk", "The safety screen is answered", M.safety, ["dpn"], "severe", (ctx) =>
  one(ticks(ctx, "risk").length === 0 ? {
    severity: "severe", fieldKey: "risk", title: "The safety screen is empty", why: "A note with no safety answer cannot show the person was safe today. Tick what applies, or None reported.", rule: RULE("safety"),
    fix: choose("What was reported today?", SAFETY_DPN),
  } : null));
const dpnPlan = check("dpn-plan", "The next step is stated", M.completeness, ["dpn"], "low", (ctx) => {
  const t = txt(ctx, "plan");
  return one(!t || /^(continue|monitor)\.?$/i.test(t) ? {
    severity: "low", fieldKey: "plan", title: t ? `"${t}" does not say what happens next` : "The plan for the next session is blank", why: "A plan of one word reads as unfinished. Say what the next session will work on.", rule: RULE("completeness"),
    fix: ask("What will the next session work on?", "replace", (a) => `Next session: ${a}`),
  } : null);
});

/* =============================== Admission screening =============================== */
const admSafety = check("adm-safety", "The safety screen is answered", M.safety, ["admission"], "severe", (ctx) =>
  one(ticks(ctx, "safety").length === 0 ? {
    severity: "severe", fieldKey: "safety", title: "The safety screen is empty", why: "An admission cannot proceed without the safety questions answered.", rule: RULE("safety"),
    fix: choose("What did the patient answer?", SAFETY_ADM),
  } : null));
const admLastUse = check("adm-lastuse", "The last use is recorded", M.medical, ["admission"], "medium", (ctx) =>
  one(blank(ctx, "lastuse") ? {
    severity: "medium", fieldKey: "lastuse", title: "The last use is blank", why: "The last use sets the withdrawal timeline and the level of care.", rule: RULE("medical necessity"),
    fix: ask("When was the last use?", "replace", (a) => a, "e.g. two days ago"),
  } : null));
const admWithdrawal = check("adm-withdrawal", "Withdrawal symptoms are recorded", M.medical, ["admission"], "medium", (ctx) =>
  one(blank(ctx, "withdrawal") ? {
    severity: "medium", fieldKey: "withdrawal", title: "Withdrawal symptoms are blank", why: "Without them a reviewer cannot tell whether detox or a lower level of care would do.", rule: RULE("medical necessity"),
    fix: ask("What symptoms does the patient have now?", "replace", (a) => a, "In the patient's words or a score"),
  } : null));
const admWhy = check("adm-why", "The level of care has a reason", M.thread, ["admission"], "medium", (ctx) =>
  one(!blank(ctx, "loc") && blank(ctx, "why") ? {
    severity: "medium", fieldKey: "why", title: "A level of care is chosen but the reason is blank", why: "A payer asks why a lower level of care is not enough. The admission should say so before the request does.", rule: RULE("medical necessity"),
    fix: quote(ctx, "psy3", "Relapse on 9/28 after eleven months of abstinence.", "replace") ?? ask("Why does this patient need this level of care?", "replace"),
  } : null));

/* =============================== Intake =============================== */
const intPrior = check("int-prior", "Prior treatment is recorded", M.medical, ["intake"], "medium", (ctx) =>
  one(blank(ctx, "prior") ? {
    severity: "medium", fieldKey: "prior", title: "Prior treatment is blank", why: "A lower level of care that was tried is the strongest reason for the next level.", rule: RULE("medical necessity"),
    fix: quote(ctx, "soc2", "Intensive outpatient program in 2025 ended in week 3 when housing was lost.", "replace") ?? ask("What treatment has the patient had before?", "replace"),
  } : null));
const intSocial = check("int-social", "Home and supports are recorded", M.completeness, ["intake"], "medium", (ctx) =>
  one(blank(ctx, "social") ? {
    severity: "medium", fieldKey: "social", title: "Home, work and supports are blank", why: "The recovery environment is part of every level-of-care decision.", rule: RULE("completeness"),
    fix: quote(ctx, "soc4", "Lives with a partner who drinks daily. No reliable transport to outpatient visits.", "replace") ?? ask("Where does the patient live, and who supports them?", "replace"),
  } : null));
const intLegal = check("int-legal", "Legal involvement is answered", M.completeness, ["intake"], "low", (ctx) =>
  one(blank(ctx, "legal") ? {
    severity: "low", fieldKey: "legal", title: "Legal involvement is not answered", why: "Yes or No is enough; a blank reads as not asked.", rule: RULE("completeness"),
    fix: choose("Any legal involvement?", ["Yes", "No"]),
  } : null));

/* =============================== Assessment summary =============================== */
const asmRatings = check("asm-ratings", "Every dimension is rated", M.completeness, ["assessment"], "severe", (ctx) =>
  DIMENSIONS.filter((d) => blank(ctx, `d${d.n}`)).map((d) => ({
    severity: "severe" as const, fieldKey: `d${d.n}`, title: `${d.label} is not rated`, why: "A level-of-care recommendation rests on all six dimensions. A blank one makes the whole summary incomplete.", rule: RULE("assessment"),
    fix: choose(`Your rating for ${d.label.split(" · ")[1].toLowerCase()}`, ctx.spec.sections.flatMap((s) => s.fields).find((f) => f.key === `d${d.n}`)?.options ?? []),
  })));
const asmNotes = check("asm-notes", "A high rating has its reason", M.medical, ["assessment"], "medium", (ctx) =>
  DIMENSIONS.filter((d) => /^[34]/.test(txt(ctx, `d${d.n}`)) && blank(ctx, `n${d.n}`)).map((d) => ({
    severity: "medium" as const, fieldKey: `n${d.n}`, title: `${d.label} is rated high with no reason beside it`, why: "A reviewer reads the reason next to every high rating. Without it the rating looks unsupported.", rule: RULE("medical necessity"),
    fix: ask("What supports this rating?", "replace"),
  })));
const asmRationale = check("asm-rationale", "The recommendation has a rationale", M.thread, ["assessment"], "medium", (ctx) =>
  one(!blank(ctx, "loc") && blank(ctx, "rationale") ? {
    severity: "medium", fieldKey: "rationale", title: `A level of care is recommended but the ${labelOf(ctx, "rationale").toLowerCase()} is blank`, why: "The rationale connects the six ratings to the level of care.", rule: RULE("golden thread"),
    fix: ask("In your words: why this level of care?", "replace"),
  } : null));

export const checks: Check[] = [
  wording,
  dpnDuration, dpnGoal, dpnSx, dpnRisk, dpnPlan,
  admSafety, admLastUse, admWithdrawal, admWhy,
  intPrior, intSocial, intLegal,
  asmRatings, asmNotes, asmRationale,
];
