import { FileX } from "lucide-react";
import { InfoTip } from "@/components/ui";
import { findReferralDuplicates } from "@/data/intake/referralFacts";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { intakesInView } from "@/store/intakeSelectors";
import { isReferralDraftId } from "@/store/intakeReferral";
import { AddDocumentButton } from "./AddDocument";
import { DecisionBar } from "./DecisionBar";
import { DocumentPane } from "./DocumentPane";
import { DuplicatePanel } from "./DuplicatePanel";
import { MissingCard } from "./MissingCard";
import { RequestInfoDialog } from "./RequestInfoDialog";
import { RiskBanner } from "./RiskBanner";
import { ClinicalCard, ConsentCard, CoverageCard, PatientCard, ReferralCard } from "./SummaryCards";
import type { DocSpotState } from "./useDocSpot";

/** The documents beside the cards: patient, referral, clinical information, payer and coverage, consents and what is missing. The same screen reviews a draft
    that was just read and a saved referral. In the page variant the documents sit at the left and stay in view; the decision stays at the top of the cards. */
export function ReferralReview({ record, now, spot, variant, pending = true, withDecision = true, dupChosen }: {
  record: IntakeRecord; now: number; spot: DocSpotState; variant: "page" | "section";
  /** Still a referral (a draft, New or Needs information): the decision, the duplicate check and what is missing show. */
  pending?: boolean; withDecision?: boolean; dupChosen?: { ofId: string; reason: string };
}) {
  const nav = useNavigate();
  const draft = isReferralDraftId(record.id);
  const all = useStore((s) => s.intakes);
  const scopeKey = useStore((s) => `${s.viewerId}${s.siteScope}`);
  const [asking, setAsking] = useState(false);
  const dups = useMemo(() => {
    if (!draft) return [];
    return findReferralDuplicates(intakesInView(useStore.getState(), false), { initials: record.initials, dob: record.profile.dob?.value, age: record.age, memberLast4: record.coverage.medicaidId?.value });
  }, [draft, all, scopeKey, record.initials, record.age, record.profile.dob?.value, record.coverage.medicaidId?.value]); // eslint-disable-line react-hooks/exhaustive-deps
  const shared = { record, active: spot.spot, onSpot: spot.onSpot };
  const page = variant === "page";
  return (
    <div ref={spot.root} className="@container" data-referral-review>
      <div className={cn("grid grid-cols-1 gap-5", page && "@min-[1000px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]")}>
        {page ? (
          <div className="min-w-0 @min-[1000px]:sticky @min-[1000px]:top-[76px] @min-[1000px]:self-start">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1 text-[16px] font-semibold">
                Source documents
                <InfoTip label="About the outline">Hover or focus a value to outline where it came from. Click a passage in the document to find the values taken from it.</InfoTip>
              </h3>
              {!draft ? <AddDocumentButton record={record} onAdded={spot.setDocId} /> : null}
            </div>
            <DocumentPane
              record={record}
              docId={spot.docId}
              onDoc={spot.setDocId}
              blockId={spot.spot && spot.spot.docId === (spot.docId ?? record.documents[0]?.id) ? spot.spot.blockId : null}
              onBlockClick={spot.findFields}
              boxClass="max-h-[440px] @min-[1000px]:max-h-[calc(100vh-130px)]"
              empty={
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-field px-4 py-8 text-center text-[13px] text-muted">
                  <FileX size={20} className="ico" />
                  No document. This referral was entered by hand.
                </div>
              }
            />
            {spot.pin ? <p className="mt-2 text-[12px] text-muted">Outlined: the source of the highlighted values. <button type="button" className="font-semibold text-forest hover:underline" onClick={spot.clearPin}>Clear</button></p> : null}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col gap-5">
          {pending && withDecision ? <DecisionBar record={record} dups={dups} dupChosen={!!dupChosen} /> : null}
          <RiskBanner record={record} />
          {pending && draft ? <DuplicatePanel draftId={record.id} hits={dups} chosen={dupChosen} /> : null}
          <PatientCard {...shared} />
          <ReferralCard {...shared} now={now} />
          <ClinicalCard {...shared} />
          <CoverageCard {...shared} />
          <ConsentCard {...shared} />
          {pending ? <MissingCard record={record} onRequest={() => setAsking(true)} canAct /> : null}
        </div>
      </div>
      {asking ? <RequestInfoDialog record={record} onClose={() => setAsking(false)} onDone={(id) => { setAsking(false); if (draft) nav(paths.intakeRecord(id, "referral")); }} /> : null}
    </div>
  );
}
