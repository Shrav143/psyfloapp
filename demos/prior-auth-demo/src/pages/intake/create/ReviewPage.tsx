import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, SearchX } from "lucide-react";
import { Banner, Button, Chip, EmptyState, Page, PageHeader } from "@/components/ui";
import { METHOD_LABEL } from "@/data/intake/types";
import { useStore } from "@/store";
import { useIntakeNow } from "../lib/policyNow";
import { ReferralReview } from "../referral/ReferralReview";
import { useDocSpot } from "../referral/useDocSpot";
import { Extracting } from "./Extracting";
import { methodPath } from "./paths";
import { paths } from "@/routes";

/** The review of a referral that was just read: the documents beside the patient, referral, clinical, coverage and consent cards, and the decision. Nothing is in
    the queue until a person saves or decides. */
export function ReviewPage({ draftId }: { draftId: string }) {
  const nav = useNavigate();
  const draft = useStore((s) => s.referralDrafts.find((d) => d.id === draftId));
  const finish = useStore((s) => s.finishIntakeDraft);
  const discard = useStore((s) => s.discardIntakeDraft);
  const now = useIntakeNow();
  const spot = useDocSpot();
  const done = useCallback(() => finish(draftId), [finish, draftId]);
  const cancel = useCallback(() => {
    discard(draftId);
    nav(paths.createReferral());
  }, [discard, draftId, nav]);

  if (!draft) {
    return (
      <Page>
        <EmptyState icon={SearchX} title="That draft is gone" action={<Button onClick={() => nav(paths.createReferral())}>Create a referral</Button>}>
          It was saved, decided or discarded. A saved referral is in the Referral Queue.
        </EmptyState>
      </Page>
    );
  }
  const r = draft.record;
  const simulated = r.documents.some((d) => d.simulated);
  return (
    <Page>
      <Link to={methodPath(r.method === "emr" ? "emr" : r.method === "manual" ? "manual" : r.method === "paste" ? "paste" : "upload")} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest hover:underline"><ArrowLeft size={15} className="ico" />Create referral</Link>
      <PageHeader
        title="Review the referral"
        sub={<>{draft.label} · {METHOD_LABEL[r.method]}</>}
        actions={<><Chip>{draft.id}</Chip>{simulated ? <Chip className="border border-dashed border-field bg-white">Simulated extraction</Chip> : null}</>}
      />
      {draft.step === "extracting" ? (
        <Extracting label={draft.label} onDone={done} onCancel={cancel} />
      ) : (
        <>
          {simulated ? <Banner tone="neutral" title="Draft, simulated">Reader&apos;s extraction is a simulation and a draft until a person confirms it. Every value shows where it came from and how sure Reader is.</Banner> : null}
          <ReferralReview record={r} now={now} spot={spot} variant="page" dupChosen={draft.dup} />
        </>
      )}
    </Page>
  );
}
