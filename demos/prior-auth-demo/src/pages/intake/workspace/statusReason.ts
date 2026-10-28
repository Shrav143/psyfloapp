import type { AssessmentPlan } from "@/data/assess/types";
import { effectiveStatus } from "@/data/assess/status";
import { staffOf } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { instrumentProgress } from "./modules";

/** One sentence on why the intake has the status it has. The status itself comes from `effectiveStatus`: it follows the work, except the ones a person sets. */
export function statusReason(r: IntakeRecord, plan: AssessmentPlan | null): string {
  const status = effectiveStatus(r);
  const prog = instrumentProgress(r, plan);
  const by = staffOf(r.assignedTo)?.name;
  switch (status) {
    case "new": return "The referral has not been triaged yet.";
    case "needs_info": return r.triageNote ?? "Waiting on the referrer for information.";
    case "ready_screening": return r.config ? "Configured. The assessment has not started." : "The intake is not configured yet. Choose the purpose and program to load the assessments.";
    case "assessment": return prog.total ? `${prog.signed} of ${prog.total} required assessments are signed.` : "The clinical assessment is in progress.";
    case "clinical_review": return "The assessments are ready for a clinician to review and sign.";
    case "care_planning": return "The assessments are signed. A clinician plans the care.";
    case "ready_for_auth": return "The care plan is approved. A person prepares the authorization request.";
    case "accepted": return `Accepted${by ? ` and assigned to ${by}` : ""}.`;
    case "redirected": return r.triageNote ?? "Redirected to another program.";
    case "declined": return r.triageNote ?? "Declined.";
    case "closed": return r.triageNote ? `Closed: ${r.triageNote}` : "Closed by a person. The record is kept.";
  }
}
