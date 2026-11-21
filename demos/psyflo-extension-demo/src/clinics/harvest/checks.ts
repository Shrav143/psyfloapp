import { asText, isEmpty } from "../../engine";
import type { Check, DocKind, Fix, RawFinding, ScanCtx, Severity } from "../../types";
import { AGGRESSION, CANS_DOMAINS, CANS_RATING_KEYS, ELOPE, HOUSEHOLD_INCLUDE, HOUSEHOLD_LEAVE_OUT, NO_RISK, PICKLIST, RISK_OPTIONS, SELF_HARM } from "./forms";

/* Audit checks for Harvest Outreach. Every check is pure: it reads ctx.doc.values and the chart, and returns nothing when the document passes.
   Properties the selftest enforces:
   - after a fix is typed with writeInto, the same finding does not come back;
   - a "text" fix quotes a stored record word for word, and its source is that record's label;
   - "ask" and "choose" fixes name no clinical fact beyond the clinician's words or pick;
   - fix: null where only the clinician can decide (a rating, a diagnosis, a signature). */

const M = {
  golden: "Golden thread",
  wording: "Wording",
  billing: "Billing",
  medical: "Medical necessity",
  completeness: "Completeness",
  consistency: "Consistency",
} as const;

/* ------------------------------ helpers ------------------------------ */
const txt = (ctx: ScanCtx, key: string): string => asText(ctx.doc.values[key]).trim();
const ticks = (ctx: ScanCtx, key: string): string[] => {
  const v = ctx.doc.values[key];
  return Array.isArray(v) ? v : [];
};
const blank = (ctx: ScanCtx, key: string): boolean => isEmpty(ctx.doc.values[key]);
const payerName = (ctx: ScanCtx): string => ctx.clinic.profile.payers.find((p) => p.id === ctx.consumer.payer)?.name ?? "the plan";
const sampleRule = (ctx: ScanCtx, topic: string): string => `${payerName(ctx)} · Harvest sample criteria · ${topic}`;
const ini = (ctx: ScanCtx): string => ctx.consumer.ini;

/** A text fix: the exact words of a stored record. Null when the record (or the words) is not in this consumer's chart. */
function quote(ctx: ScanCtx, id: string, needle: string, mode: "replace" | "append"): Fix | null {
  const rec = ctx.chart(id);
  if (!rec || !rec.text.includes(needle)) return null;
  return { kind: "text", text: needle, source: rec.label, mode };
}
const ask = (prompt: string, mode: "replace" | "append", frame: (a: string) => string = (a) => a, placeholder?: string, source?: string): Fix => ({
  kind: "ask", prompt, placeholder, frame, mode, source,
});

/** Words that mean the child left the building, in a text box. */
export const LEAVE_RE = /\b(?:left|leave|leaves|leaving|walk(?:ed|s)? out|ran|runs|running|elope\w*)\b[^.]{0,50}\b(?:building|parking lot|school grounds)\b|\bparking lot\b|\belopement\b|\beloped\b/i;
/** A count that shows how often or how many (admission screening). */
const COUNT_RE = /\b\d+\s+(?:dated\s+)?(?:incidents?|occasions?|office referrals?|referrals?|times)\b/i;
/** "3 of 5": the form the daily notes use for counts. */
const OF_RE = /\b\d+ of \d+\b/;
const OBSERVED_RE = /\bobserved\b/i;
const MONITOR_ONLY_RE = /^\s*(?:will\s+)?(?:continue\s+to\s+)?monitor(?:ing)?\.?\s*$/i;
const DURATION_RE = /\b\d+(?:\.\d+)?\s*(?:min|minutes?|hours?|hrs?)\b|\b\d{1,2}:\d{2}\b/i;
/** A sentence that says where progress fell short (an incident that ended badly, an objective not met). */
const LACK_RE = /\b(?:shov\w*|aggress\w*|elope\w*|suspension|ISS|left the (?:room|building|class\w*)|still ended|ended in|did not (?:use|meet|reach)|not (?:yet )?met|below (?:the )?objective|fell short|short of the objective|setback|incident\w*)\b/i;
const CHANGE_RE = /\b(?:ISP|plan)\b[^.]{0,60}\b(?:changed|amended|updated|revised)\b|\b(?:changed|amended|updated|revised)\b[^.]{0,40}\b(?:ISP|plan)\b/i;
const DATE_RE = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/;
const OUTCOME_RE = /\b(?:behaviou?r (?:did not change|continued|improved|got worse|changed)|not making progress|no change in behaviou?r)\b/i;

