/* Everything about a draft that comes from outside it: the demo clock, the saved Payers rules, the patient book and the other requests inside the sites in view,
   the shared verification record, and whether Verify is paused. The five steps, the stepper and Review & submit all read this one object,
   so the stepper's state, the step's own message and "What is missing" cannot disagree. */
import { useMemo } from "react";
import type { CaseDraft } from "@/data/cases";
import { patientById, type AuthorizationRecord, type Patient, type PatientBook } from "@/data/patients";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import { selectPatientBookInView } from "@/store/patients";
import { findDuplicate, type DuplicateHit } from "./duplicates";
import { usePayerContext, type PayerContext } from "./payerContext";
import { readiness, type Readiness } from "./typicalDocs";
import { verificationKey, verificationView, type VerificationView } from "./verificationFor";
import type { CaseWorkflow } from "./workflow/model";
import { useCaseWorkflow } from "./workflow/useCaseWorkflow";

export interface CaseEnv {
  draft: CaseDraft;
  clock: number;
  ctx: PayerContext;
  verification: VerificationView;
  /** The matching request, draft or authorization, whether or not the person already said why they are going on. */
  duplicate: DuplicateHit | null;
  /** The Verify agent is paused in Settings. */
  verifyPaused: boolean;
  /** The patient book for the sites in view. */
  book: PatientBook;
  patient: Patient | undefined;
  authorization: AuthorizationRecord | undefined;
  readiness: Readiness;
  /** The payer workflow the case follows and where it stands. Null until Intake knows the payer and the level of care. */
  workflow: CaseWorkflow | null;
}

export function useCaseEnv(draft: CaseDraft | undefined): CaseEnv | null {
  const clock = useStore((s) => s.clock);
  const requests = useStore((s) => s.requests);
  const drafts = useStore((s) => s.caseDrafts);
  const key = draft ? verificationKey(draft) : null;
  const record = useStore((s) => (key ? s.verifications[key] : undefined));
  const verifyPaused = useStore((s) => s.agentPaused.verify);
  const scope = useScope();
  const { sites } = scope;
  const ctx = usePayerContext({ payerId: draft?.payerId ?? null, program: draft?.program ?? null });

  const book = useStore(selectPatientBookInView);
  const workflow = useCaseWorkflow(draft);

  return useMemo(() => {
    if (!draft) return null;
    const visibleRequests = requests.filter((r) => scope.has(r.caseId));
    const visibleDrafts = drafts.filter((d) => sites.includes(d.site));
    const verification = verificationView(draft, record, clock);
    return {
      draft,
      clock,
      ctx,
      /* A workflow that ends in "No authorization required" raises the same outcome as a check that says so: the same card, the same three actions. */
      verification: workflow?.noAuth && !verification.noAuth && verification.record ? { ...verification, noAuth: true } : verification,
      duplicate: findDuplicate(draft, book, visibleRequests, visibleDrafts),
      verifyPaused,
      book,
      patient: draft.patientId ? patientById(book, draft.patientId) : undefined,
      authorization: draft.authorizationId ? book.authorizations.find((a) => a.id === draft.authorizationId) : undefined,
      readiness: readiness(draft, ctx),
      workflow,
    };
  }, [draft, clock, ctx, record, verifyPaused, book, requests, drafts, scope, sites, workflow]);
}
