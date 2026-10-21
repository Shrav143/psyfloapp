import { draftState, type CaseDraft } from "@/data/cases";
import type { PsyRequest } from "@/data/types";
import type { DashFilters } from "@/store/core";

/**
 * Cases being prepared in New case that have no row on the Dashboard yet: saved, not sent, and matching Payer, Program and Request type.
 * The five that start out as Preparing rows already have a request, so they are not counted twice. Case Manager lists the same drafts.
 */
export function draftsInPreparation(drafts: CaseDraft[], requests: PsyRequest[], f: DashFilters): CaseDraft[] {
  return drafts.filter((d) => {
    if (!d.saved || d.sent) return false;
    if (d.caseId && requests.some((r) => r.id === d.caseId || r.caseId === d.caseId)) return false;
    if (f.payer !== "all" && d.payerId !== f.payer) return false;
    if (f.program !== "all" && d.program !== f.program) return false;
    return f.type === "all" || d.type === f.type;
  });
}

/** How many of those drafts wait for a person, and how many wait only for a signature. */
export function draftNeeds(drafts: CaseDraft[]): { needYou: number; ready: number } {
  const state = drafts.map(draftState);
  return { needYou: state.filter((s) => s === "intake" || s === "question").length, ready: state.filter((s) => s === "ready").length };
}