const sentences = (s: string): string[] => s.split(/(?<=[.!?])\s+/).filter(Boolean);
/** The objective of a plan goal record, "Obj. 1 – use a taught coping strategy …" (no trailing period). */
const objectiveOf = (text: string): string | null => /Obj\. \d – [^.]+/.exec(text)?.[0] ?? null;
/** The interventions the plan lists for Goal 1, taken from the record ("Interventions: A; B."). */
function planInterventions(ctx: ScanCtx): string[] {
  const rec = ctx.chart("isp-g1");
  const tail = rec?.text.split("Interventions: ")[1];
  if (!tail) return [];
  return tail.replace(/\.\s*$/, "").split(";").map((s) => s.trim()).filter((s) => PICKLIST.includes(s));
}
const usDateMs = (s: string): number | null => {
  const m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(s.trim());
  return m ? Date.UTC(+m[3], +m[1] - 1, +m[2]) : null;
};
const rating = (ctx: ScanCtx, key: string): number | null => {
  const m = /^(\d)/.exec(txt(ctx, key));
  return m ? +m[1] : null;
};
const labelOf = (ctx: ScanCtx, key: string): string => ctx.spec.sections.flatMap((s) => s.fields).find((f) => f.key === key)?.label ?? key;

type Run = (ctx: ScanCtx) => RawFinding[];
const check = (id: string, title: string, module: string, docs: DocKind[], severity: Severity, run: Run): Check => ({ id, title, module, docs, severity, run });

