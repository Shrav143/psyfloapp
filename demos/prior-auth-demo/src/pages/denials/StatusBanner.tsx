import { ArrowRight, CalendarCheck, CheckCircle2, FileSignature, Gavel, Hourglass, ScrollText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Banner, Button } from "@/components/ui";
import { paths } from "@/routes";
import { capitalize, isClosed, isFiled } from "./lib/format";
import type { DenialView } from "./lib/useDenialView";

/** One banner that says where this denial stands after the user's choices, with the next useful action. */
export function StatusBanner({ view, onOpenAppeal, onChangeTime, onRecordDecision }: { view: DenialView; onOpenAppeal: () => void; onChangeTime: () => void; onRecordDecision: () => void }) {
  const { req, work } = view;
  const when = work.slot?.label ?? view.meta.bookedWindow;
  const nav = useNavigate();
  const dash = <Button size="sm" variant="outline" onClick={() => nav(paths.dashboard({ request: req.id }))}>See on the Dashboard</Button>;
  if (work.accepted)
    return <Banner tone="neutral" icon={CheckCircle2} title="Closed. You accepted the decision" action={<Link to={paths.manager("cases")} className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline">Plan the step-down<ArrowRight size={14} className="ico" /></Link>}>Reason: {work.accepted.reason}. Analytics counts the write-off.</Banner>;
  if (work.decision && work.decision.result !== "upheld") return <Banner tone={work.decision.result === "overturned" ? "good" : "mid"} title={work.decision.result === "overturned" ? "Overturned on appeal" : "Partly overturned on appeal"} action={dash}>{work.decision.note || "The ledger is updated and the next review is booked."}</Banner>;
  if (isClosed(work)) return <Banner tone="good" title={work.outcome?.kind === "overturned" ? "Overturned on the call" : "Partly restored on the call"} action={dash}>{work.outcome?.note || "The ledger is updated and the next review is booked."}</Banner>;
  if (isFiled(req))
    return (
      <Banner tone="neutral" icon={Hourglass} title={`${req.chip}. Waiting on the payer`} action={<div className="flex gap-2"><Button size="sm" variant="outline" icon={ScrollText} onClick={onOpenAppeal}>View the appeal</Button><Button size="sm" variant="primary" icon={Gavel} onClick={onRecordDecision}>Record the payer's decision</Button></div>}>
        {req.clockSub ? `${capitalize(req.clockSub)}, ` : ""}{req.clockNote ?? "decision date not set"}. Navigator checks every day. When the payer answers, record the decision here.
      </Banner>
    );
  if (req.chip === "Appeal drafting")
    return <Banner tone="mid" icon={FileSignature} title={work.appealDraft ? "The appeal is drafted and waiting for a clinician's signature" : "Advocate is drafting the appeal"} action={<Button size="sm" variant="primary" onClick={onOpenAppeal}>Open the draft</Button>}>{work.appealDraft ? "Review the letter, change anything you like, then sign and file." : "Open the draft to see it come together."}</Banner>;
  if (req.chip === "Call booked")
    return (
      <Banner tone="neutral" icon={CalendarCheck} title={when ? `Call booked: ${when}` : "Call booked"} action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={onChangeTime}>Change the time</Button><Button size="sm" variant="primary" onClick={() => nav(paths.brief(req.id))}>Open the brief</Button></div>}>
        Cadence booked the window with {view.analysis.ctx.payer}. The brief is ready, written by Advocate and checked by Integrity.
      </Banner>
    );
  return null;
}
