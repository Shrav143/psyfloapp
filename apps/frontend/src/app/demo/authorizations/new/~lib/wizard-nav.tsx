"use client";

import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/lib/core-ui/button";
import { SIGNOFF_STEP, STEPS, SUBMIT_STEP } from "./wizard-model";

export function WizardNav({
  step,
  signed,
  onBack,
  onNext,
}: {
  step: number;
  signed: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const gated = step === SIGNOFF_STEP && !signed;
  const last = step === SUBMIT_STEP;
  const next = STEPS[step + 1];
  const hint = gated
    ? "Sign to continue. Nothing is submitted without a clinician signature."
    : last
      ? "Navigator files only what step 4 signed."
      : `Step ${step + 1} of ${STEPS.length}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <Button
        variant="outline"
        size="sm"
        disabled={step === 0}
        onClick={onBack}
      >
        <ArrowLeft className="size-4" /> Back
      </Button>
      <div className="text-slate-500 text-xs">{hint}</div>
      {last || !next ? (
        <div className="w-20" />
      ) : (
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700"
          disabled={gated}
          onClick={onNext}
        >
          {gated ? <Lock className="size-4" /> : null}
          Next: {next.title}
          <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
