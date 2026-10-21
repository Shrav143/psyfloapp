import { CircleAlert, CircleCheck, CircleDashed, CircleX, Receipt } from "lucide-react";
import { Pill } from "@/components/ui";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import type { CheckResult, PaymentCheck } from "./checks";

const ICON = { good: CircleCheck, mid: CircleAlert, risk: CircleX, neutral: CircleDashed } as const;
const COLOR: Record<Tone, string> = { good: "text-good", mid: "text-mid", risk: "text-risk", neutral: "text-muted" };

function CheckRow({ c }: { c: PaymentCheck }) {
  const Icon = ICON[c.tone];
  return (
    <li className="flex items-start gap-3.5 border-b border-line px-6 py-4">
      <Icon size={20} className={cn("ico mt-0.5", COLOR[c.tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{c.title}</div>
        <div className="mt-0.5 text-[13.5px] text-muted">{c.detail}</div>
      </div>
      <Pill tone={c.tone} dot>
        {c.chip}
      </Pill>
    </li>
  );
}

/** The seven payment checks, one row each, and the patient's cost as a small last line. Used on the result page and in the intake drawer. */
export function PaymentChecks({ result }: { result: Pick<CheckResult, "checks" | "patientPays"> }) {
  return (
    <>
      <ol aria-label="Payment checks">
        {result.checks.map((c) => (
          <CheckRow key={c.id} c={c} />
        ))}
      </ol>
      <div className="flex items-start gap-3.5 rounded-b-[20px] bg-tile px-6 py-4">
        <Receipt size={18} className="ico mt-0.5 text-muted" aria-hidden="true" />
        <div className="text-[13.5px]">
          <span className="font-semibold">What the patient pays:</span> <span className="text-muted">{result.patientPays} This does not change what the clinic is paid. A $0 copay does not mean the clinic is paid.</span>
        </div>
      </div>
    </>
  );
}
