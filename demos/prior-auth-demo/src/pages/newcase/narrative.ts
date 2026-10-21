/* The medical-necessity summary Scribe drafts, built from what the person entered and answered.
   Each section lists the chart documents it came from; those become the source chips. */
import type { CaseDraft, DocSlotId, NarrativeSection } from "@/data/cases";
import type { Program } from "@/data/types";

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
const LEVEL_SOURCES: Record<Program, [DocSlotId, string][]> = {
  RES: [["psychosocial", "Psychosocial p.2"], ["psychosocial", "Psychosocial p.4"]],
  IOP: [["treatment_plan", "Treatment plan p.2"]],
  PHP: [["asam", "ASAM assessment"]],
  WM: [["nursing", "Nursing notes"]],
};
const ANSWER_LINE: Record<string, string> = {
  named: "A named step-down provider is on file.",
  later: "A named step-down provider will be added before day 10.",
  na: "A step-down provider is not part of this request.",
  soon: "A discharge or step-down date is planned within 2 weeks.",
  month: "A discharge or step-down date is planned within 30 days.",
  open: "The discharge date is not decided yet.",
};

function planText(d: CaseDraft): string {
  const prog = d.program ?? "RES";
  if (d.type === "Retro-authorization") return "The authorization is asked from the first day of care, so it covers the days already delivered.";
  if (prog === "RES") return d.type === "Continued stay" ? "Seven more days of residential care, then a step-down to partial hospitalization." : "Fourteen days of residential care, then a step-down to partial hospitalization.";
  if (prog === "IOP") return d.type === "Recertification" || d.type === "Continued stay" ? "Another 12 units of intensive outpatient care, then a step-down to weekly outpatient visits." : "Twelve weeks of intensive outpatient care, nine hours a week.";
  if (prog === "PHP") return "Fifteen days of partial hospitalization, then a step-down to intensive outpatient care.";
  return "Five days of medically monitored withdrawal management, then a transfer to residential care.";
}

export function buildNarrative(d: CaseDraft): NarrativeSection[] {
  const has = (slot: DocSlotId): boolean => d.documents.some((x) => x.slot === slot);
  const chips = (pairs: [DocSlotId, string][]): string[] => pairs.filter(([slot]) => has(slot)).map(([, label]) => label);
  const answerOf = (key: string) => d.answers.find((a) => a.key === key);
  const prog = d.program ?? "RES";
  const dx = d.diagnoses.map((x) => `${x.label.toLowerCase()} (${x.code})`).join(" and ");
  const who = d.patient.initials || "The patient";
  const sertraline = answerOf("sertraline");
  const next = answerOf("stepdown") ?? answerOf("recert");

  const clinical = [
    `${who} is ${d.patient.age ?? "an adult"}${dx ? ` and has ${dx}` : ""}.`,
    d.reason.trim() || "The chart records active symptoms and a recent change in status.",
    has("nursing") ? "Withdrawal scores peaked at 14 on 10/17 and fell to 4 by 10/18 with medication." : "",
    sertraline ? `Sertraline was started on ${sertraline.answer}.` : "",
  ].filter(Boolean).join(" ");

  const level = [LEVEL_TEXT[prog], d.suggestions.includes("iop") ? "A 2025 IOP discharge summary shows the lower level was tried." : ""].filter(Boolean).join(" ");

  const plan = [
    planText(d),
    next ? ANSWER_LINE[next.choice] ?? `Clinician note: ${next.answer}` : "",
    next?.choice && next.note ? `Clinician note: ${next.note}` : "",
    d.suggestions.includes("stepdown") ? "The step-down provider is named on the treatment plan." : "",
    d.sendBackNote ? `Reviewer's note, addressed: ${d.sendBackNote}` : "",
  ].filter(Boolean).join(" ");

  return [
    { id: "clinical", heading: "Clinical picture", text: clinical, sources: chips([["psych_eval", "Psychiatric eval p.3"], ["nursing", "Nursing notes"], ...(sertraline ? ([["meds", "Medication list"]] as [DocSlotId, string][]) : [])]) },
    { id: "level", heading: LEVEL_HEADING[prog], text: level, sources: chips(LEVEL_SOURCES[prog]) },
    { id: "severity", heading: "Current severity", text: has("psych_eval") ? "Depression score 17 and anxiety score 14. Craving was 7 of 10 on 10/17." : "The chart records current symptoms and day-to-day function.", sources: chips([["psych_eval", "Psychiatric eval p.5"]]) },
    { id: "plan", heading: "Plan", text: plan, sources: chips([["treatment_plan", "Treatment plan p.2"]]) },
  ];
}
