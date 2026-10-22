import { ArrowUpRight, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Drawer, KeyValue, Label, Pill } from "@/components/ui";
import { CMS_HOURS, DX_LABEL, KIND_LABEL, OUTCOME_LABEL, POPULATION_LABEL, dateOfDay, type Decision } from "@/data/decisions";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { paths } from "@/routes";
import { OUTCOME_TONE } from "./CaseTable";
import { useCopy } from "./useCopy";
import { amountText, caseSummary, daysToDecision } from "./summary";

/* One decision, in plain words: who, what was asked, what the payer decided and why, what was done about it, and a short neutral timeline.
   The timeline is built from the record, so each line is a fact the dataset holds. */

interface Step {
  at: number;
  actor: "you" | "payer";
  text: string;
  detail?: string;
}
export function timelineOf(d: Decision): Step[] {
  const sentDay = d.day + Math.floor(d.hours / 24);
  const steps: Step[] = [{ at: sentDay, actor: "you", text: `Request sent to ${payerById(d.payerId).name}`, detail: `${KIND_LABEL[d.kind]}, ${PROGRAM_LABEL[d.program]}, ${d.requested} ${d.unit} asked${d.expedited ? ". Marked expedited" : ""}` }];
  if (d.infoRequest) steps.push({ at: Math.max(d.day, sentDay - Math.max(1, Math.floor(d.hours / 48))), actor: "payer", text: "The payer asked for more information" });
  steps.push({ at: d.day, actor: "payer", text: `Decision: ${OUTCOME_LABEL[d.outcome].toLowerCase()}`, detail: `${amountText(d)}${d.reason ? `. Reason: ${d.reason}` : ""}` });
  if (d.p2p === "scheduled") steps.push({ at: d.day, actor: "you", text: "Peer-to-peer call booked, not held yet" });
  if (d.p2p === "changed" || d.p2p === "stood") steps.push({ at: Math.max(0, d.day - 2), actor: "you", text: "Peer-to-peer call held", detail: d.p2p === "changed" ? "The reviewer changed the decision" : "The decision stood" });
  if (d.appeal === "pending") steps.push({ at: Math.max(0, d.day - 3), actor: "you", text: "Appeal filed", detail: "No ruling yet" });
  if (d.appeal === "overturned" || d.appeal === "partly" || d.appeal === "upheld") {
    steps.push({ at: Math.max(0, d.day - 4), actor: "you", text: "Appeal filed" });
    steps.push({ at: Math.max(0, d.day - 14), actor: "payer", text: "Appeal ruling", detail: d.appeal === "upheld" ? "The denial was upheld" : d.appeal === "partly" ? "The decision was partly restored" : "The decision was overturned" });
  }
  if (d.accepted) steps.push({ at: Math.max(0, d.day - 5), actor: "you", text: "The clinic accepted the denial" });
  return steps;
}

