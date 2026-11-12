import { useMemo } from "react";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import { factsFromCase, hasVerification } from "./facts";
import { resolveCaseWorkflow, type CaseWorkflow } from "./model";
import { useWorkflowLibrary } from "./engine";

/** The payer workflow a draft follows and how it stands against the case. It is worked out again whenever the draft, a check, a document, the clock or a published workflow changes,
    so the hint on every step, the warnings and the no-authorization outcome always agree with each other. Null until Intake knows the payer and the level of care. */
export function useCaseWorkflow(draft: CaseDraft | undefined): CaseWorkflow | null {
  const clock = useStore((s) => s.clock);
  const verifications = useStore((s) => s.verifications);
  const requests = useStore((s) => s.requests);
  const payerConfig = useStore((s) => s.payerConfig);
  const customPayers = useStore((s) => s.customPayers);
  const lib = useWorkflowLibrary(draft?.payerId ?? null);
  return useMemo(() => {
    if (!draft) return null;
    const base = factsFromCase(draft, { clock, verifications, requests, payerConfig, customPayers });
    return base ? resolveCaseWorkflow(draft, base, lib, clock, hasVerification(draft, { clock, verifications })) : null;
  }, [draft, clock, verifications, requests, payerConfig, customPayers, lib]);
}
