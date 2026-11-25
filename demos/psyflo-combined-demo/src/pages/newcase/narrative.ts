/* The medical-necessity summary Scribe drafts, built from what the person entered and answered.
   Each section lists the chart documents it came from; those become the source chips. */
import type { CaseDraft, DocSlotId, NarrativeSection } from "@/data/cases";
import type { Program } from "@/data/types";
import { CHANGE_LABEL } from "./authType";
import type { RecAdd } from "./fromRequest";

const LEVEL_HEADING: Record<Program, string> = {
  RES: "Why a lower level of care is not safe",
  IOP: "Why weekly outpatient care is not enough",
  PHP: "Why a lower level of care is not safe",
  WM: "Why withdrawal needs medical monitoring",
};
const LEVEL_TEXT: Record<Program, string> = {
  RES: "An intensive outpatient program in 2025 ended in week 3 when housing was lost. Home is shared with a partner who drinks daily, and there is no transport to outpatient visits. The chart supports residential care.",
  IOP: "Weekly visits did not hold gains after the last lapse. The chart supports a structured program several days a week, with the evenings covered.",
  PHP: "Symptoms still limit daily function outside program hours. The chart supports daily structure with medical oversight.",
  WM: "Withdrawal scores need to be taken several times a day and treated as they change. The chart supports a medically monitored setting.",
};
/** The chart documents the "lower level of care" section rests on. Without the first one Scribe has to ask. */
export const LEVEL_SOURCES: Record<Program, [DocSlotId, string][]> = {
  RES: [["psychosocial", "Psychosocial p.2"], ["psychosocial", "Psychosocial p.4"]],
  IOP: [["treatment_plan", "Treatment plan p.2"]],
  PHP: [["asam", "ASAM assessment"]],
  WM: [["nursing", "Nursing notes"]],
};
const PROGRAM_TEXT: Record<Program, string> = { RES: "residential care", IOP: "intensive outpatient care", PHP: "partial hospitalization", WM: "withdrawal management" };
const DURATION: Record<string, string> = { short: "less than a year", mid: "one to five years", long: "more than five years" };
const LOWER_LEVEL: Record<string, string> = {
  tried: "A lower level of care was tried and did not hold.",
  home: "Home is not safe or supportive enough for a lower level of care.",
  severe: "Symptoms are too severe to manage at a lower level of care.",
};
const ANSWER_LINE: Record<string, string> = {
  named: "A named step-down provider is on file.",
  later: "A named step-down provider will be added before day 10.",
  na: "A step-down provider is not part of this request.",
  soon: "A discharge or step-down date is planned within 2 weeks.",
  month: "A discharge or step-down date is planned within 30 days.",
  open: "The discharge date is not decided yet.",
};

const mdy = (iso: string | null | undefined): string => (iso ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : "");

/** The one section that differs by type: what the request rests on. Built only from what is in the draft (the authorization as chosen, the change asked for, the reason given, the documents in the case);
    when the evidence is not there, the section says so instead of filling the gap. Null for an initial request, which has no earlier authorization to point at. */
