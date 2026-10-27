import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, SearchX } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { Button, Crumbs, EmptyState, Page, Stepper, UnderlineTabs, type TabItem } from "@/components/ui";
import { buildDocs, issueCount, locate, type CheckKey, type DocId } from "@/data/referrals";
import { useScope } from "@/lib/scope";
import { NEW_CASE_STEPS } from "@/pages/newcase/steps";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { askable, type AskKey } from "@/store/referralsLogic";
import { ActivityTab } from "./ActivityTab";
import { checklistPath } from "./checklist";
import { caseOf } from "./referralCase";
import { CoverageTab } from "./CoverageTab";
import { DecisionBanners, type DetailTab } from "./DecisionBanners";
import { DocumentPanel } from "./DocumentPanel";
import { ExtractedTab } from "./ExtractedTab";
import { FitTab } from "./FitTab";
import { AcceptModal } from "./modals/AcceptModal";
import { DeclineModal } from "./modals/DeclineModal";
import { NoteModal } from "./modals/NoteModal";
import { OverrideModal } from "./modals/OverrideModal";
import { RequestInfoModal } from "./modals/RequestInfoModal";
import { ScheduleModal } from "./modals/ScheduleModal";
import { ReferralHeader } from "./ReferralHeader";
import { ValidationTab } from "./ValidationTab";

type ModalState = { kind: "accept" } | { kind: "info"; keys: AskKey[] } | { kind: "decline" } | { kind: "override"; key: CheckKey } | { kind: "schedule" } | { kind: "note" } | null;

/** One referral: the document on the left, what the agents made of it on the right, and the decision. */
export default function ReferralDetailPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const scope = useScope();
  const [params] = useSearchParams();
  const r = useStore((s) => s.referrals.find((x) => x.id === id));
  const markOpened = useStore((s) => s.markReferralOpened);
  const requests = useStore((s) => s.requests);
  const drafts = useStore((s) => s.caseDrafts);
  // A link without a case (the bell, or back from Eligibility) still leads back to the draft that holds this referral.
  const draftId = params.get("draft") ?? drafts.find((d) => d.referralId === id && !d.sent)?.id;
  const crumbs = (last: string, checklist?: string) => [{ label: "New Case", to: paths.newCase({ draft: draftId }) }, { label: "Referral", to: checklist ?? paths.newCase({ draft: draftId }) }, { label: last }];
  const [tab, setTab] = useState<DetailTab>("extracted");
  const [hl, setHl] = useState<string | null>(null);
  const [docId, setDocId] = useState<DocId>("form");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    if (r && scope.has(r.id)) markOpened(r.id);
  }, [r?.id, markOpened, scope]);
  useEffect(() => {
    setTab("extracted");
    setHl(null);
    setDocId("form");
    setPage(1);
    setModal(null);
  }, [id]);
  useEffect(() => {
    if (tab === "extracted" && hl) document.querySelector(`[data-field="${hl}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [hl, tab]);

  const docs = useMemo(() => (r ? buildDocs(r) : []), [r]);

  /* A referral at a site the viewer cannot see does not exist for them: no patient, no detail. */
  if (r && !scope.has(r.id)) return <OutOfSite id={r.id} what="referral" />;
  if (!r) {
    return (
      <Page>
        <Crumbs items={crumbs(id)} />
        <EmptyState icon={SearchX} title="That referral is not in the demo" action={<Link to={paths.newCase({ draft: draftId })}><Button>Back to the case</Button></Link>}>
          Referral {id} does not exist. Go back to the case to drop the documents or pick one that arrived.
        </EmptyState>
      </Page>
    );
  }

  const show = (blockId: string) => {
    const ev = locate(docs, blockId);
    if (!ev) return;
    setDocId(ev.doc);
    setPage(ev.page);
    setHl(blockId);
  };
  const fromDocument = (blockId: string) => {
    show(blockId);
    if (r.fields.some((f) => f.key === blockId)) setTab("extracted");
  };
  const issues = issueCount(r.checks);
  const tabs: TabItem<DetailTab>[] = [
    { id: "extracted", label: "Extracted" },
    { id: "validation", label: "Validation", badge: issues || undefined },
    { id: "coverage", label: "Coverage" },
    { id: "fit", label: "Fit" },
    { id: "activity", label: "Activity" },
  ];
  const overriding = modal?.kind === "override" ? r.checks.find((c) => c.key === modal.key) : undefined;

  return (
    <Page>
      <div className="-mb-1.5 flex flex-wrap items-center justify-between gap-3">
        <Crumbs items={crumbs(r.id, draftId ? checklistPath(draftId, r.id) : paths.newCase())} />
        <Button size="sm" icon={ArrowLeft} onClick={() => nav(paths.newCase({ draft: draftId }))}>Back to the case</Button>
      </div>
      <Stepper steps={NEW_CASE_STEPS} current={0} className="flex-wrap gap-y-2" />
      <ReferralHeader r={r} hasCase={!!caseOf(r, requests, drafts)} onAccept={() => setModal({ kind: "accept" })} onInfo={() => setModal({ kind: "info", keys: askable(r) })} onDecline={() => setModal({ kind: "decline" })} onNote={() => setModal({ kind: "note" })} onSchedule={() => setModal({ kind: "schedule" })} />
      <DecisionBanners r={r} onTab={setTab} draftId={draftId} tab={tab} />
      <div className="grid grid-cols-1 items-start gap-[22px] min-[1100px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-[1100px]:sticky min-[1100px]:top-[78px]">
          <DocumentPanel r={r} docs={docs} docId={docId} page={page} highlightId={hl} onDoc={(d) => { setDocId(d); setPage(1); setHl(null); }} onPage={setPage} onBlock={fromDocument} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <UnderlineTabs items={tabs} value={tab} onChange={setTab} />
          {tab === "extracted" ? <ExtractedTab r={r} docs={docs} selected={hl} onSelect={show} /> : null}
          {tab === "validation" ? <ValidationTab r={r} onView={show} onRequest={(keys) => setModal({ kind: "info", keys })} onOverride={(key) => setModal({ kind: "override", key })} /> : null}
          {tab === "coverage" ? <CoverageTab r={r} /> : null}
          {tab === "fit" ? <FitTab r={r} /> : null}
          {tab === "activity" ? <ActivityTab r={r} /> : null}
        </div>
      </div>

      {modal?.kind === "accept" ? <AcceptModal r={r} onClose={() => setModal(null)} /> : null}
      {modal?.kind === "info" ? <RequestInfoModal r={r} keys={modal.keys} onClose={() => setModal(null)} /> : null}
      {modal?.kind === "decline" ? <DeclineModal ids={[r.id]} onClose={() => setModal(null)} /> : null}
      {modal?.kind === "override" && overriding ? <OverrideModal id={r.id} check={overriding} onClose={() => setModal(null)} /> : null}
      {modal?.kind === "schedule" ? <ScheduleModal r={r} onClose={() => setModal(null)} /> : null}
      {modal?.kind === "note" ? <NoteModal id={r.id} onClose={() => setModal(null)} /> : null}
    </Page>
  );
}
