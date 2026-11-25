import type { CaseDetail } from "@/data/caseDetail";
import { paths } from "@/routes";
import { useStore } from "@/store";

/** Where "Open in review and sign" and "Send to payer" go: the New Authorization flow's draft for this request, at the step that fits.
    The draft is made from the request's own data when there is none (patient, payer, level of care, documents, a finished run when the request is ready),
    and brought up to date when there is. Review and sign when the request is ready, Agents work when agents still have work to do. Never a blank draft. */
export function reviewPath(detail: CaseDetail): string {
  return paths.newCase({ draft: useStore.getState().draftFromRequest(detail.requestId) });
}
