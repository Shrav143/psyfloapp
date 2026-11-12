import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { resolveCase } from "@/data/caseDetail";
import { useScope } from "@/lib/scope";
import CasePage from "@/pages/authorizations/CasePage";
import { useStore } from "@/store";
import LedgerCasePage from "./LedgerCasePage";
import { useLedgerRows } from "./ledgerRows";

/** /authorizations/case/:id. A request in the queue or on the Dashboard gets the Authorizations case page; a case that is only in the Case Manager ledger gets its ledger summary; any other id gets the case page's own "Request not found".
    A case at a site the viewer is not looking at gets the out-of-site card instead of either page. */
export default function CaseRoute() {
  const { id = "" } = useParams();
  const scope = useScope();
  const requests = useStore((s) => s.requests);
  const rows = useLedgerRows(false);
  /* A request prepared from an intake record has no generated case detail but is a request: its page is the one made for it (IntakeRequestPage, drawn by CasePage), not a ledger summary. */
  const isRequest = useMemo(() => resolveCase(id, requests) !== null || requests.some((r) => !!r.intakeId && (r.id === id || r.caseId === id)), [id, requests]);
  const row = rows.find((c) => c.id === id || c.caseId === id);
  // The site follows the case, so a request is placed by its case id (a denial's id is not its case's).
  const caseId = (requests.find((r) => r.id === id) ?? requests.find((r) => r.caseId === id))?.caseId ?? row?.caseId ?? id;
  if ((isRequest || row) && !scope.has(caseId)) return <OutOfSite id={caseId} what="case" />;
  return !isRequest && row ? <LedgerCasePage row={row} /> : <CasePage />;
}
