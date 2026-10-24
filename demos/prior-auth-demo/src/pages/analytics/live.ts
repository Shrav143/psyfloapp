import { useMemo } from "react";
import { PAYER_ORDER, reasonsOf } from "@/data/analytics";
import { DECISIONS, cmsApplies, type Decision, type DxId } from "@/data/decisions";
import { QUEUE_ITEMS, dxKeyFor, type DxKey } from "@/data/queue";
import { payerById } from "@/data/seed";
import { siteOf } from "@/data/sites";
import type { BuiltInPayerId, Program, PsyRequest } from "@/data/types";
import { useScope, type Scope } from "@/lib/scope";
import { useStore } from "@/store";
import type { AppealDecision, DenialAccepted, Dismissal } from "@/store/ripples";
import { bySites } from "./filters";

/* What other screens record while the demo runs: an appeal ruling or an accepted denial from Denial Intelligence, a dismissed
   recommendation from Authorizations. They are folded into the records, so a ruling moves the count everywhere at once. */

const DX_OF: Record<DxKey, DxId> = { aud: "aud", oud: "oud", stim: "stim", cann: "stim", mdd: "cooc", gad: "cooc" };
const isBuiltIn = (id: string): id is BuiltInPayerId => (PAYER_ORDER as string[]).includes(id);

/** A denial that Denial Intelligence has and the history does not (a letter added during the demo): a denial decided today. */
function liveDenial(r: PsyRequest, payerId: BuiltInPayerId): Decision {
  const reason = reasonsOf(payerId)[0];
  const program: Program = r.program;
  const item = QUEUE_ITEMS.find((i) => i.id === r.caseId || i.id === r.id);
  const hours = Math.round(payerById(payerId).avgDecisionDays * 24);
  return {
    id: r.id, caseId: r.caseId, denialId: r.id, inDemo: true, initials: r.patient.initials, age: r.patient.age, site: siteOf(r.caseId), payerId, program,
    kind: "concurrent", dx: DX_OF[item?.dxKey ?? dxKeyFor(r.caseId, program)], population: "adult", month: 11, day: 0,
    outcome: r.outcome === "partly_approved" ? "partial" : "denied", unit: program === "IOP" ? "units" : "days", requested: program === "IOP" ? 24 : 14, approvedAmt: 0,
    reason: reason?.label, preventable: reason?.preventable, hours, expedited: false, pastCms: cmsApplies(payerId) ? false : null, infoRequest: false,
    p2p: "none", appeal: "none", accepted: false, referralDays: null, advice: false, helps: [], edit: null,
  };
}

/** The records with the live events folded in. `requests` is only read for a denial the history does not have. */
export function applyLive(base: readonly Decision[], appeals: readonly AppealDecision[], accepted: readonly DenialAccepted[], requests: readonly PsyRequest[]): Decision[] {
  const out = new Map<string, Decision>(base.map((d) => [d.id, d]));
  const find = (denialId: string, requestId?: string): Decision | undefined => out.get(denialId) ?? (requestId ? out.get(requestId) : undefined);
  const ensure = (denialId: string, requestId?: string): Decision | undefined => {
    const hit = find(denialId, requestId);
    if (hit) return hit;
    const req = requests.find((r) => r.id === denialId || r.id === requestId);
    if (!req || !isBuiltIn(req.payerId)) return undefined;
    const made = liveDenial(req, req.payerId);
    out.set(made.id, made);
    return made;
  };
  // the store lists the newest first, so apply oldest first and the latest ruling wins
  for (const a of [...appeals].reverse()) {
    const d = ensure(a.denialId, a.requestId);
    if (d) out.set(d.id, { ...d, appeal: a.result, accepted: false });
  }
  for (const a of accepted) {
    const d = ensure(a.denialId, a.requestId);
    if (d) out.set(d.id, { ...d, accepted: true, appeal: d.appeal === "pending" ? "none" : d.appeal });
  }
  return [...out.values()].sort((a, c) => a.day - c.day || a.id.localeCompare(c.id));
}

export interface Live {
  scope: Scope;
  /** Every record the viewer may see, live events included, before any filter. */
  scoped: Decision[];
  dismissals: DismissedRow[];
}
export interface DismissedRow {
  reason: string;
  payerId?: BuiltInPayerId;
  program?: Program;
  dx?: DxId;
  caseId: string;
}

export function useLive(): Live {
  const scope = useScope();
  const appeals = useStore((s) => s.appealDecisions);
  const accepted = useStore((s) => s.deniesAccepted);
  const dismissed = useStore((s) => s.dismissals);
  const requests = useStore((s) => s.requests);
  const queue = useStore((s) => s.queueItems);
  const live = useMemo(() => applyLive(DECISIONS, appeals, accepted, requests), [appeals, accepted, requests]);
  const dismissals = useMemo(() => dismissalRows(dismissed, requests, queue), [dismissed, requests, queue]);
  const sites = scope.sites;
  const scoped = useMemo(() => bySites(live, sites), [live, sites]);
  return { scope, scoped, dismissals: dismissals.filter((d) => scope.has(d.caseId)) };
}

/** Each dismissal knows its request, so the payer, program and diagnosis group are looked up there (Dashboard requests first, then the Authorizations queue). */
export function dismissalRows(list: readonly Dismissal[], requests: readonly PsyRequest[], queue: readonly { id: string; payerId: string; program: Program; dxKey?: DxKey }[]): DismissedRow[] {
  return list.map((d) => {
    const req = requests.find((r) => r.id === d.requestId || r.caseId === d.requestId);
    const item = queue.find((q) => q.id === d.requestId) ?? queue.find((q) => q.id === req?.id);
    const payer = req?.payerId ?? item?.payerId;
    const program = req?.program ?? item?.program;
    return {
      reason: d.reason,
      payerId: payer && isBuiltIn(payer) ? payer : undefined,
      program,
      dx: program ? DX_OF[item?.dxKey ?? dxKeyFor(d.requestId, program)] : undefined,
      caseId: req?.caseId ?? d.requestId,
    };
  });
}
