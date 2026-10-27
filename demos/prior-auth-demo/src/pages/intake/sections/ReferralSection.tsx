import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Columns2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Drawer } from "@/components/ui";
import { isRequired, specsFor } from "@/data/intake/fields";
import { SECTION_LABEL, type IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { paths } from "@/routes";
import { missingRequired } from "../queue/metrics";
import { FlagSafety } from "../referral/FlagSafety";
import { fieldLabel, referralPending } from "../referral/logic";
import { PhoneChecklist } from "../referral/PhoneChecklist";
import { ReaderStatus } from "../referral/ReaderStatus";
import { RequestInfo } from "../referral/RequestInfo";
import { ReviewWorkspace } from "../referral/ReviewWorkspace";
import { TriagePanel } from "../referral/TriagePanel";

/** B. New Referral: the source document beside the extracted fields (accept, edit or reject each suggestion), contradictions first,
    triage, and what to ask the referrer for. A phone intake opens on its call checklist. */
export function ReferralSection({ record }: { record: IntakeRecord }) {
  const root = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const ctx = { age: record.age, schoolBased: serviceById(record.serviceId).setting === "school" };
  const required = specsFor("referral").filter((s) => isRequired(s, ctx)).length;
  const missing = missingRequired(record, "referral").length;
  const pending = referralPending(record);
  const conflicts = record.suggestions.filter((s) => s.status === "pending" && s.conflict);
  const summary = [`${required - missing} of ${required} required fields`, `${pending.length} suggestion${pending.length === 1 ? "" : "s"} to review`, conflicts.length ? `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ");
  const show = (section: string, field: string) => root.current?.querySelector(`[data-field="${section}.${field}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div ref={root} className="flex min-w-0 flex-col gap-5">
      {record.method === "phone" ? <PhoneChecklist record={record} /> : null}
      <Card>
        <CardHeader title="Referral" subtitle={summary} right={<FlagSafety record={record} />} />
        <CardBody className="flex flex-col gap-4">
          <ReaderStatus record={record} />
          {conflicts.length ? (
            <div data-conflicts className="rounded-xl border border-risk-edge bg-risk-bg px-4 py-3 text-risk-ink">
              <div className="flex items-center gap-2 text-[14px] font-semibold">
                <AlertTriangle size={16} className="ico" />
                Contradictions to confirm
              </div>
              <ul className="mt-1.5 flex flex-col gap-2">
                {conflicts.map((c) => (
                  <li key={c.id} className="text-[13px]">
                    <span className="font-semibold">{fieldLabel(c.field)}:</span> {c.conflict}{" "}
                    <span className="inline-flex flex-wrap gap-x-3">
                      {c.section === "referral" || c.section === "profile" || c.section === "coverage" ? (
                        <button type="button" onClick={() => show(c.section, c.field)} className="font-semibold underline underline-offset-2">Show the suggestion</button>
                      ) : null}
                      {c.section !== "referral" ? <Link to={paths.intakeRecord(record.id, c.section)} className="font-semibold underline underline-offset-2">Open {SECTION_LABEL[c.section]}</Link> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {record.documents.length ? (
            <div>
              <Button size="sm" icon={Columns2} onClick={() => setWide(true)} data-wide-review>Review beside the document</Button>
            </div>
          ) : null}
          <ReviewWorkspace record={record} docId={docId} onDoc={setDocId} />
        </CardBody>
      </Card>
      <TriagePanel record={record} />
      <RequestInfo record={record} />
      {wide ? (
        <Drawer open onClose={() => setWide(false)} width={1320} title="Referral review" subtitle={`${record.id} · ${record.initials || "No name yet"}${record.age !== null ? `, ${record.age}` : ""} · the source beside what was extracted`}>
          <ReviewWorkspace record={record} variant="wide" docId={docId} onDoc={setDocId} />
        </Drawer>
      ) : null}
    </div>
  );
}
