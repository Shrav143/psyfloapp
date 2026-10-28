import { readEvidence } from "@/data/assess/evidence";
import { schemaOf } from "@/data/assess/modules";
import type { ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";

/** "Find evidence": runs the simulated evidence reader as an agent task (queued, running, done; it respects Pause in Settings). It only adds suggestions, as
    drafts, that a person accepts, edits or rejects. Returns whether a run is in progress and a function that starts one. */
export function useFindEvidence(record: IntakeRecord, moduleId: ModuleId, label: string): { running: boolean; run: () => void } {
  const action = `Find evidence for ${label} (simulated evidence reader)`;
  const running = record.tasks.some((t) => t.action === action && (t.status === "queued" || t.status === "running"));
  const run = () => {
    if (running) return;
    runAgent(record.id, {
      role: "documentation", action, section: "assessment", source: "Documents, referral, profile and signed modules", ms: 1400,
      work: () => {
        const s = useStore.getState();
        const current = s.intakes.find((r) => r.id === record.id);
        if (!current) return;
        const { proposals, read } = readEvidence(current, schemaOf(moduleId), { moduleId, instance: current.instruments?.[moduleId] });
        const added = s.addInstrumentEvidence(record.id, moduleId, proposals);
        s.toast(added
          ? { title: `${added} suggestion${added === 1 ? "" : "s"} for ${label}`, body: "Drafts from the simulated evidence reader. Accept, edit or reject each one.", tone: "good" }
          : { title: "Nothing new found", body: `The simulated evidence reader looked at ${read}.`, tone: "neutral" });
        return added ? `${added} draft suggestion${added === 1 ? "" : "s"} wait for a person (read ${read})` : `Nothing new in ${read}`;
      },
    });
  };
  return { running, run };
}