/* =============================== Daily progress note (dpn) =============================== */
const dpnChecks: Check[] = [
  check("dpn-date", "Service date is stated", M.completeness, ["dpn"], "medium", (ctx) => !blank(ctx, "date") ? [] : [{
    severity: "medium", fieldKey: "date", title: "The service date is blank",
    why: "The units and the audit trail both start from the date of service.", rule: "Harvest standard · daily note",
    fix: ask(`What was the date of service for ${ini(ctx)}?`, "replace", (a) => a, "mm/dd/yyyy"),
  }]),

  check("dpn-service", "Service is TDT (H2016)", M.billing, ["dpn"], "medium", (ctx) => /H2016/i.test(txt(ctx, "service")) ? [] : [{
    severity: "medium", fieldKey: "service", title: "The service line does not show H2016",
    why: "Lauris fills the service from the record. If it is blank or different, the unit may not bill as TDT. Psyflo does not type a billing code.",
    rule: "Harvest standard · billing", fix: null,
  }]),

  check("dpn-goal-link", "Goal is linked to the plan", M.golden, ["dpn"], "medium", (ctx) => {
    const goal = txt(ctx, "goal");
    const objectives = ["isp-g1", "isp-g2", "isp-g3"].map((id) => objectiveOf(ctx.chart(id)?.text ?? "")).filter((o): o is string => !!o);
    if (objectives.some((o) => goal.includes(o))) return [];
    const g1 = objectiveOf(ctx.chart("isp-g1")?.text ?? "");
    return [{
      severity: "medium", fieldKey: "goal",
      title: goal ? "The goal is not one of the plan’s objectives" : "The treatment goal is blank",
      why: "A note has to point at an objective in the ISP and use its words, with the objective number. Without that, a reviewer cannot tie the day’s work to the plan."
        + (g1 ? " The fix quotes Objective 1 from the plan; use another objective if that is what the note worked on." : ""),
      rule: "Harvest standard · daily note (the golden thread)",
      fix: g1 ? quote(ctx, "isp-g1", g1, "replace") : null,
    }];
  }),

  check("dpn-ints-picked", "An ISP intervention is ticked", M.golden, ["dpn"], "medium", (ctx) => {
    if (ticks(ctx, "ints").length) return [];
    const fromPlan = planInterventions(ctx);
    return [{
      severity: "medium", fieldKey: "ints", title: "No intervention from the ISP picklist is ticked",
      why: "The note’s interventions come from the approved ISP picklist. A note with none ticked does not show which service was delivered.",
      rule: "Harvest standard · daily note",
      fix: { kind: "choose", prompt: `Which intervention did staff use with ${ini(ctx)}? Interventions in the plan come first.`,
        options: [...fromPlan, ...PICKLIST.filter((n) => !fromPlan.includes(n))], source: ctx.chart("isp-g1")?.label },
    }];
  }),

  check("dpn-intervention", "Intervention is described", M.completeness, ["dpn"], "medium", (ctx) => !blank(ctx, "intervention") ? [] : [{
    severity: "medium", fieldKey: "intervention", title: "Intervention performed is blank",
    why: "The intervention is what the unit bills for. Say what staff did, as an action.", rule: "Harvest standard · daily note",
    fix: ask(`What did staff do with ${ini(ctx)}?`, "replace", (a) => a, "In your words, as an action"),
  }]),

  check("dpn-observed", "No “observed” wording", M.wording, ["dpn"], "severe", (ctx) => !OBSERVED_RE.test(txt(ctx, "intervention")) ? [] : [{
    severity: "severe", fieldKey: "intervention", title: "“Observed” describes watching, not treatment",
    why: "“Observed” is not a billable intervention. In an audit it can void the unit for that day. Say what staff did.",
    rule: "Harvest standard · wording",
    fix: ask(`What did staff do with ${ini(ctx)}? Say it as an action, not as watching.`, "replace", (a) => a, `e.g. Worked with ${ini(ctx)} on …`),
  }]),

  check("dpn-duration", "Duration is stated", M.billing, ["dpn"], "medium", (ctx) => DURATION_RE.test(txt(ctx, "duration")) ? [] : [{
    severity: "medium", fieldKey: "duration", title: txt(ctx, "duration") ? "Duration has no minutes or clock range" : "Duration is blank",
    why: "Units follow direct time with the child, so the note states the minutes or the clock range.", rule: "Harvest standard · billing",
    fix: ask(`How long was the direct time with ${ini(ctx)}?`, "replace", (a) => a, "Minutes or a clock range"),
  }]),

  check("dpn-response", "Response is stated", M.completeness, ["dpn"], "medium", (ctx) => !blank(ctx, "response") ? [] : [{
    severity: "medium", fieldKey: "response", title: "Consumer response is blank",
    why: "The response shows whether the intervention helped. A note without it reads as unfinished.", rule: "Harvest standard · daily note",
    fix: ask(`How did ${ini(ctx)} respond?`, "replace", (a) => a, "In your words"),
  }]),

  check("dpn-progress", "Progress or barriers is stated", M.medical, ["dpn"], "medium", (ctx) => !blank(ctx, "progress") ? [] : [{
    severity: "medium", fieldKey: "progress", title: "Progress or barriers is blank",
    why: "Without a progress or barrier line, a reviewer has nothing to compare with the objective. A count works best, written “x of y”.",
    rule: "Harvest standard · daily note",
    fix: ask(`What progress or barrier showed up today for ${ini(ctx)}?`, "replace", (a) => a, "Use a count if you have one"),
  }]),

  check("dpn-needs", "Continuing needs are stated", M.medical, ["dpn"], "medium", (ctx) => !blank(ctx, "needs") ? [] : [{
    severity: "medium", fieldKey: "needs", title: "Continuing clinical needs is blank",
    why: "A note that says nothing about what comes next reads as unfinished, and gives a continued stay request nothing to cite.",
    rule: "Harvest standard · daily note",
    fix: ask(`What does ${ini(ctx)} still need?`, "replace", (a) => a, "In your words"),
  }]),

  check("dpn-monitor-only", "Needs say more than “monitor”", M.wording, ["dpn"], "low", (ctx) => !MONITOR_ONLY_RE.test(txt(ctx, "needs")) ? [] : [{
    severity: "low", fieldKey: "needs", title: "Continuing needs only says “monitor”",
    why: "“Will continue to monitor” names no service and no need. Say what staff will do or what the child still needs.",
    rule: "Harvest standard · wording",
    fix: ask(`What will staff do next with ${ini(ctx)}, or what does ${ini(ctx)} still need?`, "replace", (a) => a, "In your words"),
  }]),

  check("dpn-ints-match-text", "Ticked interventions match the text", M.consistency, ["dpn"], "low", (ctx) => {
    const said = PICKLIST.filter((n) => txt(ctx, "intervention").toLowerCase().includes(n.toLowerCase()));
    const missing = said.filter((n) => !ticks(ctx, "ints").includes(n));
    if (!missing.length) return [];
    return [{
      severity: "low", fieldKey: "ints", title: "The text names an intervention that is not ticked",
      why: "The intervention box names " + missing.join(" and ") + ", but it is not ticked in the picklist. The two should say the same thing.",
      rule: "Harvest standard · daily note",
      fix: { kind: "choose", prompt: "Tick the one the text names.", options: missing },
    }];
  }),
];