function basisSection(d: CaseDraft, has: (slot: DocSlotId) => boolean): NarrativeSection | null {
  const b = d.basis;
  const window = b?.from && b.to ? `${mdy(b.from)} to ${mdy(b.to)}` : "";
  const used = b && b.authorized !== null && b.used !== null ? `${b.used} of ${b.authorized} ${b.unit} of the current authorization have been used${window ? ` (approved ${window})` : ""}.` : "";
  switch (d.kind) {
    case "concurrent":
      return {
        id: "basis", heading: "Progress since the last review",
        text: [used, has("therapy_note") ? "The latest therapy note describes engagement in group and individual sessions and lower craving, with a continued need for structure." : "No therapy or progress note is in the case, so progress since the last review is not documented yet."].filter(Boolean).join(" "),
        sources: has("therapy_note") ? ["Therapy note"] : [],
      };
    case "reauth":
      return {
        id: "basis", heading: "Progress since the authorization began",
        text: [used, has("attendance") ? "Attendance for the period is on record." : "No attendance record is in the case, so attendance for the period is not documented yet.", has("treatment_plan") ? "The treatment plan sets out what remains to be done." : ""].filter(Boolean).join(" "),
        sources: [has("attendance") ? "Attendance record" : "", has("treatment_plan") ? "Treatment plan p.2" : ""].filter(Boolean),
      };
    case "modify": {
      const c = d.change;
      const what = c ? `${CHANGE_LABEL[c.kind]}${c.amount ? `: ${c.amount} more ${c.kind === "more_units" ? "units" : "days"}` : ""}` : "";
      return {
        id: "basis", heading: "What changes and why",
        text: [what ? `The request is for ${what.toLowerCase()}.` : "", c?.detail.trim() || "The reason for the change has not been added yet.", used, "This is a request. Nothing about the authorization changes until the payer approves it."].filter(Boolean).join(" "),
        sources: has("treatment_plan") ? ["Treatment plan p.2"] : [],
      };
    }
    case "retro":
      return {
        id: "basis", heading: "Dates of service and why no authorization was in place",
        text: [d.startDate ? `Care was given from ${mdy(d.startDate)}${d.endDate ? ` to ${mdy(d.endDate)}` : ""}.` : "The dates of service have not been added yet.", d.retroReason?.trim() || "The reason an authorization was not in place has not been added yet."].join(" "),
        sources: has("referral") ? ["Referral or admission order"] : [],
      };
    default:
      return null;
  }
}

function planText(d: CaseDraft): string {
  if (d.kind === "modify") return d.change?.amount ? `${d.change.amount} more ${d.change.kind === "more_units" ? "units" : "days"} of ${PROGRAM_TEXT[d.program ?? "RES"]}, from ${mdy(d.startDate)}.` : "The authorization is changed as described above, from the date asked.";
  const prog = d.program ?? "RES";
  if (d.type === "Retro-authorization") return "The authorization is asked from the first day of care, so it covers the days already delivered.";
  if (prog === "RES") return d.type === "Continued stay" ? "Seven more days of residential care, then a step-down to partial hospitalization." : "Fourteen days of residential care, then a step-down to partial hospitalization.";
  if (prog === "IOP") return d.type === "Recertification" || d.type === "Continued stay" ? "Another 12 units of intensive outpatient care, then a step-down to weekly outpatient visits." : "Twelve weeks of intensive outpatient care, nine hours a week.";
  if (prog === "PHP") return "Fifteen days of partial hospitalization, then a step-down to intensive outpatient care.";
  return "Five days of medically monitored withdrawal management, then a transfer to residential care.";
}

/** The "Context added" paragraph: what a person added on the case page's Recommended actions, in their own words. */
function contextSection(context: string[]): NarrativeSection {
  return { id: "context", heading: "Context added", text: context.map((c) => (/[.!?]$/.test(c.trim()) ? c.trim() : `${c.trim()}.`)).join(" "), sources: [], fixed: true };
}

/** The one summary of a case, read by Review & submit and by the case page's Draft tab: the edited text when there is one, else what Scribe writes
    from the draft, then the context added for the request. */
export function narrativeOf(d: CaseDraft, context: string[] = [], adds: RecAdd[] = []): NarrativeSection[] {
  const folded = d.narrative ? d.narrativeIncludes ?? [] : [];
  const more = adds.filter((a) => !folded.includes(a.recId));
  const base = (d.narrative ?? buildNarrative(d)).filter((s) => !s.fixed).map((s) => {
    const own = more.filter((a) => a.section === s.id);
    return own.length ? { ...s, text: [s.text, ...own.map((a) => a.text)].join(" ") } : s;
  });
  const added = context.filter((c) => c.trim());
  return added.length ? [...base, contextSection(added)] : base;
}
/** Applied actions whose sentence the summary does not hold yet: the case page marks them "New". */
export const unfoldedAdds = (d: CaseDraft, adds: RecAdd[]): RecAdd[] => adds.filter((a) => !(d.narrative ? d.narrativeIncludes ?? [] : []).includes(a.recId));

