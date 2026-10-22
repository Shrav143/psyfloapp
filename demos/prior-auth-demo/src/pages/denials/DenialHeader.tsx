import { FileText, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, Chip, Pill } from "@/components/ui";
import { PROGRAM_LABEL, type PsyRequest, type Tone } from "@/data/types";
import { band } from "@/lib/format";
import { DAY } from "@/lib/time";
import { payerById } from "@/data/seed";
import { paths } from "@/routes";
import { cn } from "@/lib/cn";
import type { DenialView } from "./lib/useDenialView";
import type { OptionId } from "./lib/analysis";
import type { RecommendedStep } from "./lib/step";
import { capitalize, leftLabel } from "./lib/format";
import { NextStep } from "./NextStep";

const READ_TONE: Record<string, string> = { "Worth challenging": "bg-good-bg text-good-ink", Borderline: "bg-mid-bg text-mid-ink", "Probably accept": "bg-risk-bg text-risk-ink" };

/** The deadline chip: how long the window is open, or where the denial stands once it has been filed. */
function windowChip(r: PsyRequest, clock: number): { text: string; tone: Tone } | null {
  if (r.stage !== "appeal") return { text: `${r.chip}. ${r.next}`, tone: r.tone };
  if (r.deadlineAt !== undefined) {
    const left = r.deadlineAt - clock;
    const tone: Tone = left < 2 * DAY ? "risk" : left < 7 * DAY ? "mid" : "neutral";
    if (r.clockSub === "peer-to-peer window") return { text: left > 0 ? `Peer-to-peer window closes in ${leftLabel(left)}` : "Peer-to-peer window closed", tone: left > 0 ? tone : "risk" };
    if (r.clockSub === "to file") return { text: left > 0 ? `Appeal due in ${leftLabel(left)}` : "Appeal deadline passed", tone: left > 0 ? tone : "risk" };
    return { text: left > 0 ? `Resubmit within ${leftLabel(left)}` : "Resubmission window closed", tone: left > 0 ? tone : "risk" };
  }
  return r.clockNote ? { text: `${r.chip}, ${r.clockNote}`, tone: "neutral" } : null;
}

interface Props {
  view: DenialView;
  step: RecommendedStep;
  onChoose: (id: OptionId) => void;
  onOpenAppeal: () => void;
  onChangeTime: () => void;
  onRecordDecision: () => void;
  onFindings: () => void;
}

/** Who and what this denial is, our read of it, and the one recommended next step under it. */
export function DenialHeader({ view, step, ...handlers }: Props) {
  const { req, meta, analysis, clock } = view;
  const chip = windowChip(req, clock);
  const nav = useNavigate();
  const chance = analysis.options[0].chance;
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          <div className="min-w-[260px] flex-1">
            <div className="mb-1.5 text-[11.5px] font-medium tracking-[0.1em] text-muted uppercase">Authorization denial</div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Chip>{PROGRAM_LABEL[req.program]}</Chip>
              <span className="font-serif text-[26px] leading-none font-semibold">{req.id}</span>
              <Pill tone="mid">{meta.type}</Pill>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chance ? <Pill tone={band(chance.value).tone}>{chance.value}% chance of overturning</Pill> : null}
              {chip ? <Pill tone={chip.tone} dot>{capitalize(chip.text)}</Pill> : null}
            </div>
            <p className="mt-3 text-[13.5px] text-muted">
              {payerById(req.payerId).name} · case {req.caseId} · {req.patient.initials}, {req.patient.age}
              {meta.letterName ? ` · letter ${meta.letterName}` : ""}
            </p>
            <Button size="sm" variant="ghost" icon={LayoutDashboard} className="mt-1 -ml-2" onClick={() => nav(paths.dashboard({ request: req.id }))}>See on the Dashboard</Button>
            {meta.note ? <p className="mt-1 text-[13.5px] text-ink2">Your note: {meta.note}</p> : null}
          </div>
          <div className="flex w-full max-w-[300px] min-w-[240px] flex-col gap-2.5 sm:w-[270px]">
            <div className={cn("flex flex-col gap-0.5 rounded-2xl px-[18px] py-3.5", READ_TONE[analysis.verdict])}>
              <span className="text-[11.5px] font-semibold tracking-[0.1em] uppercase">Our read</span>
              <b className="font-serif text-[20px] leading-tight">{analysis.verdict}</b>
              <span className="text-sm">{analysis.verdictLine}</span>
            </div>
            <Button icon={FileText} onClick={() => nav(paths.report(req.id))}>Appeal analysis report</Button>
          </div>
        </div>
      </CardBody>
      <NextStep view={view} step={step} {...handlers} />
    </Card>
  );
}
