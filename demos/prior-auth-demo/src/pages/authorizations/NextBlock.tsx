import { useId, type ReactNode } from "react";
import { ArrowRight, Check, Send, ShieldCheck, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { checkViews } from "@/data/caseModel";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import type { CaseCtx } from "./caseTypes";
import type { NextAction, NextGo } from "./nextAction";

/** What Send to payer's tooltip says when it is on: the gate itself, in the fewest words. */
export const SEND_TIP = "Opens review and sign. A clinician signs before anything is sent.";

/** A button whose tooltip says why it is off. A disabled button gets no pointer events, so the tooltip sits on a wrapper, and the reason is the button's description for screen readers. */
function Gated({ icon, disabled, tip, onClick, children }: { icon: LucideIcon; disabled: boolean; tip: string; onClick?: () => void; children: ReactNode }) {
  const id = useId();
  return (
    <span title={tip} className="inline-flex">
      <Button size="sm" icon={icon} disabled={disabled} aria-describedby={id} onClick={onClick}>{children}</Button>
      <span id={id} className="sr-only">{tip}</span>
    </span>
  );
}

/** "Next: …" and one primary button, the first thing under the title. Send to payer keeps its gate: on once every check passes, greyed out with its reason
    in the tooltip until then. While the request is being prepared, a chip counts Integrity's checks and opens the draft that has them. */
export function NextBlock({ ctx, next }: { ctx: CaseCtx; next: NextAction }) {
  const navigate = useNavigate();
  const { detail, work, canSend, sendReason, sent, send, goTab, live } = ctx;
  const go = (g: NextGo) => {
    if (g.to === "tab") goTab(g.tab, g.rec);
    else if (g.to === "review") send();
    else if (g.to === "dashboard") navigate(paths.dashboard({ request: g.requestId }));
    else navigate(paths.denials(g.id));
  };
  const sendsFromHere = next.button?.go.to === "review";
  const checks = checkViews(detail, work);
  const passed = checks.filter((c) => c.ok).length;
  const showChecks = !sent && !live && (detail.phase === "preparing" || detail.phase === "ready");
  return (
    <section aria-label="Next action" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl border border-forest/20 bg-[#EEF7F6] px-4 py-2.5">
      <div className="min-w-0 flex-1 basis-[280px] text-[14px] font-semibold leading-snug"><span className="text-forest">Next:</span> {next.text}</div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {showChecks ? (
          <button
            type="button" onClick={() => goTab("draft")} title={passed === checks.length ? "Every check passed" : checks.filter((c) => !c.ok).map((c) => c.label).join(" · ")}
            className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[12px] font-semibold", passed === checks.length ? "bg-good-bg text-good-ink" : "bg-mid-bg text-mid-ink")}
          >
            <ShieldCheck size={13} className="ico" aria-hidden="true" />
            Integrity {passed}/{checks.length}
          </button>
        ) : null}
        {next.button ? <Button size="sm" variant="primary" icon={sendsFromHere ? Send : ArrowRight} title={sendsFromHere ? SEND_TIP : undefined} onClick={() => go(next.button!.go)}>{next.button.label}</Button> : null}
        {sent ? (
          <Gated icon={Check} disabled tip={sendReason}>Sent to payer</Gated>
        ) : sendsFromHere ? null : (
          <Gated icon={Send} disabled={!canSend} tip={canSend ? SEND_TIP : sendReason} onClick={send}>Send to payer</Gated>
        )}
      </div>
    </section>
  );
}