/* =============================== Admission screening and intake: shared =============================== */
/** The text says the child left the building, but the risk boxes do not. Applies to the screening and to the intake. */
const riskLeaving = check("risk-leaving-building", "Risk boxes match the text", M.consistency, ["admission", "intake"], "medium", (ctx) => {
  const key = ctx.doc.kind === "admission" ? "concerns" : "reason";
  if (!LEAVE_RE.test(txt(ctx, key)) || ticks(ctx, "risk").includes(ELOPE)) return [];
  const others = [AGGRESSION, SELF_HARM].filter((o) => !ticks(ctx, "risk").includes(o));
  return [{
    severity: "medium", fieldKey: "risk", title: "The text mentions leaving the building, but elopement is not ticked",
    why: "The record says " + ini(ctx) + " left the building, and the risk screen says nothing about it. Whether it is a current risk is the screener’s call; the two should not disagree.",
    rule: "Harvest standard · risk screen",
    fix: { kind: "choose", prompt: `Which risk boxes apply to ${ini(ctx)}?`, options: [ELOPE, ...others], source: ctx.chart("incident-oct6")?.label },
  }];
});
const riskAnswered = check("risk-screen-answered", "Risk screen is answered", M.completeness, ["admission", "intake"], "medium", (ctx) => {
  if (ticks(ctx, "risk").length) return [];
  const key = ctx.doc.kind === "admission" ? "concerns" : "reason";
  if (LEAVE_RE.test(txt(ctx, key))) return []; // the check above covers it with the same box
  return [{
    severity: "medium", fieldKey: "risk", title: "The risk screen has no box ticked",
    why: "Tick the boxes that apply, or tick “None”. A blank risk screen reads as not asked.", rule: "Harvest standard · risk screen",
    fix: { kind: "choose", prompt: `Which risk boxes apply to ${ini(ctx)}?`, options: RISK_OPTIONS },
  }];
});
const signed = check("signature-signed", "Staff signature is present", M.completeness, ["admission", "intake"], "low", (ctx) => !blank(ctx, "sig") ? [] : [{
  severity: "low", fieldKey: "sig", title: "The signature is blank",
  why: "Signing is the clinician’s step. Psyflo never signs, and it never presses Save.", rule: "Harvest standard · signatures", fix: null,
}]);

/* =============================== Admission screening =============================== */
const admissionChecks: Check[] = [
  check("adm-trauma", "Trauma-informed care is written", M.medical, ["admission"], "severe", (ctx) => !blank(ctx, "trauma") ? [] : [{
    severity: "severe", fieldKey: "trauma", title: "The trauma-informed care box is blank",
    why: "A blank box reads as “not assessed”. This is the one box Psyflo never drafts: what goes in it is the clinician’s judgement and the family’s to share.",
    rule: sampleRule(ctx, "trauma-informed care"),
    fix: ask(`What did the family share about a hard event in ${ini(ctx)}’s history, and what is the plan?`, "replace", (a) => a, "In the family’s words, or what they chose not to share"),
  }]),

  check("adm-concerns-counts", "Presenting needs carry counts", M.medical, ["admission"], "medium", (ctx) => {
    if (COUNT_RE.test(txt(ctx, "concerns"))) return [];
    const needle = "In the 30 days before the referral the school documented 6 dated incidents of physical aggression toward peers, 2 to 3 times a week, lasting 5 to 20 minutes, at moderate intensity, with 2 office referrals.";
    return [{
      severity: "medium", fieldKey: "concerns",
      title: blank(ctx, "concerns") ? "Presenting needs are blank" : "Presenting needs have no counts or dates",
      why: "A reviewer checks how often and how long. The school’s own record has the count; the family’s words alone read as a guess.",
      rule: sampleRule(ctx, "clinical criteria with counts"),
      fix: quote(ctx, "ref-oct13", needle, "append"),
    }];
  }),

  check("adm-safety-plan", "Safety plan is decided", M.completeness, ["admission"], "medium", (ctx) => {
    const risk = ticks(ctx, "risk").filter((r) => r !== NO_RISK);
    if (!risk.length || !blank(ctx, "safety")) return [];
    return [{
      severity: "medium", fieldKey: "safety", title: "A risk is ticked, but “Safety plan needed” is not answered",
      why: "With a risk ticked, the screening says whether a safety plan is needed. Only the screener decides.", rule: "Harvest standard · risk screen",
      fix: { kind: "choose", prompt: `Is a safety plan needed for ${ini(ctx)}?`, options: ["Yes", "No"] },
    }];
  }),

  check("adm-iep", "IEP is answered", M.completeness, ["admission"], "low", (ctx) => !blank(ctx, "iep") ? [] : [{
    severity: "low", fieldKey: "iep", title: "“IEP in place” is not answered",
    why: "The IEP is part of what the plan has to say the school already provides.", rule: "Harvest standard · admission screening",
    fix: { kind: "choose", prompt: `Does ${ini(ctx)} have an IEP?`, options: ["Yes", "No"] },
  }]),

  check("adm-meds", "Medications are listed", M.completeness, ["admission"], "low", (ctx) => !blank(ctx, "meds") ? [] : [{
    severity: "low", fieldKey: "meds", title: "Current medications is blank",
    why: "Write the medicines, or “none reported”. A blank box reads as not asked.", rule: "Harvest standard · admission screening",
    fix: ask(`What medicines does ${ini(ctx)} take?`, "replace", (a) => a, "Or “none reported”"),
  }]),

  check("adm-completed-by", "Screener is named", M.completeness, ["admission"], "low", (ctx) => !blank(ctx, "completed") ? [] : [{
    severity: "low", fieldKey: "completed", title: "“Screening completed by” is blank",
    why: "The form names who did the screening.", rule: "Harvest standard · admission screening",
    fix: ask("Who completed the screening?", "replace", (a) => a, "Name and role"),
  }]),
  riskLeaving,
  riskAnswered,
  signed,
];