export function CasePanel({ d, width, onClose }: { d: Decision; width: number; onClose: () => void }) {
  const copy = useCopy();
  const steps = timelineOf(d);
  const past = d.pastCms === true;
  const limit = d.expedited ? `${CMS_HOURS.expedited} hours` : `${CMS_HOURS.standard / 24} days`;
  return (
    <Drawer
      open
      onClose={onClose}
      width={width}
      title={d.id}
      subtitle={`${d.initials}, ${d.age} · ${payerById(d.payerId).name}`}
      right={
        <Button size="sm" icon={Copy} onClick={() => copy(caseSummary(d), "Case summary copied")}>
          Copy summary
        </Button>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12.5px] text-muted">{d.linkId ? `An earlier decision for the patient on ${d.linkId}.` : d.inDemo ? "This case is in the demo." : "A past case: it has no page in this demo."}</span>
          <span className="flex flex-wrap items-center gap-2">
            {d.denialId ? (
              <Link to={paths.denials(d.denialId)} className="inline-flex h-[38px] items-center gap-2 rounded-xl border border-field bg-white px-4 text-sm font-medium hover:bg-tile">
                Open the denial
              </Link>
            ) : null}
            {d.inDemo ? (
              <Link to={paths.case(d.linkId ?? d.denialId ?? d.id)} className="inline-flex h-[38px] items-center gap-2 rounded-xl border border-transparent bg-forest px-4 text-sm font-medium text-white hover:bg-forest-dark">
                Open case
                <ArrowUpRight size={16} className="ico" aria-hidden="true" />
              </Link>
            ) : null}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-6" data-testid="case-panel">
        <section className="rounded-2xl border border-line bg-white px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone={OUTCOME_TONE[d.outcome]}>{OUTCOME_LABEL[d.outcome]}</Pill>
            <span className="text-[15px] font-semibold">{amountText(d)}</span>
          </div>
          {d.outcome !== "approved" ? (
            <svg width="100%" height="10" role="img" aria-label={`${d.approvedAmt} of ${d.requested} ${d.unit} approved`} className="mt-3 block">
              <rect width="100%" height="10" rx="5" fill="#F0ECE4" />
              <rect width={`${(d.approvedAmt / d.requested) * 100}%`} height="10" rx="5" fill={d.outcome === "partial" ? "#8F6620" : "#B5553A"} />
            </svg>
          ) : null}
          {d.reason ? (
            <div className="mt-4">
              <Label>Reason</Label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{d.reason}</span>
                <Pill tone={d.preventable ? "mid" : "neutral"}>{d.preventable ? "Preventable" : "Not preventable"}</Pill>
              </div>
              <p className="mt-1 text-[13px] text-muted">{d.preventable ? "The documentation or the timing could have been fixed before sending." : "This reads the payer's criteria differently. Better paperwork alone would not change it."}</p>
            </div>
          ) : null}
        </section>

        <KeyValue
          items={[
            ["Payer", payerById(d.payerId).name],
            ["Program", PROGRAM_LABEL[d.program]],
            ["Request type", KIND_LABEL[d.kind]],
            ["Diagnosis group", DX_LABEL[d.dx]],
            ["Population", POPULATION_LABEL[d.population]],
            ["Site", `Site ${d.site}`],
            ["Decided", dateOfDay(d.day)],
            ["Time to decision", `${daysToDecision(d)}${d.expedited ? ", expedited" : ""}`],
            ["CMS decision time", d.pastCms === null ? "Does not apply to this payer" : past ? `Past it (${limit} for this request)` : `Within it (${limit})`],
            ["More information", d.infoRequest ? "The payer asked for more" : "Not asked"],
          ]}
          className="[&_dt]:text-[13px] [&_dd]:text-[14px]"
        />

        <section>
          <Label>What was done</Label>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">
            <li>Peer-to-peer: {d.p2p === "none" ? "no call" : d.p2p === "scheduled" ? "call booked, not held yet" : d.p2p === "changed" ? "the reviewer changed the decision" : "the decision stood"}</li>
            <li>Appeal: {d.appeal === "none" ? "none filed" : d.appeal === "pending" ? "filed, no ruling yet" : d.appeal === "upheld" ? "ruled, the denial was upheld" : d.appeal === "partly" ? "ruled, partly restored" : "ruled, overturned"}</li>
            {d.outcome !== "approved" ? <li>Clinic: {d.accepted ? "accepted the denial" : "has not accepted it"}</li> : null}
          </ul>
        </section>

        <section>
          <Label>Timeline</Label>
          <ol className="relative mt-3 pl-[26px]" data-testid="case-timeline">
            <span className="absolute top-2 bottom-3 left-[5px] w-0.5 bg-[#EADFD2]" aria-hidden="true" />
            {steps.map((s) => (
              <li key={`${s.at}-${s.text}`} className="relative pb-[16px] last:pb-0">
                <span className="absolute top-[4px] -left-[26px] h-3 w-3 rounded-full bg-good" aria-hidden="true" />
                <div className="text-xs text-muted">
                  {dateOfDay(s.at)} · {s.actor === "payer" ? "Payer" : "Clinic"}
                </div>
                <div className="mt-0.5 text-[14px] font-medium">{s.text}</div>
                {s.detail ? <div className="mt-1 text-[13px] text-ink2">{s.detail}</div> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Drawer>
  );
}
