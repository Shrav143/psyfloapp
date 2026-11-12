/* Clinical documentation by type. The required documents come from the payer's saved list (Payers › Documents, read in payerContext.ts).
   What a request of this type usually carries on top of that is "typical for a continued stay" and so on. It is advice from the demo, never presented as a payer's rule. */
import type { AuthKind, CaseDraft, DocSlotId } from "@/data/cases";
import { authType } from "./authType";
import { docEntries, isFixedSlot, slotForTitle, slotLabel, trackOfDraft, type DocEntry } from "./documents";
import type { PayerContext } from "./payerContext";

/** Titles, in plain words. A title that fits one of the standard documents is filed there, so a sample chart or a dropped file can fill it. */
const TYPICAL: Record<AuthKind, string[]> = {
  initial: [],
  concurrent: ["Progress note since the last review", "Updated treatment plan", "Current ASAM reassessment", "Step-down or discharge plan"],
  reauth: ["Progress summary since the last authorization", "Updated treatment plan", "Current ASAM reassessment", "Attendance record"],
  modify: ["Clinical note that supports the change", "Updated treatment plan", "The current authorization letter"],
  retro: ["Admission order with its date", "Eligibility check from the admission date", "Attendance record for the dates of service", "Why the authorization was not obtained"],
};

export interface TypicalEntry extends DocEntry {
  typical: true;
}

/** The items typical for the kind that the payer's own list does not already name. Never required. */
export function typicalEntries(kind: AuthKind, listed: DocEntry[]): TypicalEntry[] {
  const taken = new Set<DocSlotId>(listed.map((e) => e.slot));
  const out: TypicalEntry[] = [];
  for (const title of TYPICAL[kind]) {
    const fixed = slotForTitle(title);
    const slot: DocSlotId = fixed && !taken.has(fixed) ? fixed : `item:${title}`;
    if (taken.has(slot)) continue;
    taken.add(slot);
    out.push({ slot, label: isFixedSlot(slot) ? slotLabel(slot) : title, hint: `Typical for ${authType(kind).typical}`, required: false, typical: true });
  }
  return out;
}

export interface Readiness {
  required: DocEntry[];
  typical: TypicalEntry[];
  /** Required and typical items that are in the case or marked not available. */
  ready: number;
  total: number;
  /** Required items still to add. */
  missingRequired: DocEntry[];
}

/** "3 of 4 ready": the required documents for the payer and level of care, plus the items typical for the type. */
export function readiness(d: CaseDraft, ctx: PayerContext): Readiness {
  const list = docEntries(d.payerId, d.program, ctx.items, trackOfDraft(d));
  const required = list.filter((e) => e.required);
  const typical = typicalEntries(d.kind, list);
  const handled = (e: DocEntry): boolean => d.documents.some((x) => x.slot === e.slot) || e.slot in d.unavailable;
  const all = [...required, ...typical];
  return { required, typical, ready: all.filter(handled).length, total: all.length, missingRequired: required.filter((e) => !handled(e)) };
}