/* =============================== Intake (CNA) =============================== */
const PRIOR_STEM = "Piedmont Counseling, March to June 2025, 6 visits.";
export const PRIOR_OPTIONS = [
  `${PRIOR_STEM} Ended when the family lost transportation (guardian, intake). Behavior did not change during or after the 6 visits.`,
  `${PRIOR_STEM} Ended by the provider in June 2025 for not making progress (guardian, intake).`,
  `${PRIOR_STEM} Stopped by the family in June 2025; no reason given (guardian, intake). Behavior continued.`,
];

const intakeChecks: Check[] = [
  check("intake-reason", "Reason for referral is written", M.completeness, ["intake"], "medium", (ctx) => !blank(ctx, "reason") ? [] : [{
    severity: "medium", fieldKey: "reason", title: "Presenting Issue/Reason for Referral is blank",
    why: "Every later section reads from this one.", rule: "Harvest standard · intake",
    fix: ask(`Why was ${ini(ctx)} referred?`, "replace", (a) => a, "In your words or the family’s"),
  }]),

  check("intake-prior-outcome", "Prior service outcome is stated", M.medical, ["intake"], "severe", (ctx) => {
    if (OUTCOME_RE.test(txt(ctx, "prior"))) return [];
    const rec = ctx.chart("call-oct14");
    return [{
      severity: "severe", fieldKey: "prior",
      title: blank(ctx, "prior") ? "Prior services are not written" : "The outpatient outcome is not stated",
      why: "An insurer reads “ended: transportation” as the family’s choice, not a failed service. The box has to say how the episode ended and whether behavior changed."
        + (rec ? ` The guardian’s words are in the “${rec.label}” note; only you choose what the CNA says.` : ""),
      rule: sampleRule(ctx, "a prior service with its outcome"),
      fix: rec ? { kind: "choose", prompt: "How did the outpatient counseling end?", options: PRIOR_OPTIONS, source: rec.label } : null,
    }];
  }),

  check("intake-abs", "Unexcused absences carry a count", M.completeness, ["intake"], "medium", (ctx) => /\d/.test(txt(ctx, "abs")) ? [] : [{
    severity: "medium", fieldKey: "abs", title: blank(ctx, "abs") ? "Unexcused absences are blank" : "Unexcused absences have no count",
    why: "“A lot of days” cannot be checked. The school record has the number.", rule: sampleRule(ctx, "school record counts"),
    fix: quote(ctx, "school-oct15", "Unexcused absences this school year: 9.", "append"),
  }]),

  check("intake-classes", "Classes passing are stated", M.completeness, ["intake"], "medium", (ctx) => /\d/.test(txt(ctx, "classes")) && /pass/i.test(txt(ctx, "classes")) ? [] : [{
    severity: "medium", fieldKey: "classes", title: "Classes taking and passing are blank",
    why: "The school record’s counts are what a reviewer reads for school functioning.", rule: sampleRule(ctx, "school record counts"),
    fix: quote(ctx, "school-oct15", "Classes taking: 7. Classes passing: 4 (school record, Oct 15).", "append"),
  }]),

  check("intake-susp", "Suspensions and days out are complete", M.completeness, ["intake"], "low", (ctx) => /out[- ]of[- ]school/i.test(txt(ctx, "susp")) ? [] : [{
    severity: "low", fieldKey: "susp", title: blank(ctx, "susp") ? "Suspensions and days out are blank" : "Out-of-school days are not stated",
    why: "The box asks for in-school and out-of-school days. State both, even when one is 0.", rule: sampleRule(ctx, "school record counts"),
    fix: quote(ctx, "school-oct15", "In-school suspension: 1 day (Oct 6); out-of-school suspension: 0 days.", "append"),
  }]),

  check("intake-strengths", "Strengths are written", M.completeness, ["intake"], "low", (ctx) => !blank(ctx, "strengths") ? [] : [{
    severity: "low", fieldKey: "strengths", title: "Strengths, needs, abilities and preferences is empty",
    why: "The plan builds on strengths, and the request has a box for them. Ask what the child does well and who the child listens to.",
    rule: "Harvest standard · intake",
    fix: ask(`What is ${ini(ctx)} good at, and who does ${ini(ctx)} listen to?`, "replace", (a) => a, "In the family’s words"),
  }]),

  riskLeaving,
  riskAnswered,

  check("intake-summary", "Clinical summary is written", M.completeness, ["intake"], "medium", (ctx) => !blank(ctx, "summary") ? [] : [{
    severity: "medium", fieldKey: "summary", title: "The clinical summary is blank",
    why: "The summary is the clinician’s formulation. Psyflo does not write it; the clinician decides.", rule: "Harvest standard · intake", fix: null,
  }]),

  check("intake-dx", "Diagnosis is chosen", M.completeness, ["intake"], "medium", (ctx) => !blank(ctx, "dx") ? [] : [{
    severity: "medium", fieldKey: "dx", title: "The diagnosis is blank",
    why: "The diagnosis is the clinician’s judgement. Psyflo never suggests one.", rule: "Harvest standard · intake", fix: null,
  }]),

  check("intake-loc", "Level of care is recommended", M.completeness, ["intake"], "medium", (ctx) => !blank(ctx, "loc") ? [] : [{
    severity: "medium", fieldKey: "loc", title: "The recommended level of care is blank",
    why: "The service recommendation is the clinician’s decision. Psyflo reads it and never picks it.", rule: "Harvest standard · intake", fix: null,
  }]),

  signed,
];

