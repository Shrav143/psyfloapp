import { useSearchParams } from "react-router-dom";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import { ReferralChecklist } from "@/pages/referrals/ReferralChecklist";
import { ReferralStart } from "@/pages/referrals/ReferralStart";

/** Step 1: the referral. Drop its documents (or check one that arrived) and Reader lists what is missing, or go on without one.
    The referral on screen is in the address as ?ref=, so Back from its full page returns here. */
export function ReferralStep({ draft }: { draft: CaseDraft }) {
  const [params, setParams] = useSearchParams();
  const referrals = useStore((s) => s.referrals);
  // "?ref=" with nothing after it means the person chose other documents, even though the case already holds a referral.
  const shown = params.get("ref") ?? draft.referralId ?? "";
  const r = referrals.find((x) => x.id === shown);
  const show = (id: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("ref", id);
      return next;
    });

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-[22px]">
      {r ? <ReferralChecklist r={r} draftId={draft.id} onReplace={() => show("")} /> : <ReferralStart draftId={draft.id} onOpen={show} />}
    </div>
  );
}
