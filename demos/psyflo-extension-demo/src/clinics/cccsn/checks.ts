import type { Check, Fix, RawFinding, ScanCtx } from "../../types";
import { asText, fieldByKey, usDate } from "../../engine";
import { DIMENSIONS, REQUESTS, SUBSTANCES } from "./forms";

/* The audit checks. Each `run` is pure: it reads the document's values, the consumer and the chart, and returns nothing when the document passes.
   Fix rules: "text" quotes a chart record word for word; "ask" and "choose" put only the clinician's own words or pick into the field;
   a finding only the clinician can settle has `fix: null`. */

const RULE_DPN = "CCCSN standard · progress note";
const RULE_WORDING = "CCCSN wording rule · say what staff did, not what staff saw";
const RULE_ADM = "CCCSN standard · admission screening";
const RULE_ASAM = "CCCSN standard · ASAM assessment";
const RULE_SRA = "CCCSN standard · continued stay request (sample)";
const RULE_BILLING = "CCCSN billing note · Level 2.1 IOP";
const RULE_SILVERSUMMIT = "CCCSN payer note · SilverSummit (sample)";
const RULE_MOLINA = "CCCSN payer note · Molina (sample)";
const RULE_PART2 = "42 CFR Part 2 · release before sharing";

/* ------------------------------- helpers ------------------------------- */

const val = (ctx: ScanCtx, key: string): string => asText(ctx.doc.values[key]).trim();
const ticked = (ctx: ScanCtx, key: string): string[] => {
  const x = ctx.doc.values[key];
  return Array.isArray(x) ? x : [];
};