/* =============================== CANS (shortened, simulated) =============================== */
const cansChecks: Check[] = [
  check("cans-all-rated", "Every item is rated", M.completeness, ["assessment"], "medium", (ctx) =>
    CANS_RATING_KEYS.filter((k) => blank(ctx, k)).map((k): RawFinding => ({
      severity: "medium", fieldKey: k, title: `${labelOf(ctx, k)} has no rating`,
      why: "Every item gets a rating. The rating is the clinician’s judgement, so Psyflo only names the gap.", rule: "Harvest standard · CANS", fix: null,
    }))),

  check("cans-narrative-2plus", "A 2 or 3 has a narrative", M.medical, ["assessment"], "medium", (ctx) =>
    CANS_DOMAINS.flatMap((d): RawFinding[] => {
      const high = d.items.filter((i) => (rating(ctx, i.key) ?? 0) >= 2);
      if (!high.length || !blank(ctx, d.narrative)) return [];
      return [{
        severity: "medium", fieldKey: d.narrative, title: `${d.title}: rated 2 or 3 with no narrative`,
        why: `${high.map((i) => i.label).join(", ")} ${high.length === 1 ? "is" : "are"} rated 2 or 3, and the narrative is empty. A rating that calls for action needs the words behind it.`,
        rule: "Harvest standard · CANS",
        fix: ask(`What should the ${d.title} narrative say about ${ini(ctx)}? Use the guardian’s words or your own.`, "replace", (a) => a, "In the guardian’s words or yours"),
      }];
    })),

  check("cans-elopement-rating", "Elopement rating matches the narrative", M.consistency, ["assessment"], "severe", (ctx) => {
    const said = CANS_DOMAINS.map((d) => d.narrative).concat("n_strengths").some((k) => LEAVE_RE.test(txt(ctx, k)));
    if (!said || rating(ctx, "r_runaway") !== 0) return [];
    return [{
      severity: "severe", fieldKey: "r_runaway", title: "The narrative describes leaving the building, but Runaway/Elopement is rated 0",
      why: "The rating and the guardian’s words disagree, and a reviewer reads the rating first. The rating is the clinician’s judgement, so Psyflo names the gap and leaves the rating alone.",
      rule: "Harvest standard · CANS", fix: null,
    }];
  }),

  check("cans-danger-text", "Danger rating matches the narrative", M.consistency, ["assessment"], "medium", (ctx) => {
    const said = CANS_DOMAINS.map((d) => d.narrative).some((k) => /\b(?:hits?|hitting|shov\w+|push\w*|aggress\w*|fight\w*)\b/i.test(txt(ctx, k)));
    if (!said || rating(ctx, "r_danger") !== 0) return [];
    return [{
      severity: "medium", fieldKey: "r_danger", title: "The narrative describes hitting or shoving, but Danger to Others is rated 0",
      why: "The rating and the narrative disagree. The rating is the clinician’s judgement; Psyflo only names the gap.", rule: "Harvest standard · CANS", fix: null,
    }];
  }),

  check("cans-strengths", "Strengths are written", M.completeness, ["assessment"], "low", (ctx) => !blank(ctx, "n_strengths") ? [] : [{
    severity: "low", fieldKey: "n_strengths", title: "The strengths narrative is empty",
    why: "The CANS is a needs and strengths tool. Write what the child does well and who helps.", rule: "Harvest standard · CANS",
    fix: ask(`What is ${ini(ctx)} good at, and who helps?`, "replace", (a) => a, "In the guardian’s words or yours"),
  }]),
];

