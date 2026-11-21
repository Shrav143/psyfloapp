import { CircleAlert, CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { Pill } from "@/components/ui";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import type { CheckResult, PaymentCheck } from "./checks";

const ICON = { good: CircleCheck, mid: CircleAlert, risk: CircleX, neutral: CircleDashed } as const;
const COLOR: Record<Tone, string> = { good: "text-good", mid: "text-mid", risk: "text-risk", neutral: "text-muted" };

function CheckRow({ c }: { c: PaymentCheck }) {
  const Icon = ICON[c.tone];
  return (
    <li className="flex items-start gap-3 border-b border-line px-5 py-2.5 last:border-b-0">
      <Icon size={18} className={cn("ico mt-0.5 shrink-0", COLOR[c.tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{c.title}</div>
        {c.detail ? <div className="text-[13px] text-muted">{c.detail}</div> : null}
      </div>
      <Pill tone={c.tone} dot>
        {c.chip}
      </Pill>
    </li>
  );
}

/** The payment checks, one row each. What the patient pays is on the result itself, beside the benefits. */
export function PaymentChecks({ result }: { result: Pick<CheckResult, "checks"> }) {
  return (
    <ol aria-label="Payment checks">
      {result.checks.map((c) => (
        <CheckRow key={c.id} c={c} />
      ))}
    </ol>
  );
}
