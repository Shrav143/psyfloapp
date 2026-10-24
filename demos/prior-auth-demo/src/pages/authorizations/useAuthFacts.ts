import { useMemo } from "react";
import { caseIdOf, type CaseDetail } from "@/data/caseDetail";
import type { CaseWork, LiveView } from "@/data/caseModel";
import { siteOf, type SiteId } from "@/data/sites";
import { useScope } from "@/lib/scope";
import { draftForRequest, requestDraft } from "@/pages/newcase/fromRequest";
import { usePayerContext } from "@/pages/newcase/payerContext";
import { useStore } from "@/store";
import { authFacts, documentStatus, ledgerRowOf, type Fact } from "./facts";

export interface AuthFactsView {
  facts: Fact[];
  docs: ReturnType<typeof documentStatus>;
  /** The case's site, or null for a viewer who can see only one site: a label that never varies tells them nothing. */
  site: SiteId | null;
}

/** The authorization facts for one request, live: the case page's facts row and the queue's quick view read the same list.
    Documents come from the draft this request has in New Case, or the one it would have, so the count never changes when the draft is first opened. */
export function useAuthFacts(detail: CaseDetail, work: CaseWork, live: LiveView | null): AuthFactsView {
  const clock = useStore((s) => s.clock);
  const ledger = useStore((s) => s.ledger);
  const shared = useStore((s) => draftForRequest(s.caseDrafts, detail.requestId, detail.id));
  const payerCtx = usePayerContext(detail);
  const caseId = useStore((s) => caseIdOf(detail.requestId, s.requests));
  const { restricted } = useScope();
  const basis = useMemo(() => shared ?? requestDraft(detail, work, clock, payerCtx), [shared, detail, work, clock, payerCtx]);
  const docs = useMemo(() => documentStatus(basis, payerCtx.items), [basis, payerCtx.items]);
  const site = restricted ? null : siteOf(caseId);
  const workflow = shared?.appliedWorkflow;
  const facts = useMemo(() => authFacts({ detail, live, ledger: ledgerRowOf(ledger, detail), docs, clock, site, workflow }), [detail, live, ledger, docs, clock, site, workflow]);
  return { facts, docs, site };
}