/** The case's own scores as the summary's severity line: "PCL-5 52 and PHQ-9 16, with dates in the chart." The case page's draft says the same. */
export const severityLine = (scores: { label: string; value: string }[]): string | undefined => (scores.length ? `${scores.map((s) => `${s.label} ${s.value}`).join(" and ")}, with dates in the chart.` : undefined);
/** What the sample documents' psychiatric evaluation says (and R-1042's chart). */
const SAMPLE_SEVERITY = "Depression score 17 and anxiety score 14. Craving was 7 of 10 on 10/17.";

export function buildNarrative(d: CaseDraft): NarrativeSection[] {
  const has = (slot: DocSlotId): boolean => d.documents.some((x) => x.slot === slot);
  const chips = (pairs: [DocSlotId, string][]): string[] => pairs.filter(([slot]) => has(slot)).map(([, label]) => label);
  const answerOf = (key: string) => d.answers.find((a) => a.key === key && !a.fromCase);
  const prog = d.program ?? "RES";
  const dx = d.diagnoses.map((x) => `${x.label.toLowerCase()} (${x.code})`).join(" and ");
  const who = d.patient.initials || "The patient";
  const sertraline = answerOf("sertraline");
  const duration = answerOf("duration");
  const lower = answerOf("lowerlevel");
  const next = answerOf("stepdown") ?? answerOf("recert");

  const clinical = [
    `${who} is ${d.patient.age ?? "an adult"}${dx ? ` and has ${dx}` : ""}.`,
    duration ? `The diagnosis has been present for ${DURATION[duration.choice] ?? duration.answer.toLowerCase()}.` : "",
    d.reason.trim() || "The chart records active symptoms and a recent change in status.",
    has("nursing") ? "Withdrawal scores peaked at 14 on 10/17 and fell to 4 by 10/18 with medication." : "",
    sertraline ? `Sertraline was started on ${sertraline.answer}.` : "",
  ].filter(Boolean).join(" ");

  const level = [
    has(LEVEL_SOURCES[prog][0][0]) ? LEVEL_TEXT[prog] : lower ? "" : "The chart does not yet say why a lower level of care is not enough.",
    lower ? LOWER_LEVEL[lower.choice] ?? `Clinician note: ${lower.answer}` : "",
    d.suggestions.includes("iop") ? "A 2025 IOP discharge summary shows the lower level was tried." : "",
  ].filter(Boolean).join(" ");

  const plan = [
    planText(d),
    next ? ANSWER_LINE[next.choice] ?? `Clinician note: ${next.answer}` : "",
    next?.choice && next.note ? `Clinician note: ${next.note}` : "",
    d.suggestions.includes("stepdown") ? "The step-down provider is named on the treatment plan." : "",
    d.sendBackNote ? `Reviewer's note, addressed: ${d.sendBackNote}` : "",
  ].filter(Boolean).join(" ");

  const basis = basisSection(d, has);
  const levelHeading = d.kind === "concurrent" || d.kind === "reauth" ? "Why this level of care is still needed" : LEVEL_HEADING[prog];
  return [
    { id: "clinical", heading: "Clinical picture", text: clinical, sources: chips([["psych_eval", "Psychiatric eval p.3"], ["nursing", "Nursing notes"], ...(sertraline ? ([["meds", "Medication list"]] as [DocSlotId, string][]) : [])]) },
    ...(basis ? [basis] : []),
    { id: "level", heading: levelHeading, text: level, sources: chips(LEVEL_SOURCES[prog]) },
    { id: "severity", heading: "Current severity", text: d.severity ?? (has("psych_eval") ? SAMPLE_SEVERITY : "The chart records current symptoms and day-to-day function."), sources: chips([["psych_eval", "Psychiatric eval p.5"]]) },
    { id: "plan", heading: "Plan", text: plan, sources: chips([["treatment_plan", "Treatment plan p.2"]]) },
  ];
}
