import type { DocSlotId } from "../cases";
import { staffOf } from "../intake/seed";
import type { IntakeDocument, IntakeRecord } from "../intake/types";
import { isModuleSigned } from "./carePlan";
import { moduleById } from "./modules";
import type { ModuleId } from "./types";

/* What a New Authorization can read from the shared intake record without anyone retyping it: the referral, the signed clinical assessment, the signed
   assessment modules, the approved care plan and any document a person chose to attach. Each is offered for the payer's document slot it fits.
   Pure: the screens and the readiness engine both read it. */

export interface RecordDoc {
  slot: DocSlotId;
  /** The slot's own title for a document no fixed slot fits. */
  label: string;
  /** One line: where it comes from and who signed it. */
  from: string;
  /** Where to open it in the workspace. */
  section: string;
  module?: ModuleId;
  docId?: string;
}

const REFERRAL_KINDS: IntakeDocument["kind"][] = ["referral", "fax", "email", "emr_summary", "school_report", "discharge_summary"];
/** The slot a signed module fills. The first module to fill a slot keeps it. */
const MODULE_SLOT: Partial<Record<ModuleId, DocSlotId>> = {
  asam: "asam", withdrawal: "nursing", cows: "nursing", ciwa: "nursing", "recovery-env": "psychosocial", "social-functional": "psychosocial",
  psychiatric: "psych_eval", "psych-history": "psych_eval", biopsychosocial: "psych_eval", "clinical-history": "meds",
};
const name = (id?: string): string => (id ? staffOf(id)?.name ?? id : "a clinician");
const bare = (file: string): string => file.replace(/\.(pdf|txt)$/i, "");

export function recordDocs(r: IntakeRecord): RecordDoc[] {
  const out: RecordDoc[] = [];
  const put = (d: RecordDoc) => {
    if (!out.some((x) => x.slot === d.slot)) out.push(d);
  };
  const referral = r.documents.find((d) => REFERRAL_KINDS.includes(d.kind) && (d.origin === undefined || d.origin === "referral"));
  if (referral) put({ slot: "referral", label: "Referral", from: `Referral document: ${bare(referral.name)}`, section: "documents", docId: referral.id });
  for (const d of r.documents) if (d.attach && d.id !== referral?.id) put({ slot: `item:${bare(d.name)}`, label: bare(d.name), from: `Attached from the intake: ${bare(d.name)}`, section: "documents", docId: d.id });
  const a = r.assessment;
  if (a.status === "signed") put({ slot: "psych_eval", label: "Clinical assessment", from: `Clinical assessment, signed by ${name(a.attestation?.by)}${a.attestation?.rolePlay ? " (demo role-play)" : ""}`, section: "clinical" });
  for (const [id, inst] of Object.entries(r.instruments ?? {})) {
    const moduleId = id as ModuleId;
    const slot = MODULE_SLOT[moduleId];
    if (!slot || !isModuleSigned(r, moduleId)) continue;
    put({ slot, label: moduleById(moduleId).label, from: `${moduleById(moduleId).label}, signed by ${name(inst.signedBy)}${inst.rolePlay ? " (demo role-play)" : ""}`, section: "instrument", module: moduleId });
  }
  const c = r.carePlan;
  if (c?.status === "approved") put({ slot: "treatment_plan", label: "Care plan", from: `Care plan version ${c.version ?? 1}, approved by ${name(c.approvedBy)}${c.rolePlay ? " (demo role-play)" : ""}`, section: "care" });
  return out;
}
