import { FileText, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardBody, Chip, Pill } from "@/components/ui";
import { PROGRAM_LABEL, type PsyRequest, type Tone } from "@/data/types";
import { band } from "@/lib/format";
import { DAY } from "@/lib/time";
import { payerById } from "@/data/seed";
import { paths } from "@/routes";
import type { Verdict } from "./lib/analysis";
import type { DenialView } from "./lib/useDenialView";
import { isClosed, isFiled, leftLabel } from "./lib/format";

const READ_TONE: Record<Verdict, Tone> = { "Worth challenging": "good", Borderline: "mid", "Probably accept": "risk" };
const LINK = "inline-flex h-[34px] items-center gap-2 rounded-xl border border-field bg-white px-3.5 text-[13px] font-medium hover:bg-tile";

/** The deadline chip while a clock of ours runs. A filed or settled denial says where it stands in Your options instead. */
function windowChip(r: PsyRequest, clock: number): { text: string; tone: Tone } | null {
  if (r.stage !== "appeal" || r.deadlineAt === undefined || isFiled(r)) return null;
  const left = r.deadlineAt - clock;
  const tone: Tone = left < 2 * DAY ? "risk" : left < 7 * DAY ? "mid" : "neutral";
  if (r.clockSub === "peer-to-peer window") return { text: left > 0 ? `Peer-to-peer window closes in ${leftLabel(left)}` : "Peer-to-peer window closed", tone: left > 0 ? tone : "risk" };
  if (r.clockSub === "to file") return { text: left > 0 ? `Appeal due in ${leftLabel(left)}` : "Appeal deadline passed", tone: left > 0 ? tone : "risk" };
  return { text: left > 0 ? `Resubmit within ${leftLabel(left)}` : "Resubmission window closed", tone: left > 0 ? tone : "risk" };
}

/** Who and what the denial is, the read of it, and the two ways out of the page: the report and the case. */
export function DenialHeader({ view }: { view: DenialView }) {
  const { req, meta, analysis, clock, work } = view;
  const chip = windowChip(req, clock);
  const chance = analysis.options[0].chance;
  const settled = isClosed(work);
  return (
    <Card>
      <CardBody className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 grow basis-[min(100%,540px)]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-[24px] leading-none font-semibold tracking-tight">{req.id}</h1>
            <Chip>{PROGRAM_LABEL[req.program]}</Chip>
            <Pill tone="mid">{meta.type}</Pill>
          </div>
          {settled ? null : (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Pill tone={READ_TONE[analysis.verdict]}>{analysis.verdict}</Pill>
              {chance ? <Pill tone={band(chance.value).tone}>{chance.value}% chance of overturning</Pill> : null}
              {chip ? <Pill tone={chip.tone} dot={chip.tone === "risk"}>{chip.text}</Pill> : null}
            </div>
          )}
          <p className="mt-2.5 text-[13px] text-muted">
            {payerById(req.payerId).name} · {req.patient.initials}, {req.patient.age} · {analysis.dx}
            {meta.letterName ? ` · ${meta.letterName}` : ""}
          </p>
          {meta.note ? <p className="mt-1 text-[13px] text-ink2">Note: {meta.note}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={paths.report(req.id)} className={LINK}><FileText size={15} className="ico" />Appeal analysis report</Link>
          <Link to={paths.case(req.caseId)} className={LINK}><FolderOpen size={15} className="ico" />Case {req.caseId}</Link>
        </div>
      </CardBody>
    </Card>
  );
}