interface PlanGoal { id: string; label: string; codes: string[] }
/** The treatment plan goals in the chart: "Goal 1 – D5 relapse prevention: … Interventions: CBT-RP, RP-G." */
const planGoals = (ctx: ScanCtx): PlanGoal[] =>
  ctx.consumer.chart
    .filter((r) => r.kind === "plan" && r.id.startsWith("plan-"))
    .map((r) => ({
      id: r.id,
      label: r.text.split(":")[0].trim(),
      codes: (/Interventions:\s*([^.]*)\./.exec(r.text)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    }));

/** The checkbox text for an intervention code ("CBT-RP" → "CBT-RP Relapse prevention (CBT)"). */
const interventionOption = (ctx: ScanCtx, code: string): string | undefined =>
  (fieldByKey(ctx.spec, "ints")?.options ?? []).find((o) => o.split(" ")[0] === code);

/** A sentence from a chart record, word for word. */
const quote = (ctx: ScanCtx, id: string, re: RegExp): { text: string; source: string } | null => {
  const r = ctx.chart(id);
  const m = r ? re.exec(r.text) : null;
  return r && m ? { text: m[0], source: r.label } : null;
};

const fromChart = (q: { text: string; source: string }, mode: "replace" | "append" = "replace"): Fix => ({ kind: "text", text: q.text, source: q.source, mode });

const toMinutes = (h: string, m: string | undefined, ap: string): number => {
  let hh = parseInt(h, 10) % 12;
  if (ap.toLowerCase() === "pm") hh += 12;
  return hh * 60 + (m ? parseInt(m, 10) : 0);
};
/** "9:00 am – 12:00 pm" → 3. Null when the time cannot be read. */
export const hoursIn = (time: string): number | null => {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:–|-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(time);
  if (!m) return null;
  let s = toMinutes(m[1], m[2], m[3] ?? m[6]);
  const e = toMinutes(m[4], m[5], m[6]);
  if (!m[3] && s > e) s -= 12 * 60;
  return e > s ? (e - s) / 60 : null;
};

const isIop = (ctx: ScanCtx): boolean => val(ctx, "service").startsWith("H0015");
const WATCHING = /\b(observ(?:ed|es|ing)|watch(?:ed|es|ing))\b/i;
const PERCENT = /\b\d{1,3}\s?%/;

/* ------------------------------ progress note ------------------------------ */

const dpnGoalNamed: Check = {
  id: "dpn-goal-named", title: "A plan goal is named", module: "Golden thread", docs: ["dpn"], severity: "medium",
  run: (ctx) => {
    if (val(ctx, "goal")) return [];
    const goals = planGoals(ctx);
    return [{
      severity: "medium", fieldKey: "goal", title: "No treatment plan goal is named",
      why: "A note that does not name the goal it works on cannot be tied back to the plan, and a reviewer cannot see why the service was needed.",
      rule: RULE_DPN,
      fix: goals.length ? { kind: "choose", prompt: `Which goal on ${ctx.consumer.ini}'s treatment plan did this session work on?`, options: goals.map((g) => g.label) } : null,
    }];
  },
};

const dpnGoalMatch: Check = {
  id: "dpn-goal-match", title: "The goal named is on the plan", module: "Consistency", docs: ["dpn"], severity: "medium",
  run: (ctx) => {
    const g = val(ctx, "goal");
    const goals = planGoals(ctx);
    if (!g || !goals.length || goals.some((x) => g === x.label || g.startsWith(x.label))) return [];
    return [{
      severity: "medium", fieldKey: "goal", title: "The goal named is not on the treatment plan",
      why: "The goal in the note has to be one of the goals in the saved plan, word for word, or the note and the plan do not connect.",
      rule: RULE_DPN,
      fix: { kind: "choose", prompt: `Which goal on ${ctx.consumer.ini}'s treatment plan did this session work on?`, options: goals.map((x) => x.label) },
    }];
  },
};

const dpnIntsTicked: Check = {
  id: "dpn-ints-ticked", title: "An intervention from the plan is ticked", module: "Golden thread", docs: ["dpn"], severity: "medium",
  run: (ctx) => {
    if (ticked(ctx, "ints").length) return [];
    const codes = [...new Set(planGoals(ctx).flatMap((g) => g.codes))];
    const options = codes.map((c) => interventionOption(ctx, c)).filter((o): o is string => !!o);
    return [{
      severity: "medium", fieldKey: "ints", title: "No intervention is ticked",
      why: "The note has to show which intervention from the clinic's list staff used. The interventions come from the treatment plan.",
      rule: RULE_DPN,
      fix: options.length ? { kind: "choose", prompt: "Which intervention from the plan did staff use? Tick more in Lauris if staff used several.", options } : null,
    }];
  },
};

const dpnIntsPlan: Check = {
  id: "dpn-ints-plan", title: "Ticked interventions are on the plan", module: "Golden thread", docs: ["dpn"], severity: "medium",
  run: (ctx) => {
    const goals = planGoals(ctx);
    if (!goals.length) return [];
    const onPlan = new Set(goals.flatMap((g) => g.codes));
    return ticked(ctx, "ints")
      .filter((o) => !onPlan.has(o.split(" ")[0]))
      .map((o): RawFinding => ({
        severity: "medium", fieldKey: "ints", title: `${o.split(" ")[0]} is not on the treatment plan`,
        why: "An intervention that is not on the plan is not covered by the plan's goals. Either the plan needs the intervention added, or the note needs a different one. The clinician decides which.",
        rule: RULE_DPN, fix: null,
      }));
  },
};

const dpnInterventionText: Check = {
  id: "dpn-intervention-text", title: "The intervention is described", module: "Completeness", docs: ["dpn"], severity: "medium",
  run: (ctx) => (val(ctx, "intervention") ? [] : [{
    severity: "medium", fieldKey: "intervention", title: "The intervention box is empty",
    why: "The ticked interventions say what was used. The box says what staff did with it, which is what a reviewer reads.",
    rule: RULE_DPN,
    fix: { kind: "ask", prompt: "What did staff do in the session? Write it as an action, for example led or practiced.", placeholder: "Staff led … / practiced …", mode: "replace", frame: (a) => `Intervention: ${a}` },
  }]),
};

const dpnObserved: Check = {
  id: "dpn-wording-observed", title: "No \"observed\" wording", module: "Wording", docs: ["dpn"], severity: "severe",
  run: (ctx) => (WATCHING.test(val(ctx, "intervention")) ? [{
    severity: "severe", fieldKey: "intervention", title: "\"Observed\" describes watching, not treatment",
    why: "A note that says staff observed does not show a service was delivered. A reviewer can return the note, and an auditor can void the unit. Say what staff did.",
    rule: RULE_WORDING,
    fix: { kind: "ask", prompt: "What did staff do in the session? Write it as an action, for example led or practiced.", placeholder: "Staff led … / practiced …", mode: "replace", frame: (a) => `Intervention: ${a}` },
  }] : []),
};

const dpnPercent: Check = {
  id: "dpn-wording-percent", title: "Progress is a count, not a percentage", module: "Wording", docs: ["dpn"], severity: "low",
  run: (ctx) => ["intervention", "response", "checkin"].filter((k) => PERCENT.test(val(ctx, k))).map((k): RawFinding => ({
    severity: "low", fieldKey: k, title: "Progress is written as a percentage",
    why: "The clinic writes progress as a count out of a total, so a reviewer can check it against the plan.",
    rule: "CCCSN wording rule · counts, not percentages",
    fix: { kind: "ask", prompt: "Rewrite the sentence with a count, for example 2 of 3 exercises.", placeholder: "Participated in … of … exercises", mode: "replace", frame: (a) => a },
  })),
};

const dpnResponse: Check = {
  id: "dpn-response", title: "The client's response is recorded", module: "Medical necessity", docs: ["dpn"], severity: "medium",
  run: (ctx) => (val(ctx, "response") ? [] : [{
    severity: "medium", fieldKey: "response", title: "What the client said or did is missing",
    why: "A note that says only what staff did does not show how the client responded. The clinic asks for both.",
    rule: RULE_DPN,
    fix: { kind: "ask", prompt: `What did ${ctx.consumer.ini} say or do in the session?`, placeholder: "In your words", mode: "replace", frame: (a) => `Client response: ${a}` },
  }]),
};

const dpnTime: Check = {
  id: "dpn-time", title: "Time in session is stated", module: "Completeness", docs: ["dpn"], severity: "medium",
  run: (ctx) => (val(ctx, "time") ? [] : [{
    severity: "medium", fieldKey: "time", title: "Time in session is blank",
    why: "The units on the note are counted from the time in session, so a note without the time cannot be billed.",
    rule: RULE_BILLING,
    fix: { kind: "ask", prompt: "What time did the session run?", placeholder: "For example 9:00 am – 12:00 pm", mode: "replace", frame: (a) => a },
  }]),
};

const dpnUnits: Check = {
  id: "dpn-billing-units", title: "Units are stated and match the time", module: "Billing", docs: ["dpn"], severity: "medium",
  run: (ctx) => {
    if (!isIop(ctx)) return [];
    const units = val(ctx, "units");
    if (!units) {
      return [{
        severity: "medium", fieldKey: "units", title: "Units are blank",
        why: "H0015 is billed at 1 unit for each hour, and a note without units cannot go to billing.",
        rule: RULE_BILLING,
        fix: { kind: "ask", prompt: "How many units does this note bill? H0015 is 1 unit for each hour.", placeholder: "For example 3", mode: "replace", frame: (a) => a.trim() },
      }];
    }
    const hours = hoursIn(val(ctx, "time"));
    const n = parseFloat(units);
    if (hours === null || !Number.isFinite(n) || Math.abs(n - hours) < 1) return [];
    return [{
      severity: "medium", fieldKey: "units", title: "Units do not match the time",
      why: "H0015 is billed at 1 unit for each hour. When the units and the time disagree, the claim can be denied or the unit voided in an audit.",
      rule: RULE_BILLING,
      fix: { kind: "ask", prompt: `The time reads ${hours} hours and H0015 is 1 unit for each hour. How many units does this note bill?`, placeholder: "For example 3", mode: "replace", frame: (a) => a.trim() },
    }];
  },
};

const dpnBillingAuth: Check = {
  id: "dpn-billing-auth", title: "The authorization covers the units", module: "Billing", docs: ["dpn"], severity: "severe",
  run: (ctx) => {
    if (ctx.consumer.program !== "IOP 2.1" || !isIop(ctx)) return [];
    const u = ctx.consumer.units;
    if (!u) {
      return [{
        severity: "severe", fieldKey: "service", title: "No authorization is on file for this IOP day",
        why: "Level 2.1 needs an authorization request from the assessment day and cannot be backdated, so a day without one cannot be billed. Billing and the clinician decide what to do.",
        rule: RULE_BILLING, fix: null,
      }];
    }
    const billed = parseFloat(val(ctx, "units"));
    if (Number.isFinite(billed) && billed > u.left) {
      return [{
        severity: "severe", fieldKey: "units", title: "The note bills more units than are left",
        why: `The authorization has ${u.left} units left and ends ${u.ends}. Units past the authorization cannot be billed.`,
        rule: RULE_BILLING, fix: null,
      }];
    }
    return [];
  },
};

const dpnPlanNext: Check = {
  id: "dpn-plan-next", title: "Plan / next steps is stated", module: "Completeness", docs: ["dpn"], severity: "medium",
  run: (ctx) => (val(ctx, "plan") ? [] : [{
    severity: "medium", fieldKey: "plan", title: "Plan / next steps is blank",
    why: "A note that does not say what comes next reads as unfinished, and the next session has nothing to pick up from.",
    rule: RULE_DPN,
    fix: { kind: "ask", prompt: `What is the plan for ${ctx.consumer.ini}'s next steps?`, placeholder: "In your words", mode: "replace", frame: (a) => `Next steps: ${a}` },
  }]),
};

const dpnUdsConsistency: Check = {
  id: "dpn-uds-consistency", title: "The UDS box matches the text", module: "Consistency", docs: ["dpn"], severity: "low",
  run: (ctx) => {
    const mentioned = ["intervention", "response", "checkin"].some((k) => /\b(UDS|urine)\b/i.test(val(ctx, k)));
    if (!mentioned || val(ctx, "uds")) return [];
    return [{
      severity: "low", fieldKey: "uds", title: "The note mentions a urine screen but the UDS box is not answered",
      why: "The UDS box feeds the continued stay request. It has to agree with what the note says.",
      rule: RULE_DPN,
      fix: { kind: "choose", prompt: "Was a UDS collected in this session?", options: ["Yes", "No"] },
    }];
  },
};

/* ------------------------------ admission screening ------------------------------ */

const ADM_BOXES = [
  { key: "withdrawal", dim: "D1", label: "withdrawal risk", ask: "What did the client say about withdrawal: last use, shakes or sweats, seizures or DTs?" },
  { key: "meds", dim: "D2", label: "medications and prescriber", ask: "What medications does the client take, and who prescribes them?" },
  { key: "mh", dim: "D3", label: "mental health and safety", ask: "What did the client say about mood, sleep and thoughts of self-harm?" },
  { key: "reason", dim: "D4", label: "reason for treatment", ask: "Why does the client say they are seeking treatment? Use their words." },
  { key: "prior", dim: "D5", label: "prior treatment", ask: "What treatment has the client had before: provider, level, dates, outcome?" },
  { key: "housing", dim: "D6", label: "living situation", ask: "Where is the client staying, and who supports them?" },
];

const admDimensionBoxes: Check = {
  id: "adm-dimension-boxes", title: "Each dimension has what it needs", module: "ASAM dimensions", docs: ["admission"], severity: "medium",
  run: (ctx) => ADM_BOXES.filter((b) => !val(ctx, b.key)).map((b): RawFinding => ({
    severity: "medium", fieldKey: b.key, title: `${b.dim} · ${b.label} is blank`,
    why: "The ASAM assessment and any later request start from this screening. A dimension with nothing in it has to be asked again.",
    rule: RULE_ADM,
    fix: { kind: "ask", prompt: b.ask, placeholder: "The client's answer, in your words", mode: "replace", frame: (a) => a },
  })),
};

const SUB_WORDS: Record<string, { name: string; re: RegExp }> = {
  [SUBSTANCES[0]]: { name: "Opioids", re: /opioid|fentanyl|heroin|pills?\b|oxycodone/i },
  [SUBSTANCES[1]]: { name: "Alcohol", re: /alcohol|beer|wine|liquor|drink/i },
  [SUBSTANCES[2]]: { name: "Stimulants", re: /stimulant|meth|cocaine|amphetamine/i },
  [SUBSTANCES[3]]: { name: "Cannabis", re: /cannabis|marijuana|weed|thc/i },
  [SUBSTANCES[4]]: { name: "Benzodiazepines", re: /benzo|sedative|xanax|valium|clonazepam/i },
};

const admSubstances: Check = {
  id: "adm-substances", title: "Ticked substances are described", module: "Consistency", docs: ["admission"], severity: "medium",
  run: (ctx) => {
    const subs = ticked(ctx, "subs");
    const use = val(ctx, "use");
    const out: RawFinding[] = [];
    if (!subs.length) {
      out.push({
        severity: "medium", fieldKey: "subs", title: "No substance is ticked",
        why: "The substances ticked drive the withdrawal questions and the level-of-care discussion. Tick what the client reported.",
        rule: RULE_ADM,
        fix: { kind: "choose", prompt: "Which substance did the client report? Tick more in Lauris if there are several.", options: SUBSTANCES },
      });
    }
    for (const s of subs) {
      const w = SUB_WORDS[s];
      if (!w || w.re.test(use)) continue;
      out.push({
        severity: "medium", fieldKey: "use", title: `${w.name} is ticked but not described`,
        why: "Each ticked substance needs its last use, route, how often and how much, so the assessor does not have to ask again.",
        rule: RULE_ADM,
        fix: { kind: "ask", prompt: `What did the client say about ${w.name.toLowerCase()}: last use, route, how often, how much?`, placeholder: "The client's answer, in your words", mode: "append", frame: (a) => `${w.name}: ${a}` },
      });
    }
    return out;
  },
};

const admRelease: Check = {
  id: "adm-release", title: "A Part 2 release is recorded", module: "Completeness", docs: ["admission"], severity: "medium",
  run: (ctx) => {
    const shared = val(ctx, "partner") || /court|P&P/i.test(val(ctx, "source"));
    if (!shared || val(ctx, "release")) return [];
    return [{
      severity: "medium", fieldKey: "release", title: "No Part 2 release is recorded for the referral partner",
      why: "Substance use treatment records are shared with a court, P&P or a prescriber only with a signed release. Record whether one is on file.",
      rule: RULE_PART2,
      fix: { kind: "choose", prompt: "Is a signed 42 CFR Part 2 release on file for the referral partner?", options: ["Yes", "No"] },
    }];
  },
};

const admDecision: Check = {
  id: "adm-decision", title: "The admission decision is recorded", module: "Completeness", docs: ["admission"], severity: "medium",
  run: (ctx) => {
    const out: RawFinding[] = [];
    if (!val(ctx, "meets")) {
      out.push({
        severity: "medium", fieldKey: "meets", title: "\"Meets admission criteria?\" is not answered",
        why: "This is the clinician's decision. Psyflo does not draft it and does not type it; it can only tell you it is blank.",
        rule: RULE_ADM, fix: null,
      });
    }
    if (!val(ctx, "dx")) {
      out.push({
        severity: "medium", fieldKey: "dx", title: "Preliminary diagnosis is blank",
        why: "The diagnosis is the clinician's decision. Psyflo does not draft it and does not type it; it can only tell you it is blank.",
        rule: RULE_ADM, fix: null,
      });
    }
    return out;
  },
};

/* ------------------------------ ASAM assessment ------------------------------ */

const rating = (ctx: ScanCtx, i: number): number | null => {
  const r = val(ctx, `d${i}r`);
  return r === "" ? null : parseInt(r, 10);
};
const LOW_RISK = /\b(?:no (?:current |active )?(?:concerns?|risk|problems?)|low risk|minimal risk|not at risk)\b|(?<!not )\bstable\b/i;
const HIGH_RISK = /\b(?:high risk|severe|unstable|imminent|acute|serious|significant risk)\b/i;

const asamRatingMissing: Check = {
  id: "asam-rating-missing", title: "Every dimension has a risk rating", module: "ASAM dimensions", docs: ["assessment"], severity: "medium",
  run: (ctx) => DIMENSIONS.flatMap(([d], k) => (rating(ctx, k + 1) === null ? [{
    severity: "medium" as const, fieldKey: `d${k + 1}r`, title: `${d} has no risk rating`,
    why: "The rating is the assessor's judgement. Psyflo does not draft or type it; it can only tell you the dimension has none.",
    rule: RULE_ASAM, fix: null,
  }] : [])),
};

const asamRationaleHigh: Check = {
  id: "asam-rationale-high", title: "A rating of 3 or 4 has a rationale", module: "ASAM dimensions", docs: ["assessment"], severity: "medium",
  run: (ctx) => DIMENSIONS.flatMap(([d], k) => {
    const r = rating(ctx, k + 1);
    if (r === null || r < 3 || val(ctx, `d${k + 1}n`)) return [];
    return [{
      severity: "medium" as const, fieldKey: `d${k + 1}n`, title: `${d} is rated ${r} and has no rationale`,
      why: "A high rating with no words behind it is the first thing a plan reviewer questions, and the level of care rests on it.",
      rule: RULE_ASAM,
      fix: { kind: "ask" as const, prompt: `Why is ${d} rated ${r}? Write the reason in your words.`, placeholder: "In your words", mode: "replace" as const, frame: (a: string) => `Risk rated ${r}: ${a}` },
    }];
  }),
};

const asamRationaleEmpty: Check = {
  id: "asam-rationale-empty", title: "Every dimension has a rationale", module: "ASAM dimensions", docs: ["assessment"], severity: "low",
  run: (ctx) => DIMENSIONS.flatMap(([d], k) => {
    const r = rating(ctx, k + 1);
    if (r === null || r >= 3 || val(ctx, `d${k + 1}n`)) return [];
    return [{
      severity: "low" as const, fieldKey: `d${k + 1}n`, title: `${d} has a rating and no rationale`,
      why: "The clinic asks for words behind every rating, even a low one, so the next reader can see it was assessed and not skipped.",
      rule: RULE_ASAM,
      fix: { kind: "ask" as const, prompt: `What supports the ${d} rating of ${r}? Write it in your words.`, placeholder: "In your words", mode: "replace" as const, frame: (a: string) => `Risk rated ${r}: ${a}` },
    }];
  }),
};

const asamContradiction: Check = {
  id: "asam-contradiction", title: "The rationale agrees with the rating", module: "ASAM dimensions", docs: ["assessment"], severity: "severe",
  run: (ctx) => DIMENSIONS.flatMap(([d], k) => {
    const r = rating(ctx, k + 1);
    const words = val(ctx, `d${k + 1}n`);
    if (r === null || !words) return [];
    const clash = (r >= 3 && LOW_RISK.test(words)) || (r <= 1 && HIGH_RISK.test(words));
    return clash ? [{
      severity: "severe" as const, fieldKey: `d${k + 1}n`, title: `${d}: the words do not match the rating of ${r}`,
      why: "The rationale and the rating point in different directions. Either the rating or the words are wrong, and only the assessor can say which. Psyflo does not change either.",
      rule: RULE_ASAM, fix: null,
    }] : [];
  }),
};

const asamUds: Check = {
  id: "asam-uds-silversummit", title: "The UDS at assessment is recorded", module: "Billing", docs: ["assessment"], severity: "medium",
  run: (ctx) => (ctx.consumer.payer === "silversummit" && !val(ctx, "uds") ? [{
    severity: "medium", fieldKey: "uds", title: "UDS at assessment is blank",
    why: "In the clinic's experience SilverSummit denies Level 2.1 initial requests that do not carry the urine drug screen result from the assessment day. The plan does not pay for the test and it is not on the plan's form.",
    rule: RULE_SILVERSUMMIT,
    fix: { kind: "ask", prompt: "What did the urine drug screen at the assessment show? Write the result as it is on the lab slip.", placeholder: "Result, in the lab's words", mode: "replace", frame: (a) => `${usDate(ctx.clinic.today)} · ${a}` },
  }] : []),
};

const asamLoc: Check = {
  id: "asam-loc", title: "A level of care is recommended", module: "Completeness", docs: ["assessment"], severity: "medium",
  run: (ctx) => (val(ctx, "loc") ? [] : [{
    severity: "medium", fieldKey: "loc", title: "Level-of-care recommendation is blank",
    why: "The recommendation is the clinician's decision. Psyflo does not draft it and does not type it; it can only tell you it is blank.",
    rule: RULE_ASAM, fix: null,
  }]),
};

/* ------------------------------ continued stay request ------------------------------ */

const SRA_TEXT_BOXES = ["attendance", "uds", "dims", "d5", "stepdown", "coord", "barriers"];
const ATTENDANCE_QUOTE = /\d+ IOP days attended[^.]*\./;
const UDS_QUOTE = /\d+ of \d+ UDS negative since [A-Za-z]+ \d+\./;
const DIMS_QUOTE = /D3:[\s\S]*$/;

const sraRequest: Check = {
  id: "sra-request", title: "The request is chosen", module: "Completeness", docs: ["sra"], severity: "medium",
  run: (ctx) => (val(ctx, "request") ? [] : [{
    severity: "medium", fieldKey: "request", title: "The request is not chosen",
    why: "The plan decides what to authorize from what is asked for. A request with no choice made is returned for more information.",
    rule: RULE_SRA,
    fix: { kind: "choose", prompt: "What is being requested?", options: REQUESTS },
  }]),
};

const sraAttendance: Check = {
  id: "sra-attendance", title: "Attendance is stated with dates", module: "Medical necessity", docs: ["sra"], severity: "medium",
  run: (ctx) => {
    if (val(ctx, "attendance")) return [];
    const q = quote(ctx, "att", ATTENDANCE_QUOTE);
    return [{
      severity: "medium", fieldKey: "attendance", title: "The attendance box is empty",
      why: "A continued stay request is read against attendance. The chart already has the count and the dates; a request without them looks unsupported.",
      rule: RULE_SRA,
      fix: q ? fromChart(q) : { kind: "ask", prompt: "How many IOP days has the client attended, and over which dates?", placeholder: "Count and dates", mode: "replace", frame: (a) => a },
    }];
  },
};

const sraAttendanceCount: Check = {
  id: "sra-attendance-count", title: "The attendance count matches the chart", module: "Consistency", docs: ["sra"], severity: "medium",
  run: (ctx) => {
    const typed = /(\d+)\s+(?:IOP\s+)?days?/i.exec(val(ctx, "attendance"));
    const q = quote(ctx, "att", ATTENDANCE_QUOTE);
    const stored = q ? /(\d+)\s+(?:IOP\s+)?days?/i.exec(q.text) : null;
    if (!typed || !stored || !q || typed[1] === stored[1]) return [];
    return [{
      severity: "medium", fieldKey: "attendance", title: "The attendance count does not match the chart",
      why: `The box says ${typed[1]} IOP days and the chart says ${stored[1]}. A plan that checks the count against the notes will question the rest of the request.`,
      rule: RULE_SRA, fix: fromChart(q),
    }];
  },
};

const sraUds: Check = {
  id: "sra-uds", title: "UDS results are stated with dates", module: "Medical necessity", docs: ["sra"], severity: "severe",
  run: (ctx) => {
    if (val(ctx, "uds")) return [];
    const q = quote(ctx, "uds", UDS_QUOTE);
    return [{
      severity: "severe", fieldKey: "uds", title: "The UDS results box is empty",
      why: "For a client who is abstinent in treatment, the UDS results are the evidence. Plans have denied continued stay when the request does not show them with dates.",
      rule: RULE_SRA,
      fix: q ? fromChart(q) : { kind: "ask", prompt: "What do the UDS results in treatment show, and from when?", placeholder: "Results and dates", mode: "replace", frame: (a) => a },
    }];
  },
};

const sraDims: Check = {
  id: "sra-dims", title: "Changes are given by dimension", module: "ASAM dimensions", docs: ["sra"], severity: "medium",
  run: (ctx) => {
    if (val(ctx, "dims")) return [];
    const q = quote(ctx, "dims", DIMS_QUOTE);
    return [{
      severity: "medium", fieldKey: "dims", title: "The dimension changes box is empty",
      why: "The clinic organises a continued stay request by ASAM dimension. The chart has a review with the change by dimension; the request should carry it.",
      rule: RULE_SRA,
      fix: q ? fromChart(q) : { kind: "ask", prompt: "What has changed in each dimension since admission?", placeholder: "By dimension", mode: "replace", frame: (a) => a },
    }];
  },
};

const sraD5: Check = {
  id: "sra-d5", title: "D5 says why Level 2.1 is still needed", module: "Medical necessity", docs: ["sra"], severity: "severe",
  run: (ctx) => (val(ctx, "d5") ? [] : [{
    severity: "severe", fieldKey: "d5", title: "The D5 box is empty",
    why: "D5 is where the request argues medical necessity. A continued stay request with nothing here is denied.",
    rule: RULE_SRA,
    fix: { kind: "ask", prompt: `Why does ${ctx.consumer.ini} still need Level 2.1? Say it in your words, with dates.`, placeholder: "In your words, with dates", mode: "replace", frame: (a) => a },
  }]),
};

const sraAbstinent: Check = {
  id: "sra-abstinent", title: "Abstinence is tied to the structure", module: "Medical necessity", docs: ["sra"], severity: "medium",
  run: (ctx) => {
    const d5 = val(ctx, "d5");
    if (!/\b(abstinent|abstinence|sober|clean)\b/i.test(d5) || /\b(structure|without)\b/i.test(d5)) return [];
    return [{
      severity: "medium", fieldKey: "d5", title: "D5 says abstinent but not why Level 2.1 is still needed",
      why: "Plans have denied continued stay as \"abstinent, no longer meets medical necessity\" when D5 stops at the abstinence. The request has to say what the structure is holding up.",
      rule: RULE_MOLINA,
      fix: { kind: "ask", prompt: "What happens without the Level 2.1 structure? Say it in your words.", placeholder: "In your words", mode: "append", frame: (a) => `Without the Level 2.1 structure: ${a}` },
    }];
  },
};

const sraStepdown: Check = {
  id: "sra-stepdown", title: "Step-down readiness is stated", module: "Medical necessity", docs: ["sra"], severity: "medium",
  run: (ctx) => (val(ctx, "stepdown") ? [] : [{
    severity: "medium", fieldKey: "stepdown", title: "The step-down readiness box is empty",
    why: "A plan asks why the client cannot step down to Level 1. The continued-service criteria are the clinician's call, so the box needs the clinician's words.",
    rule: RULE_SRA,
    fix: { kind: "ask", prompt: "Which step-down criteria are met or not met yet, and why? Say it in your words.", placeholder: "In your words", mode: "replace", frame: (a) => `Step-down readiness: ${a}` },
  }]),
};

const sraUnitsRunOut: Check = {
  id: "sra-units-run-out", title: "The units outlast the request", module: "Billing", docs: ["sra"], severity: "low",
  run: (ctx) => {
    const u = ctx.consumer.units;
    if (!u || u.left > 9) return [];
    const days = Math.floor(u.left / 3);
    return [{
      severity: "low", fieldKey: "request", title: `${u.left} units left, about ${days} IOP days`,
      why: `Level 2.1 cannot be backdated. Once the units run out, each IOP day is unbillable until the plan decides, even though the authorization runs to ${u.ends}. When to send is the clinician's call.`,
      rule: RULE_BILLING, fix: null,
    }];
  },
};

const sraMolinaFive: Check = {
  id: "sra-molina-five", title: "The request fits a five-session plan", module: "Billing", docs: ["sra"], severity: "medium",
  run: (ctx) => {
    const req = val(ctx, "request");
    if (ctx.consumer.payer !== "molina" || !req || /5 sessions/.test(req)) return [];
    return [{
      severity: "medium", fieldKey: "request", title: "This plan authorizes five sessions at a time",
      why: "In the clinic's experience Molina authorizes Level 2.1 five sessions (15 units) at a time and offers that against a larger request. Choose the request the clinic means to send.",
      rule: RULE_MOLINA,
      fix: { kind: "choose", prompt: "Which request is being sent?", options: REQUESTS.filter((r) => /5 sessions/.test(r)) },
    }];
  },
};

const sraHiv: Check = {
  id: "sra-wording-hiv", title: "No HIV or hepatitis C status in the request", module: "Wording", docs: ["sra"], severity: "severe",
  run: (ctx) => SRA_TEXT_BOXES.filter((k) => /\b(HIV|HCV|hepatitis)\b/i.test(val(ctx, k))).map((k): RawFinding => ({
    severity: "severe", fieldKey: k, title: "HIV or hepatitis C status is in the request",
    why: "The clinic never writes HIV or hepatitis C status into a request. It is optional at screening and stays out of anything sent to a plan. Only the clinician can take it out.",
    rule: "CCCSN wording rule · optional health information stays out of requests", fix: null,
  })),
};

export const checks: Check[] = [
  dpnGoalNamed, dpnGoalMatch, dpnIntsTicked, dpnIntsPlan, dpnInterventionText, dpnObserved, dpnPercent, dpnResponse, dpnTime, dpnUnits, dpnBillingAuth, dpnPlanNext, dpnUdsConsistency,
  admDimensionBoxes, admSubstances, admRelease, admDecision,
  asamRatingMissing, asamRationaleHigh, asamRationaleEmpty, asamContradiction, asamUds, asamLoc,
  sraRequest, sraAttendance, sraAttendanceCount, sraUds, sraDims, sraD5, sraAbstinent, sraStepdown, sraUnitsRunOut, sraMolinaFive, sraHiv,
];
