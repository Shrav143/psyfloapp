import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Chip, Modal } from "@/components/ui";
import { METHOD_LABEL, type ReferralMethod } from "@/data/intake/types";
import { SAMPLE_METHODS, type SampleMethod } from "@/data/intake/samples";
import { cn } from "@/lib/cn";
import { BasicIntakeStep } from "./BasicIntakeStep";
import { METHODS } from "./methods";
import { SampleIntakeStep } from "./SampleIntakeStep";

const isSample = (m: ReferralMethod): m is SampleMethod => (SAMPLE_METHODS as string[]).includes(m);

/** New intake: pick how the referral arrived, then the short step for that method. */
export function NewIntake({ onClose }: { onClose: () => void }) {
  const [method, setMethod] = useState<ReferralMethod>("manual");
  const [step, setStep] = useState<"method" | "details">("method");
  if (step === "details") {
    return isSample(method) ? (
      <SampleIntakeStep method={method} onBack={() => setStep("method")} onClose={onClose} />
    ) : (
      <BasicIntakeStep method={method as "manual" | "phone" | "voice"} onBack={() => setStep("method")} onClose={onClose} />
    );
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="New intake"
      subtitle="How did this referral arrive?"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" trailing={ArrowRight} onClick={() => setStep("details")}>Continue</Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Referral method" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {METHODS.map((m) => {
          const on = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-method={m.id}
              onClick={() => setMethod(m.id)}
              onDoubleClick={() => {
                setMethod(m.id);
                setStep("details");
              }}
              className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors", on ? "border-forest bg-sage-bg" : "border-edge bg-white hover:bg-tile")}
            >
              <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", on ? "bg-forest text-white" : "bg-neutral-bg text-ink2")}>
                <m.icon size={16} className="ico" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{METHOD_LABEL[m.id]}</span>
                  {m.simulated ? <Chip className="border border-dashed border-field bg-white">Simulated</Chip> : null}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">{m.line}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
