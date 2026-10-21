import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, FileX, Inbox } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, EmptyState, Segmented, type TabItem } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectReferralBadge } from "@/store/referrals";
import { ReferralInbox } from "@/pages/referrals/ReferralInbox";
import { ReferralUploader } from "@/pages/referrals/ReferralUploader";

type View = "upload" | "inbox" | "none";
const isView = (v: string | null): v is View => v === "upload" || v === "inbox" || v === "none";

/** Step 1: the referral. Upload the one that came in, pick it from the inbox, or go on without one. */
export function ReferralStep({ draft }: { draft: CaseDraft }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const patch = useStore((s) => s.patchCaseDraft);
  const waiting = useStore(selectReferralBadge);
  const asked = params.get("view");
  const view: View = isView(asked) ? asked : "upload";
  const setView = (v: View) => setParams((p) => { const n = new URLSearchParams(p); n.set("view", v); return n; }, { replace: true });

  const items: TabItem<View>[] = [
    { id: "upload", label: "Upload a referral" },
    { id: "inbox", label: "Referral inbox", badge: waiting || undefined },
    { id: "none", label: "No referral" },
  ];
  const next = () => patch(draft.id, { phase: "records" });

  return (
    <>
      {draft.referralId ? (
        <Banner
          tone="good"
          icon={Inbox}
          title={`Referral ${draft.referralId} is part of this case`}
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => nav(paths.referral(draft.referralId ?? "", draft.id))}>View referral</Button>
              <Button size="sm" variant="primary" trailing={ArrowRight} onClick={next}>Continue to medical records</Button>
            </div>
          }
        >
          {draft.patient.initials}, {draft.patient.age}. The patient, payer, level of care and diagnoses were filled in from it. Pick another below to swap it.
        </Banner>
      ) : null}
      <Segmented items={items} value={view} onChange={setView} />
      {view === "upload" ? <ReferralUploader draftId={draft.id} /> : null}
      {view === "inbox" ? <ReferralInbox draftId={draft.id} onUpload={() => setView("upload")} /> : null}
      {view === "none" ? (
        <Card>
          <CardHeader title="No referral" subtitle="A walk-in, a self-referral or a continued stay does not need one." />
          <CardBody>
            <EmptyState icon={FileX} title="Start from the patient instead" action={<Button variant="primary" trailing={ArrowRight} onClick={next}>Continue to medical records</Button>}>
              You add the patient, the payer and the level of care yourself on the next step, then the chart.
            </EmptyState>
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
