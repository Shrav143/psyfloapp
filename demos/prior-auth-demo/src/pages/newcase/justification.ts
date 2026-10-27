/* What the prepared justification rests on, and what it lacks. The sentences themselves come from narrative.ts; this lists the evidence that is not in the case,
   so the person sees a gap as a gap and Scribe never fills it with something the chart does not say. */
import type { CaseDraft } from "@/data/cases";
import type { CaseEnv } from "./caseEnv";
import { authType } from "./authType";
import { levelSources } from "./narrative";

export function evidenceGaps(d: CaseDraft, env: CaseEnv): string[] {
  const out: string[] = [];
  const inCase = (slot: string): boolean => d.documents.some((x) => x.slot === slot) || slot in d.unavailable;
  for (const e of env.readiness.missingRequired) out.push(`${e.label} is not in the case. The payer lists it as required.`);
  for (const e of env.readiness.typical.filter((t) => !inCase(t.slot))) out.push(`${e.label} is not in the case. It is typical for ${authType(d.kind).typical}.`);
  const lower = d.answers.some((a) => a.key === "lowerlevel");
  if (!inCase(levelSources(d.program ?? "RES")[0][0]) && !lower) out.push("The chart does not yet say why a lower level of care is not enough.");
  if (d.kind === "modify" && !d.change?.detail.trim()) out.push("The reason for the change has not been added.");
  if (d.kind === "retro" && !d.retroReason?.trim()) out.push("The reason no authorization was in place has not been added.");
  return out;
}
