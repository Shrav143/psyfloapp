import { useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, RotateCcw } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Field, KeyValue, Modal, Pill, TextArea } from "@/components/ui";
import { DECISION_LABEL } from "@/data/intake/decision";
import { staffOf } from "@/data/intake/seed";
import { TRIAGE_LABEL, type IntakeRecord } from "@/data/intake/types";
import { effectiveStatus } from "@/data/assess/status";
import { longDate, stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { STATUS_TONE_REF } from "./labels";

type Ask = "reopen" | "close" | null;

/** The read-only record of what was decided about a referral, with the next step. A declined, redirected or closed referral can be reopened with a reason. */
export function DecisionSummary({ record }: { record: IntakeRecord }) {
  const reopen = useStore((s) => s.reopenIntakeReferral);
  const close = useStore((s) => s.closeIntakeReferral);
  const unlist = useStore((s) => s.removeIntakeFromWaitlist);
  const [ask, setAsk] = useState<Ask>(null);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const d = record.referralDecision;
  const status = effectiveStatus(record);
  const ended = record.triage === "declined" || record.triage === "redirected" || record.triage === "closed";
  const notice = d?.noticeId ? record.referralNotices?.find((n) => n.id === d.noticeId) : undefined;
  const title = d ? DECISION_LABEL[d.kind] : ended ? TRIAGE_LABEL[record.triage] : "Accepted for assessment";
  /* The person's note, or the status note (an authorization started from it, a visit booked) when the decision has no reason of its own. */
  const note = d?.note ?? (d?.reason ? undefined : record.triageNote);
  const by = d ? staffOf(d.by)?.name ?? d.by : undefined;
  const rows: [string, React.ReactNode][] = [
    ...(by && d ? ([["Decided by", `${by} · ${longDate(d.at)} ${stamp(d.at).split(" ").slice(1).join(" ")}`]] as [string, React.ReactNode][]) : []),
    ...(d?.reason ? ([["Reason", d.reason]] as [string, React.ReactNode][]) : []),
    ...(d?.destination ? ([["Sent to", d.destination.org]] as [string, React.ReactNode][]) : []),
    ...(note ? ([["Note", note]] as [string, React.ReactNode][]) : []),
    ...(notice ? ([["Notice to the referrer", notice.status === "sent" ? `Sent (simulated) ${stamp(notice.sentAt ?? notice.createdAt)}` : notice.status === "draft" ? "Draft, not sent. Review it below." : "Discarded"]] as [string, React.ReactNode][]) : []),
  ];
  const confirm = () => {
    setTried(true);
    if (!reason.trim()) return;
    if (ask === "reopen") reopen(record.id, reason);
    else if (ask === "close") close(record.id, reason);
    setAsk(null);
    setReason("");
    setTried(false);
  };
  return (
    <Card data-card="Referral decision">
      <CardHeader title="Referral decision" subtitle="Read-only. The history below has the detail." right={<Pill tone={STATUS_TONE_REF[status]}>{title}</Pill>} />
      <CardBody className="flex flex-col gap-3">
        {rows.length ? <KeyValue items={rows} /> : null}
        {record.waitlist ? (
          <Banner tone="mid" title={`On the waitlist for ${record.waitlist.label}, position ${record.waitlist.position}`} action={<Button size="sm" onClick={() => unlist(record.id)}>Remove from waitlist</Button>}>
            Since {longDate(record.waitlist.since)}. {record.waitlist.note ?? ""}
          </Banner>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {!ended && !record.config ? <Link to={paths.configure(record.id)} className="inline-flex h-[38px] items-center gap-2 rounded-xl bg-forest px-4 text-sm font-medium text-white hover:bg-forest-dark" data-configure><ListChecks size={16} className="ico" />Configure the intake</Link> : null}
          {record.config ? <Link to={paths.configure(record.id)} className="text-[13px] font-semibold text-forest hover:underline">Open the configuration</Link> : null}
          {ended ? <Button icon={RotateCcw} onClick={() => setAsk("reopen")} data-reopen>Reopen the referral</Button> : null}
          {!ended && !record.config ? <Button variant="ghost" onClick={() => setAsk("close")} data-close-referral>Close the referral</Button> : null}
        </div>
      </CardBody>
      {ask ? (
        <Modal
          open
          onClose={() => setAsk(null)}
          size="sm"
          title={ask === "reopen" ? "Reopen the referral" : "Close the referral"}
          subtitle={ask === "reopen" ? "It goes back to New. The reason is saved." : "It is closed with no further work. The reason is saved."}
          footer={<><Button onClick={() => setAsk(null)}>Cancel</Button><Button variant="primary" onClick={confirm}>{ask === "reopen" ? "Reopen" : "Close"}</Button></>}
        >
          <Field label="Reason" required error={tried && !reason.trim() ? "Enter a reason." : undefined}>
            <TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
          </Field>
        </Modal>
      ) : null}
    </Card>
  );
}
