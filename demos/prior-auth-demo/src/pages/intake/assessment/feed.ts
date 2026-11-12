import type { InstrumentEvidence, ModuleId } from "@/data/assess/types";
import { isCoreModule } from "@/data/assess/modules";
import { activeModuleIds } from "@/data/intake/scripts";
import { staffOf } from "@/data/intake/seed";
import { ASSESSMENT_SECTIONS, ROLE_AGENT, type IntakeRecord } from "@/data/intake/types";
import { resolveField } from "../scribe/route";
import { FEEDS, sectionLabel } from "./groups";

/* "Nothing is asked twice": what a person already documented in the clinical assessment is proposed, as pending evidence, to each module in use that reads it.
   It never fills a field: a person accepts, edits or rejects each piece in the module, like any other evidence. */

type Proposal = Omit<InstrumentEvidence, "id" | "status" | "at">;
export interface ModuleFeed { moduleId: ModuleId; evidence: Proposal[] }

/** The evidence the record's clinical assessment can offer the modules of its plan that do not already have it. Safety documentation reaches only the ASAM module, and only when a clinician wrote it. */
export function assessmentFeeds(r: IntakeRecord): ModuleFeed[] {
  if (!r.config) return [];
  const active = new Set(activeModuleIds(r.config));
  const out = new Map<ModuleId, Proposal[]>();
  for (const sec of ASSESSMENT_SECTIONS) {
    const fv = r.assessment.fields[sec.id];
    if (!fv?.value.trim() || fv.state === "ai_suggested") continue;
    if (sec.id === "safety" && !staffOf(fv.by)) continue;
    const targets = sec.id === "safety" ? (active.has("asam") ? [{ id: "asam" as ModuleId, words: ["substance use-related risks", "risks"], keys: ["asam.d4.findings"] }] : []) : FEEDS[sec.id].modules.filter((m) => active.has(m.id) && !isCoreModule(m.id)).map((m) => ({ ...m, keys: [] as string[] }));
    for (const t of targets) {
      const at = resolveField(t.id, t.words, t.keys);
      if (!at) continue;
      const inst = r.instruments?.[t.id];
      const text = fv.value.trim();
      const had = inst?.evidence.some((e) => e.fieldKey === at.key && e.text === text) || inst?.fields[at.key]?.value === text;
      if (had) continue;
      const list = out.get(t.id) ?? [];
      if (list.some((e) => e.fieldKey === at.key && e.text === text)) continue;
      out.set(t.id, [...list, {
        fieldKey: at.key, text, confidence: "high", agent: ROLE_AGENT.documentation,
        source: { kind: "staff", ref: `Clinical assessment: ${sectionLabel(sec.id)}` },
        explanation: `Already documented in the clinical assessment (${sectionLabel(sec.id)}). Proposed here so it is not asked twice. A person decides.`,
      }]);
    }
  }
  return [...out.entries()].map(([moduleId, evidence]) => ({ moduleId, evidence }));
}
export const feedCount = (r: IntakeRecord): number => assessmentFeeds(r).reduce((n, f) => n + f.evidence.length, 0);
