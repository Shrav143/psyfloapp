import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { resolveCase } from "@/data/caseDetail";
import CasePage from "@/pages/authorizations/CasePage";
import { useStore } from "@/store";
import LedgerCasePage from "./LedgerCasePage";
import { useLedgerRows } from "./ledgerRows";

/** /authorizations/case/:id. A request in the queue or on the Dashboard gets the Authorizations case page; a case that is only in the Case Manager ledger gets its ledger summary; any other id gets the case page's own "Request not found". */
export default function CaseRoute() {
  const { id = "" } = useParams();
  const requests = useStore((s) => s.requests);
  const rows = useLedgerRows();
  const isRequest = useMemo(() => resolveCase(id, requests) !== null, [id, requests]);
  const row = rows.find((c) => c.id === id || c.caseId === id);
  return !isRequest && row ? <LedgerCasePage row={row} /> : <CasePage />;
}
