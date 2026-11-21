import { canSign } from "@/data/assess/roles";
import type { InstrumentInstance, ModuleId } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import type { IntakeDocument } from "@/data/intake/types";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";

/* What a person does from the workspace header and the Documents section, through the store's own actions (every one writes an audit event). */

const st = () => useStore.getState();
const me = () => meOf(st());

export const CLOSE_REASONS = [
  "The referrer withdrew the referral",
  "The patient or guardian declined services",
  "Duplicate of another intake",
  "Moved out of the service area",
  "Not eligible for the program",
  "No authorization is needed",
  "Care continues in another program (referral coordination)",
  "Other",
] as const;

/** Closes the intake with the reason. A person sets Closed; no agent does. */
export function closeIntake(id: string, reason: string, note: string): void {
  st().setTriage(id, "closed", [reason, note.trim()].filter(Boolean).join(". "));
  st().toast({ title: `${id} is closed`, body: "It stays in the record and can be reopened.", tone: "neutral" });
}

/** Puts a closed intake back to work: its status follows the work again. */
export function reopenIntake(id: string): void {
  st().setTriage(id, "ready_screening", "Reopened");
  st().toast({ title: `${id} is open again`, tone: "good" });
}

export function reassignIntake(id: string, staffId: string, reason: string): void {
  st().assignIntake(id, staffId);
  if (reason.trim()) st().addIntakeAudit(id, { actor: me(), action: `Reassigned to ${staffOf(staffId)?.name ?? staffId}`, detail: reason.trim() });
  st().toast({ title: `${id} is assigned to ${staffOf(staffId)?.name ?? staffId}`, tone: "good" });
}

const mapDoc = (id: string, docId: string, fn: (d: IntakeDocument) => IntakeDocument) =>
  st().patchIntake(id, (r) => ({ ...r, documents: r.documents.map((d) => (d.id === docId ? fn(d) : d)) }));

/** The flag New Authorization reads: this document goes with the request. */
export function setDocumentAttach(id: string, doc: IntakeDocument, attach: boolean): void {
  mapDoc(id, doc.id, (d) => ({ ...d, attach }));
  st().addIntakeAudit(id, { actor: me(), action: `Marked ${doc.name} ${attach ? "to attach to" : "not to attach to"} the authorization`, section: "review" });
}

export function setDocumentModule(id: string, doc: IntakeDocument, moduleId: ModuleId | undefined): void {
  mapDoc(id, doc.id, (d) => ({ ...d, moduleId }));
}

/** Writes that a summary left the page as a file. */
export function recordExport(id: string, what: string, count: number): void {
  st().addIntakeAudit(id, { actor: me(), action: `Exported ${what} as a text file`, detail: `${count} entries. Synthetic demo record` });
}

/** The overall sign-off: a qualified clinician signs the whole assessment once every required module is signed. It is the "review-signoff" instance, so it has
    versions and can be amended like any other signed item. The signature dialog writes the audit event. Returns false when the signer may not sign. */
export function signOffAssessment(id: string, signerId: string, rolePlay: boolean): boolean {
  if (!canSign(signerId)) return false;
  const at = st().clock;
  st().patchIntake(id, (r) => {
    const cur = r.instruments?.["review-signoff"];
    const next: InstrumentInstance = { moduleId: "review-signoff", version: 1, fields: {}, notes: "", evidence: [], history: [], ...cur, status: "signed", signedBy: signerId, signedAt: at, reviewedBy: signerId, rolePlay, startedAt: cur?.startedAt ?? at, updatedAt: at };
    return { ...r, instruments: { ...(r.instruments ?? {}), "review-signoff": next } };
  });
  return true;
}
