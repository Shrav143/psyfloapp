import { ArrowRight, Check, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { paths } from "@/routes";
import type { CaseCtx } from "./caseTypes";
import type { NextAction, NextGo } from "./nextAction";

/** "Next: …" and one primary button, the first thing under the title. Send to payer keeps its gate: it is the primary button once every check passes,
    and a disabled button with its reason until then. */
export function NextBlock({ ctx, next }: { ctx: CaseCtx; next: NextAction }) {
  const navigate = useNavigate();
  const { canSend, sendReason, sent, send, goTab } = ctx;
  const go = (g: NextGo) => {
    if (g.to === "tab") goTab(g.tab, g.rec);
    else if (g.to === "review") send();
    else if (g.to === "dashboard") navigate(paths.dashboard({ request: g.requestId }));
    else navigate(paths.denials(g.id));
  };
  const sendsFromHere = next.button?.go.to === "review";
  return (
    <section aria-label="Next action" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-forest/25 bg-[#F3F7F4] px-5 py-4">
      <div className="min-w-0 flex-1 basis-[320px]">
        <div className="text-[16px] font-semibold leading-snug"><span className="text-forest">Next:</span> {next.text}</div>
        {next.why ? <div className="mt-0.5 text-[13px] text-ink2">{next.why}</div> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {next.button ? <Button variant="primary" icon={sendsFromHere ? Send : ArrowRight} onClick={() => go(next.button!.go)}>{next.button.label}</Button> : null}
          {sent ? (
            <Button icon={Check} disabled title={sendReason}>Sent to payer</Button>
          ) : sendsFromHere ? null : (
            <Button icon={Send} disabled={!canSend} title={canSend ? undefined : sendReason} onClick={send}>Send to payer</Button>
          )}
        </div>
        <span className="max-w-[360px] text-right text-xs text-muted">{sent || !canSend ? sendReason : "Sending opens review and sign. Nothing goes to the payer until a clinician signs."}</span>
      </div>
    </section>
  );
}
