import type { DocBlock } from "@/components/ui/DocumentSheet";
import { INSTRUMENT_STATUS_LABEL, type AssessmentPlan } from "@/data/assess/types";
import type { IntakeDocument, IntakeRecord } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import { stamp } from "@/lib/time";
import { planItems } from "../modules";

/** A draft clinical summary built from what is on the record: the status of each assessment, the safety status and the open items. It is a draft for a
    clinician to review, never a finding. */
export function summaryDocument(r: IntakeRecord, plan: AssessmentPlan | null, now: number, id: string): IntakeDocument {
  const items = planItems(r, plan);
  const a = r.assessment;
  const blocks: DocBlock[] = [
    { kind: "letterhead", org: "Psyflo clinical summary (draft)", sub: "Generated from the intake record. A clinician reviews it before it is used or sent." },
    { kind: "meta", items: [["Patient", `${r.initials || "No name yet"}${r.age !== null ? `, ${r.age}` : ""}`], ["Intake", r.id], ["Plan", (r.payerId ? vaPlanOf(r.payerId)?.name : undefined) ?? "No plan on file"], ["Prepared", stamp(now)]] },
    { kind: "h", text: "Reason for referral" },
    { kind: "p", id: "g1", text: r.referral.reason?.value || "Not entered yet." },
    { kind: "h", text: "Assessments" },
    { kind: "list", id: "g2", items: [`Clinical assessment: ${INSTRUMENT_STATUS_LABEL[a.status]}`, ...items.map((i) => `${i.label}: ${INSTRUMENT_STATUS_LABEL[i.status]}`)] },
    { kind: "h", text: "Safety" },
    { kind: "p", id: "g3", text: r.safety ? `A safety alert is ${r.safety.status === "open" ? "open and needs a clinician's review" : "on file and was reviewed"}.` : "No safety alert is on file. A clinician documents the safety and risk screening in the clinical assessment." },
    { kind: "sig", id: "g4", text: "Draft by Psyflo. Not reviewed or signed by a clinician.", missing: true },
  ];
  return { id, name: `Clinical summary (draft) ${r.id}`, kind: "other", receivedAt: now, simulated: false, pages: [blocks], origin: "generated" };
}
