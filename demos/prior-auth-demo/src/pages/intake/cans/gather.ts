import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { findEvidence } from "./evidence";

/** Starts the CANS Evidence Agent: it reads the record's documents, assessment fields and transcript and proposes statements for a person to keep or discard. */
export function gatherEvidence(recordId: string) {
  const current = useStore.getState().intakes.find((x) => x.id === recordId);
  /* Nothing to review means nothing to approve: the task then ends as Done instead of waiting on a person. */
  const approval = current?.cans && findEvidence(current).length ? "required" : "none";
  let taskId: string | null = null;
  taskId = runAgent(recordId, {
    role: "cans", action: "Gather CANS evidence from documents, assessment and transcript", section: "cans", approval, ms: 1500,
    source: "Record documents, clinical assessment fields, AI Scribe transcript",
    work: () => {
      const s = useStore.getState();
      const r = s.intakes.find((x) => x.id === recordId);
      if (!r?.cans) return "No CANS record. Nothing was proposed.";
      const found = findEvidence(r);
      if (!found.length) return "No new evidence found in the documents, assessment or transcript.";
      const ids = s.proposeCansEvidence(recordId, found, "criteria");
      if (taskId) s.updateIntakeTask(recordId, taskId, { gate: { kind: "suggestions", sections: ["cans"], ids } });
      const docs = new Set(found.filter((f) => f.source.docId).map((f) => f.source.docId)).size;
      return `Proposed ${found.length} statement${found.length === 1 ? "" : "s"} from ${docs} document${docs === 1 ? "" : "s"}${found.some((f) => f.source.kind !== "document") ? " and the record" : ""}. Each waits for a person to keep or discard it.`;
    },
  });
}
