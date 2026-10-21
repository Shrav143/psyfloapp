import type { CaseDetail } from "@/data/caseDetail";
import { paths } from "@/routes";
import { useStore } from "@/store";

/** Where "Open in review and sign" and "Send to payer" go: the New case flow's draft for this request.
    The flow names its drafts "draft-r1042" (see the notification link in the seed). A request without a draft yet gets one,
    pre-filled from the request, so the link never dead-ends. */
export function reviewPath(detail: CaseDetail): string {
  const st = useStore.getState();
  const conventional = `draft-${detail.id.toLowerCase().replace("-", "")}`;
  const existing = st.caseDrafts.find((d) => d.id === conventional || d.caseId === detail.id);
  if (existing) return paths.newCase({ draft: existing.id });
  const id = st.createCaseDraft({ caseId: detail.id, patient: { initials: detail.initials, age: detail.age }, payerId: detail.payerId, program: detail.program, type: detail.type, reason: detail.dx });
  return paths.newCase({ draft: id });
}
