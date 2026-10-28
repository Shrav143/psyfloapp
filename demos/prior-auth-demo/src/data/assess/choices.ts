import type { DraftChoice } from "../intake/types";
import { canOverride } from "./roles";
import type { AssessmentPlan, ModuleChoice, ModuleId } from "./types";

/* A person's changes to a plan's defaults, as the configuration wizard holds them (DraftChoice) and as the record stores them (ModuleChoice).
   The rules live here once, so the wizard's preview and the saved record agree: a required module stays on unless an authorized person removes it
   with a reason, and an override only stands while the module is still required. */

const levelOf = (plan: AssessmentPlan, id: ModuleId) => plan.modules.find((m) => m.id === id)?.level ?? "optional";

/** `base` (the plan's defaults, or the record's choices after reconciling) with the person's changes laid over it. A change the rules do not allow is left out. */
export function overlayChoices(base: ModuleChoice[], draft: DraftChoice[], plan: AssessmentPlan): ModuleChoice[] {
  const out = [...base];
  for (const c of draft) {
    const level = levelOf(plan, c.id);
    let by: ModuleChoice["by"] = "clinician";
    if (c.by === "override") {
      if (level === "required") {
        if (!c.reason?.trim() || !canOverride(c.who)) continue;
        by = "override";
      }
    } else if (level === "required") continue;
    const next: ModuleChoice = { id: c.id, level, state: c.state, by, who: c.who, at: c.at, reason: c.reason };
    const i = out.findIndex((m) => m.id === c.id);
    if (i >= 0) out[i] = next;
    else out.push(next);
  }
  return out;
}

/** The changes a person made, as the wizard edits them: every choice of a person (a module they turned on or off, or removed by override). */
export function choicesFromConfig(modules: ModuleChoice[]): DraftChoice[] {
  return modules.filter((m) => m.by !== "plan").map((m) => ({ id: m.id, state: m.state, by: m.by === "override" ? "override" : "clinician", who: m.who ?? "", at: m.at ?? 0, reason: m.reason }));
}

export interface ChoiceChange {
  id: ModuleId;
  what: "added" | "removed" | "override" | "restored";
}
/** What changed between two sets of choices, for the history: a module put in use, taken out, taken out by an authorized override, or put back. */
export function diffChoices(before: ModuleChoice[], after: ModuleChoice[]): ChoiceChange[] {
  const was = new Map(before.map((m) => [m.id, m]));
  const out: ChoiceChange[] = [];
  for (const m of after) {
    const p = was.get(m.id);
    const wasOn = p?.state === "active";
    if (m.state === "active" && !wasOn && p) out.push({ id: m.id, what: p.by === "override" ? "restored" : "added" });
    else if (m.state === "off" && wasOn) out.push({ id: m.id, what: m.by === "override" ? "override" : "removed" });
    else if (m.state === "off" && p?.state === "off" && m.by === "override" && p.by !== "override") out.push({ id: m.id, what: "override" });
  }
  return out;
}
