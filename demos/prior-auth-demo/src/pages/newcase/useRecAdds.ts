import { useMemo } from "react";
import { resolveCase } from "@/data/caseDetail";
import { EMPTY_WORK } from "@/data/caseModel";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import { appliedAdds, type RecAdd } from "./fromRequest";

/** The sentences the case page's applied actions add to this request's summary, so Review and sign reads what the Draft tab reads. */
export function useRecAdds(draft: CaseDraft | undefined): RecAdd[] {
  const requests = useStore((s) => s.requests);
  const work = useStore((s) => (draft?.caseId ? s.queueCases[draft.caseId] : undefined));
  return useMemo(() => {
    const detail = draft?.caseId ? resolveCase(draft.caseId, requests) : null;
    return detail ? appliedAdds(detail, work ?? EMPTY_WORK) : [];
  }, [draft?.caseId, requests, work]);
}
