import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { referralPrefill } from "@/store/referrals";

/** Where the person came from. `?referral=ID` is set when Verify was opened from a referral, and `?case=ID` once that referral is a case.
    Verify hands both on to the result, so the way back survives the check. A referral that does not exist gives no link. */
export function useOrigin(): { query: string; back: { to: string; label: string } | null } {
  const [params] = useSearchParams();
  const referral = params.get("referral");
  const caseId = params.get("case");
  const known = useStore((s) => !!referral && referralPrefill(s, referral) !== null);
  if (!referral || !known) return { query: "", back: null };
  const query = new URLSearchParams({ referral, ...(caseId ? { case: caseId } : {}) }).toString();
  return { query: `?${query}`, back: caseId ? { to: paths.case(caseId), label: `Back to case ${caseId}` } : { to: paths.referral(referral), label: `Back to referral ${referral}` } };
}

const LINK = "flex w-fit items-center gap-1.5 text-muted hover:text-ink";

/** The links above the page title: the list, and the referral or case the check was started from. */
export function BackLinks({ back }: { back: { to: string; label: string } | null }) {
  return (
    <div className="-mb-1.5 flex flex-wrap items-center gap-x-5 gap-y-1">
      <Link to={paths.eligibility()} className={LINK}>
        <ArrowLeft size={14} className="ico" />
        Eligibility &amp; Benefits
      </Link>
      {back ? (
        <Link to={back.to} className={LINK}>
          <ArrowLeft size={14} className="ico" />
          {back.label}
        </Link>
      ) : null}
    </div>
  );
}
