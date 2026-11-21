import type { CaseDraft } from "@/data/cases";
import { SERVICES, type VaServiceId } from "@/data/va/services";

/** The Virginia service a draft is for: what the clinician selected, else what the referral asked for, else the one its program stands for. Null when no program is chosen yet. */
export function serviceIdOfDraft(d: Pick<CaseDraft, "program" | "serviceNote">): VaServiceId | null {
  const note = d.serviceNote;
  if (note) {
    const id = note.selected ?? note.requested;
    if (SERVICES.find((s) => s.id === id)?.program === d.program) return id;
  }
  return d.program ? SERVICES.find((s) => s.program === d.program)?.id ?? null : null;
}