/* =============================== Continued stay request (SRA) =============================== */
const sraChecks: Check[] = [
  check("sra-dates", "Request dates are in order", M.billing, ["sra"], "medium", (ctx) => {
    const a = usDateMs(txt(ctx, "from"));
    const b = usDateMs(txt(ctx, "to"));
    if (a !== null && b !== null && b > a) return [];
    return [{
      severity: "medium", fieldKey: a === null ? "from" : "to",
      title: a === null || b === null ? "A request date is blank" : "The request ends before it starts",
      why: "The payer reads the period first. Both dates are the clinician’s request, so Psyflo does not type them.", rule: "DMAS continued-stay form · request", fix: null,
    }];
  }),

  check("sra-units-hours", "Units, hours and code are stated", M.billing, ["sra"], "medium", (ctx) => {
    const out: RawFinding[] = [];
    if (blank(ctx, "units")) out.push({ severity: "medium", fieldKey: "units", title: "Total units of service is blank", why: "The request has to say how many units it asks for.", rule: "DMAS continued-stay form · request", fix: null });
    if (blank(ctx, "hours")) out.push({ severity: "medium", fieldKey: "hours", title: "Hours of service per week is blank", why: "The request has to say the weekly hours.", rule: "DMAS continued-stay form · request", fix: null });
    if (!/H2016/i.test(txt(ctx, "proc"))) out.push({ severity: "medium", fieldKey: "proc", title: "The procedure code does not show H2016", why: "TDT school day bills under H2016. Psyflo does not type a billing code.", rule: "DMAS continued-stay form · request", fix: null });
    return out;
  }),

  check("sra-avg", "Average units per week is stated", M.billing, ["sra"], "medium", (ctx) => /\d/.test(txt(ctx, "avg")) ? [] : [{
    severity: "medium", fieldKey: "avg", title: "Average units per week is blank",
    why: "The form asks for the average from the direct-hours log. It shows the pace behind the number of units requested.",
    rule: "DMAS continued-stay form · request",
    fix: quote(ctx, "hours-log", "Average 14.6 units a week since Aug 18.", "replace"),
  }]),

  check("sra-coord", "Care coordination names dates", M.completeness, ["sra"], "medium", (ctx) => !blank(ctx, "coord") && DATE_RE.test(txt(ctx, "coord")) ? [] : [{
    severity: "medium", fieldKey: "coord", title: blank(ctx, "coord") ? "Care coordination is blank" : "Care coordination has no dates",
    why: "The form asks for care coordination since the last authorization. Contacts with dates can be checked.", rule: "DMAS continued-stay form · Section I",
    fix: quote(ctx, "collateral-oct1", "School counselor: 4 office referrals in September; IEP review set for Nov 4. Pediatrician: no medication change. Earlier contacts Aug 29 and Sep 3.", "append"),
  }]),

  check("sra-lack", "Lack of progress is stated", M.medical, ["sra"], "severe", (ctx) => {
    const t = txt(ctx, "g1_lack");
    if (LACK_RE.test(t)) return [];
    return [{
      severity: "severe", fieldKey: "g1_lack",
      title: t ? "The lack-of-progress box states progress only" : "The lack-of-progress box is empty",
      why: "A continued stay has to show where progress fell short, with dates. A box that says only “doing better” reads as a request that is no longer needed.",
      rule: sampleRule(ctx, "continued stay"),
      fix: quote(ctx, "notes-30d", "Two escalations ended in physical aggression or elopement: a shove at lunch on Oct 21 and an elopement from the building to the parking lot on Oct 6, followed by 1 day of in-school suspension.", "append"),
    }];
  }),

  check("sra-progress-counts", "Progress is measured with counts", M.medical, ["sra"], "medium", (ctx) => OF_RE.test(txt(ctx, "g1_progress")) ? [] : [{
    severity: "medium", fieldKey: "g1_progress",
    title: blank(ctx, "g1_progress") ? "Progress toward Goal 1 is blank" : "Progress toward Goal 1 has no counts",
    why: "The goal is a count (“4 of 5”), so progress has to be one too. The daily notes have the counts; “doing better” cannot be checked.",
    rule: sampleRule(ctx, "continued stay"),
    fix: quote(ctx, "notes-30d", "Taught strategy used first in 3 of 5 escalations in the last 30 days, up from 1 of 6 in the prior period.", "append"),
  }]),

  check("sra-isp-change-date", "A plan change has a date", M.golden, ["sra"], "medium", (ctx) => {
    for (const key of ["g1_lack", "g1_progress"]) {
      const t = txt(ctx, key);
      if (/ISP amendment dated/i.test(t)) continue;
      const undated = sentences(t).some((s) => CHANGE_RE.test(s) && !DATE_RE.test(s));
      if (!undated) continue;
      const rec = ctx.chart("isp-oct22");
      return [{
        severity: "medium", fieldKey: key, title: "The change to the plan has no date",
        why: "The form asks what changed in the plan and when. An undated change cannot be checked against the notes" + (rec ? `, and the plan in Lauris has no dated amendment for it (${rec.label}).` : "."),
        rule: "DMAS continued-stay form · Section II",
        fix: ask("On what date did the team change the plan?", "append", (a) => `ISP amendment dated ${a.replace(/[.\s]+$/, "")}.`, "Month day, year", rec?.label),
      }];
    }
    return [];
  }),

  check("sra-stepdown", "Step-down criteria are written", M.medical, ["sra"], "medium", (ctx) => /step-down criteria|criteria for (?:step|discharge)/i.test(txt(ctx, "discharge")) ? [] : [{
    severity: "medium", fieldKey: "discharge", title: "The discharge plan has no step-down criteria",
    why: "The plan names a step-down service, but not what has to be true to step down. The plan in Lauris has none written either, so this box is the only place a reviewer would look.",
    rule: "DMAS continued-stay form · Section III",
    fix: ask(`What has to be true for ${ini(ctx)} to step down?`, "append", (a) => `Step-down criteria: ${a.replace(/[.\s]+$/, "")}.`, "In your words", ctx.chart("isp-review")?.label),
  }]),

  check("sra-family", "Family involvement carries a count", M.completeness, ["sra"], "low", (ctx) => OF_RE.test(txt(ctx, "family")) ? [] : [{
    severity: blank(ctx, "family") ? "medium" : "low", fieldKey: "family",
    title: blank(ctx, "family") ? "Family involvement is blank" : "Family involvement has no count",
    why: "The form asks who was involved and how much. Calls joined out of calls held is a count a reviewer can check.", rule: "DMAS continued-stay form · Section II",
    fix: quote(ctx, "guardian-weekly", "The grandmother (guardian) joined 11 of 12 weekly calls since Aug 18 and practices the calm-down corner at home.", "append"),
  }]),

  check("sra-household", "Household detail is decided", M.completeness, ["sra"], "medium", (ctx) => {
    const rec = ctx.chart("guardian-oct16");
    if (!rec || !blank(ctx, "household")) return [];
    return [{
      severity: "medium", fieldKey: "household", title: "A household detail from the Oct 16 guardian call needs your decision",
      why: `The “${rec.label}” note holds a household detail, held out of the request. The Oct 21 incident came five days after that call. It is the guardian’s story, and a plan keeps what it receives. Only you decide what a plan sees about a family.`,
      rule: "Harvest standard · family information",
      fix: { kind: "choose", prompt: "Does the household detail go in this request?", options: [HOUSEHOLD_INCLUDE, HOUSEHOLD_LEAVE_OUT], source: rec.label },
    }];
  }),

  check("sra-observed-note", "Cited notes do not say “observed”", M.wording, ["sra"], "medium", (ctx) => {
    const flagged = ctx.consumer.chart.filter((r) => r.kind === "note" && r.date >= "2026-08-18" && OBSERVED_RE.test(r.text) && !txt(ctx, "notes").includes(r.label));
    return flagged.map((r): RawFinding => {
      const author = /^([A-Z]\. [A-Za-z]+) · /.exec(r.text)?.[1] ?? "staff";
      return {
        severity: "medium", fieldKey: "notes", title: `${r.label} says “observed”, which describes watching, not treatment`,
        why: "Auditors for the plan read the daily notes a request cites. “Observed” can void the unit for that day, and the request’s wording has to match the corrected note.",
        rule: "Harvest standard · wording",
        fix: ask(`Say what staff did on ${r.label.replace("Daily note ", "")}, in one sentence`, "append",
          (a) => `${r.label} (${author}): the narrative should read “${a.replace(/[.\s]+$/, "")}.”`, "e.g. Worked with the client during … using …", r.label),
      };
    });
  }),
];

/* A check can serve several kinds of document (the shared ones above). Each id appears once. */
const all = [...dpnChecks, ...admissionChecks, ...intakeChecks, ...cansChecks, ...sraChecks];
export const checks: Check[] = all.filter((c, i) => all.findIndex((x) => x.id === c.id) === i);
