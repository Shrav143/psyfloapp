import { Link } from "react-router-dom";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { AgentBadge, Button } from "@/components/ui";
import { sectionParam } from "@/data/assess/nav";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { useIntakeNow } from "../lib/policyNow";
import { retryTask } from "./actions";
import type { Need } from "./needs";
import { Why } from "./Why";

/** "Needs you": each item takes the person to where the decision is made. Approve and Reject appear only on a task whose approval is the
    decision itself (a simulated message); approving never writes a field or skips a review, and a safety item is never approvable here. */
export function NeedsList({ record, needs }: { record: IntakeRecord; needs: Need[] }) {
  const decide = useStore((s) => s.decideIntakeTask);
  const complete = useStore((s) => s.completeIntakeTask);
  const now = useIntakeNow();
  if (!needs.length) return <p className="px-4 py-2 text-[13px] text-muted">Nothing waits for you on this intake.</p>;
  return (
    <ul className="space-y-2 px-4 pb-1">
      {needs.map((n) => {
        const t = n.task;
        const approvable = !!t?.approveHere && !n.safety && t.status === "needs_you";
        const personal = t && (t.kind === "registration" || t.kind === "renewal" || t.kind === "manual") && t.status === "needs_you";
        const href = n.target ? paths.intakeRecord(record.id, sectionParam(n.target)) : n.to ? paths.intakeRecord(record.id, n.to.section, n.to.panel) : null;
        return (
          <li key={n.key} data-need={n.key} className={cn("rounded-xl border px-3 py-2.5", n.tone === "risk" ? "border-risk-edge bg-risk-bg/60" : n.tone === "mid" ? "border-mid-edge bg-mid-bg/40" : "border-edge bg-tile")}>
            <div className="flex items-start gap-2">
              {n.agent ? <AgentBadge agent={n.agent} size={20} className="mt-px" /> : null}
              <p className="min-w-0 flex-1 text-[13px] font-semibold break-words">{n.text}</p>
            </div>
            {n.detail ? <p className="mt-0.5 text-[12px] break-words text-ink2">{n.detail}</p> : null}
            {n.safety ? <p className="mt-0.5 text-[12px] font-semibold text-risk-ink">A clinician decides. Not approvable from the assistant.</p> : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {href ? (
                <Link to={href} className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-field bg-white px-2.5 text-[12px] font-semibold text-forest hover:bg-tile">
                  {n.toLabel ?? "Go to"}
                  <ArrowRight size={13} className="ico" />
                </Link>
              ) : null}
              {n.retry && t ? <Button size="sm" icon={RotateCcw} onClick={() => retryTask(record.id, t, now)}>Retry</Button> : null}
              {n.settings ? <Link to={paths.settings()} className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-field bg-white px-2.5 text-[12px] font-semibold text-forest hover:bg-tile">Open Settings</Link> : null}
              {approvable && t ? (
                <>
                  <Button size="sm" variant="primary" icon={Check} onClick={() => decide(record.id, t.id, "approved")}>Approve</Button>
                  <Button size="sm" icon={X} onClick={() => decide(record.id, t.id, "rejected")}>Reject</Button>
                </>
              ) : null}
              {personal && t ? <Button size="sm" icon={Check} onClick={() => complete(record.id, t.id, t.kind === "registration" ? "Registered with the plan (outside Psyflo)." : t.kind === "manual" ? "Done." : "Renewal planned in Authorizations.")}>{t.kind === "registration" ? "Mark registered" : "Mark done"}</Button> : null}
            </div>
            {n.explain ? <Why className="mt-1" explain={n.explain} label={n.text} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
