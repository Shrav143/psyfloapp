import { draftState, type CaseDraft } from "@/data/cases";
import type { SiteId } from "@/data/sites";
import type { PsyRequest } from "@/data/types";
import type { DashFilters } from "@/store/core";

/**
 * Cases being prepared in New Case that have no row on the Dashboard yet: saved, not sent, at a site in view, and matching Payer, Program and Request type.
 * The five that start out as Preparing rows already have a request, so they are not counted twice. Case Manager lists the same drafts.
 */
export function draftsInPreparation(drafts: CaseDraft[], requests: PsyRequest[], f: DashFilters, sites: SiteId[]): CaseDraft[] {
  return drafts.filter((d) => {
    if (!d.saved || d.sent) return false;
    if (!sites.includes(d.site)) return false;
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

/** The Preparing requests whose draft has passed every check, so a clinician can sign. A request with no draft reads its own line. */
export function readyToSignIds(drafts: CaseDraft[], requests: PsyRequest[]): Set<string> {
  const out = new Set<string>();
  for (const r of requests) {
    if (r.stage !== "preparing") continue;
    const d = drafts.find((x) => x.caseId === r.id || x.caseId === r.caseId || x.id === `draft-${r.id.toLowerCase().replace("-", "")}`);
    if (d ? draftState(d) === "ready" : /^Ready to sign/i.test(r.next)) out.add(r.id);
  }
  return out;
}
