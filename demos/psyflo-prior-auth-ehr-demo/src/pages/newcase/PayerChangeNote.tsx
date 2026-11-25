import { RefreshCw } from "lucide-react";
import type { CaseDraft } from "@/data/cases";
import { shortDate } from "@/lib/time";
import { useStore } from "@/store";

/** One line for a draft that Payers redrafted after a payer change ("Update drafts"): it says when, so the person knows the rules under it are new. */
export function PayerChangeNote({ draft }: { draft: CaseDraft }) {
  const update = useStore((s) => s.payerChangeUpdates.find((u) => u.draftIds.some((id) => id === draft.caseId || id === draft.id)));
  if (!update) return null;
  return (
    <p className="flex items-center gap-2 px-1 text-[13px] text-muted">
      <RefreshCw size={14} className="ico shrink-0" />
      Updated for a payer change on {shortDate(update.at)}
    </p>
  );
}
