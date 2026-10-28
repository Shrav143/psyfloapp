import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Columns2, FileText } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Drawer } from "@/components/ui";
import { SECTION_LABEL, type IntakeRecord } from "@/data/intake/types";
import { paths } from "@/routes";
import { useIntakeNow } from "../lib/policyNow";
import { BulkAccept } from "../referral/BulkAccept";
import { DecisionSummary } from "../referral/DecisionSummary";
import { DocumentChecks } from "../referral/DocumentChecks";
import { DocumentPane } from "../referral/DocumentPane";
import { FlagSafety } from "../referral/FlagSafety";
import { Handling } from "../referral/Handling";
import { fieldLabel, referralPending } from "../referral/logic";
import { conflictsOf } from "../referral/missing";
import { Notices } from "../referral/Notices";
import { Waiting } from "../referral/Waiting";
import { PhoneChecklist } from "../referral/PhoneChecklist";
import { ReaderStatus } from "../referral/ReaderStatus";
import { ReferralHistory } from "../referral/ReferralHistory";
import { ReferralReview } from "../referral/ReferralReview";
import { useDocSpot } from "../referral/useDocSpot";
import { AddDocumentButton } from "../referral/AddDocument";

/** The referral in the workspace: the decision (while it is still a referral) or the record of it, the patient, referral, clinical, coverage and consent values with
    where each came from, what is missing, the document checks, the notices to the referrer, who has it, the source documents and the history. */
export function ReferralSection({ record }: { record: IntakeRecord }) {
  const now = useIntakeNow();
  const spot = useDocSpot();
  const wide = useDocSpot();
  const [open, setOpen] = useState(false);
  const pending = record.triage === "new" || record.triage === "needs_info";
  const suggestions = referralPending(record);
  const suggestionConflicts = suggestions.filter((s) => s.conflict);
  const conflicts = conflictsOf(record);
  const showRow = (section: string, field: string) => document.querySelector(`[data-field="${section}.${field}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  const showDoc = (s: { docId: string; blockId: string }) => {
    spot.show(s);
    document.querySelector("[data-docs-card]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="@container flex min-w-0 flex-col gap-5" data-referral-section>
      {record.method === "phone" ? <PhoneChecklist record={record} /> : null}
      <Card>
        <CardHeader
          title="Referral"
          subtitle={`${record.id}${record.legacyReferralId ? ` · from ${record.legacyReferralId}` : ""} · ${record.documents.length} document${record.documents.length === 1 ? "" : "s"}`}
          right={
            <>
              {record.documents.length ? <Button size="sm" icon={Columns2} onClick={() => setOpen(true)} data-wide-review>Review beside the document</Button> : null}
              <FlagSafety record={record} />
            </>
          }
        />
      </Card>
      {pending ? null : <DecisionSummary record={record} />}
      <ReaderStatus record={record} />
      <Waiting record={record} />
      {suggestionConflicts.length || conflicts.length ? (
        <div data-conflicts className="rounded-xl border border-risk-edge bg-risk-bg px-4 py-3 text-risk-ink">
          <div className="flex items-center gap-2 text-[14px] font-semibold"><AlertTriangle size={16} className="ico" />Contradictions to confirm</div>
          <ul className="mt-1.5 flex flex-col gap-2">
            {conflicts.map((c) => (
              <li key={`${c.section}.${c.key}`} className="text-[13px]">
                <span className="font-semibold">{fieldLabel(c.key)}:</span> {c.text}{" "}
                <button type="button" onClick={() => showRow(c.section, c.key)} className="font-semibold underline underline-offset-2">Show the value</button>
              </li>
            ))}
            {suggestionConflicts.map((c) => (
              <li key={c.id} className="text-[13px]">
                <span className="font-semibold">{fieldLabel(c.field)}:</span> {c.conflict}{" "}
                <span className="inline-flex flex-wrap gap-x-3">
                  {c.section === "referral" || c.section === "profile" || c.section === "coverage" ? <button type="button" onClick={() => showRow(c.section, c.field)} className="font-semibold underline underline-offset-2">Show the suggestion</button> : null}
                  {c.section !== "referral" ? <Link to={paths.intakeRecord(record.id, c.section)} className="font-semibold underline underline-offset-2">Open {SECTION_LABEL[c.section]}</Link> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {suggestions.length ? <div className="flex flex-wrap items-center gap-2"><BulkAccept record={record} /></div> : null}
      <ReferralReview record={record} now={now} spot={spot} variant="section" pending={pending} />
      <DocumentChecks record={record} onShow={showDoc} />
      <Notices record={record} />
      <Handling record={record} showAssign={!pending} />
      <Card data-docs-card>
        <CardHeader title="Source documents" subtitle={record.documents.length ? "Click a passage to find the values taken from it." : "No document. Add the referral or a supporting document and Reader suggests values."} right={<AddDocumentButton record={record} onAdded={spot.setDocId} />} />
        <CardBody>
          <DocumentPane
            record={record}
            docId={spot.docId}
            onDoc={spot.setDocId}
            blockId={spot.spot && spot.spot.docId === (spot.docId ?? record.documents[0]?.id) ? spot.spot.blockId : null}
            onBlockClick={spot.findFields}
            boxClass="max-h-[440px]"
            empty={<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-field px-4 py-8 text-center text-[13px] text-muted"><FileText size={20} className="ico" />No document yet.</div>}
          />
        </CardBody>
      </Card>
      <ReferralHistory record={record} />
      {open ? (
        <Drawer open onClose={() => setOpen(false)} width={1320} title="Referral review" subtitle={`${record.id} · ${record.initials || "No name yet"}${record.age !== null ? `, ${record.age}` : ""} · the source beside what was read`}>
          <ReferralReview record={record} now={now} spot={wide} variant="page" pending={pending} withDecision={false} />
        </Drawer>
      ) : null}
    </div>
  );
}
