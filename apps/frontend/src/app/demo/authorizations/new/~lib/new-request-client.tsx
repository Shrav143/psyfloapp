"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/lib/core-ui/button";
import { patientByMrn } from "@/lib/demo/dataset";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { useDemoStore } from "@/lib/demo/store";
import { EmptyState, PageHeader } from "@/lib/demo-ui/primitives";
import { RequestSummary } from "./request-summary";
import { StepPacket } from "./step-packet";
import { StepPatient } from "./step-patient";
import { StepRequirements } from "./step-requirements";
import { StepSignoff } from "./step-signoff";
import { StepSubmit } from "./step-submit";
import { Stepper } from "./stepper";
import {
  buildContext,
  defaultUnits,
  initialState,
  ledgerId,
  SIGNOFF_STEP,
  STEPS,
  SUBMIT_STEP,
  type WizardState,
} from "./wizard-model";
import { WizardNav } from "./wizard-nav";

export function NewRequestClient() {
  const params = useSearchParams();
  const [state, setState] = useState<WizardState>(() =>
    initialState(params.get("mrn"), params.get("kind")),
  );
  const patch = useCallback(
    (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p })),
    [],
  );
  const addToSignoff = useDemoStore((s) => s.addToSignoff);
  const ctx = useMemo(
    () => buildContext(state.mrn, state.windowStart),
    [state.mrn, state.windowStart],
  );

  if (!ctx) {
    return (
      <EmptyState
        title="No patients in the ledger"
        body="Pick a patient from the board to start a request."
      />
    );
  }

  const selectPatient = (mrn: string) => {
    const p = patientByMrn(mrn);
    if (!p) {
      return;
    }
    patch({
      mrn,
      units: defaultUnits(PAYER_BY_ID[p.payerId]),
      requested: [],
      approved: false,
      signature: undefined,
      submission: undefined,
    });
  };
  const go = (step: number) => {
    if (
      step < 0 ||
      step >= STEPS.length ||
      (step === SUBMIT_STEP && !state.signature)
    ) {
      return;
    }
    if (step === SIGNOFF_STEP) {
      addToSignoff(ledgerId(ctx));
    }
    patch({ step });
  };
  const signed = Boolean(state.signature);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Authorize"
        title="New authorization request"
        description="Five steps. Packet drafts from Sunwave, the clinician signs, Navigator files. The ledger keeps every version."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/demo/authorizations">
              <ArrowLeft className="size-4" /> Board
            </Link>
          </Button>
        }
      />
      <Stepper step={state.step} signed={signed} onSelect={go} />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          {state.step === 0 ? (
            <StepPatient
              state={state}
              ctx={ctx}
              onSelectPatient={selectPatient}
              onKind={(kind) => patch({ kind })}
            />
          ) : null}
          {state.step === 1 ? (
            <StepRequirements state={state} ctx={ctx} patch={patch} />
          ) : null}
          {state.step === 2 ? (
            <StepPacket state={state} ctx={ctx} patch={patch} />
          ) : null}
          {state.step === SIGNOFF_STEP ? (
            <StepSignoff state={state} ctx={ctx} patch={patch} />
          ) : null}
          {state.step === SUBMIT_STEP ? (
            <StepSubmit state={state} ctx={ctx} patch={patch} />
          ) : null}
          <WizardNav
            step={state.step}
            signed={signed}
            onBack={() => go(state.step - 1)}
            onNext={() => go(state.step + 1)}
          />
        </div>
        <RequestSummary state={state} ctx={ctx} />
      </div>
    </div>
  );
}
