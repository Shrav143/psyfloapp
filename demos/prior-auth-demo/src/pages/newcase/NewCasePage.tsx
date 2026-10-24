import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, SearchX, Send } from "lucide-react";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { Button, Card, EmptyState, Page, PageHeader } from "@/components/ui";
import { RUN_STEPS } from "@/data/cases";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AuthTypePicker } from "./AuthTypePicker";
import { isAuthKind } from "./authType";
import { useCaseEnv } from "./caseEnv";
import { DocumentationStep } from "./DocumentationStep";
import { EligibilityStep } from "./EligibilityStep";
import { attachReferral, initialDraft } from "./intake";
import { IntakeStep } from "./IntakeStep";
import { NewCaseStepper } from "./NewCaseStepper";
import { reviewModel } from "./reviewModel";
import { ReviewStep } from "./ReviewStep";
import { NEW_CASE_STEPS, opensPreparation, preparationPatch, stepIdOf, stepIndex, stepPatch, stepPatchOf } from "./steps";
import { stepStates } from "./stepState";
import { useRecAdds } from "./useRecAdds";
import { useReading } from "./useRecordsTimers";
import { useWorkflowSync } from "./workflow/useWorkflowSync";
import { WorkflowRow } from "./workflow/WorkflowRow";

const NO_CONTEXT: string[] = [];

/** New Case, in four steps. /authorizations/new starts a draft and moves to /authorizations/new/:draftId, which resumes one. ?type= picks the Authorization type, ?referral=, ?verification= and ?patient= start from one;
    ?step= opens a step (the older names referral, records and review land on Intake, Clinical documentation and Review & submit; preparation and agents open Clinical documentation at the agents' section). */
export default function NewCasePage() {
  const { draftId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const scope = useScope();
  const draft = useStore((s) => s.caseDrafts.find((d) => d.id === draftId));
  const patch = useStore((s) => s.patchCaseDraft);
  const setKind = useStore((s) => s.setCaseKind);
  const created = useRef(false);
  // "Was sent" is only said for a request the store holds: one signed here, or one that is on the Dashboard.
  const recorded = useStore((s) => (draft?.caseId ? s.requests.some((r) => r.id === draft.caseId || r.caseId === draft.caseId) : false));
  const env = useCaseEnv(draft);
  const context = useStore((s) => (draft?.caseId ? s.clinicalContext[draft.caseId] : undefined)) ?? NO_CONTEXT;
  const adds = useRecAdds(draft);
  const holding = useStore((s) => {
    const step = draft ? RUN_STEPS[draft.run.done] : undefined;
    return !!step && s.agentPaused[step.agent];
  });
  useReading(draft);
  /* The payer workflow follows the case: it is matched, pinned and traced from here, only for a case the viewer can see. */
  useWorkflowSync(draft, env?.workflow ?? null, !!draft && !!env && scope.sites.includes(draft.site));

  /* No draft in the address: start one (from ?referral=ID, ?verification=ID, ?patient=ID or ?type=) and open it. The ref stops a second draft in development. */
  useEffect(() => {
    if (draftId) {
      created.current = false;
      return;
    }
    if (created.current) return;
    const ref = params.get("referral");
    if (ref && !scope.has(ref)) return;
    created.current = true;
    const st = useStore.getState();
    const { init, missingReferral, patient } = initialDraft(params, st);
    if (missingReferral) st.toast({ title: "Referral not found", body: `We could not find ${missingReferral}. Start from a blank case instead.`, tone: "mid" });
    const id = st.createCaseDraft(init);
    if (init.referralId) attachReferral(id, init.referralId);
    if (patient) st.chooseCasePatient(id, { patientId: patient });
    const step = stepIdOf(params.get("step"));
    if (step) st.patchCaseDraft(id, opensPreparation(params.get("step")) ? preparationPatch : stepPatchOf(step));
    nav(paths.newCase({ draft: id }), { replace: true });
  }, [draftId, params, nav, scope]);

  /* The agents' section of Clinical documentation is scrolled to when the page opens on it: a draft saved while the agents worked (the old step 4), or ?step=preparation. */
  const [toPreparation, setToPreparation] = useState(0);
  /* A draft whose agents already ran reopens on their section, or on Review & submit once they are done, not on intake. */
  useEffect(() => {
    if (!draft) return;
    if (draft.step === 0 && draft.run.done > 0) patch(draft.id, draft.run.done >= RUN_STEPS.length ? stepPatch(3) : preparationPatch);
    if (draft.step === 1 || (draft.step === 0 && draft.run.done > 0 && draft.run.done < RUN_STEPS.length)) setToPreparation((n) => n + 1);
    // Only on opening a draft: going Back to a step later must stay there.
  }, [draft?.id]);

  /* An address that names a step or a type opens that step or type on a draft that exists. */
  useEffect(() => {
    if (!draft) return;
    const stepParam = params.get("step");
    const step = stepIdOf(stepParam);
    if (step && opensPreparation(stepParam)) {
      patch(draft.id, preparationPatch);
      setToPreparation((n) => n + 1);
    } else if (step) patch(draft.id, stepPatchOf(step));
    const kind = params.get("type");
    if (isAuthKind(kind) && !draft.started && !draft.sent) setKind(draft.id, kind);
    // Only when the address changes: the person moves between steps with the stepper afterwards.
  }, [draft?.id, params]);

  /* A new case with no patient and no ID yet belongs wherever the person is working: narrowing the view to the other site moves it there, instead of hiding it. */
  useEffect(() => {
    if (draft && !draft.caseId && !draft.patientId && !draft.sent && !scope.sites.includes(draft.site)) patch(draft.id, { site: scope.sites[0] });
  }, [draft?.id, draft?.site, draft?.caseId, draft?.patientId, scope.sites]);

  const ready = !!draft && draft.run.done >= RUN_STEPS.length;
  const review = useMemo(() => (env && ready ? reviewModel(env, context, adds) : null), [env, ready, context, adds]);
  const steps = useMemo(() => (env ? stepStates(env, review, holding) : null), [env, review, holding]);

  /* A link that starts a case from a referral at a site the viewer cannot see shows the notice, and no case is made. */
  const refParam = params.get("referral");
  if (!draftId && refParam && !scope.has(refParam)) return <OutOfSite id={refParam} what="referral" />;
  if (!draftId) return null;
  if (!draft || !env || !steps) {
    return (
      <Page>
        <PageHeader title="New Case" sub="That draft is not in the demo." />
        <Card>
          <EmptyState icon={SearchX} title="We could not find that draft" action={<Button variant="primary" onClick={() => nav(paths.newCase())}>Start a new case</Button>}>
            It may have been cleared when the demo data was reset.
          </EmptyState>
        </Card>
      </Page>
    );
  }
  /* A draft that belongs to a site the viewer cannot see does not exist for them. */
  if (!scope.sites.includes(draft.site)) return <OutOfSite id={draft.caseId ?? draft.id} what="case" />;

  /* A case that was signed and sent is on the Dashboard now; this page must not offer to sign it again. */
  if (draft.sent && draft.caseId) {
    const sentId = draft.caseId;
    return (
      <Page>
        {env.workflow ? <WorkflowRow draft={draft} view={env.workflow} /> : null}
        <PageHeader title={recorded ? `${sentId} was sent` : `${sentId} is with the payer`} />
        <Card>
          <EmptyState
            icon={Send}
            title={recorded ? "Signed and sent (demo)" : "Already with the payer"}
            action={
              <div className="flex flex-wrap justify-center gap-2.5">
                <Button variant="primary" onClick={() => nav(paths.case(sentId))}>Open the case</Button>
                {recorded ? <Button onClick={() => nav(paths.dashboard({ request: sentId }))}>Open it on the Dashboard</Button> : null}
                <Button onClick={() => nav(paths.manager())}>Back to Case Manager</Button>
              </div>
            }
          />
        </Card>
      </Page>
    );
  }

  const at = stepIndex(draft);

  return (
    <Page>
      <Link to={paths.manager()} className="-mb-1.5 flex w-fit items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeft size={14} className="ico" />
        Case Manager
      </Link>
      <PageHeader
        title={
          <>
            New Case
            {draft.caseId ? <span data-testid="case-id" className="ml-2.5 font-sans text-[13px] font-medium text-muted">{draft.caseId}</span> : null}
          </>
        }
        actions={
          <AuthTypePicker draftId={draft.id} kind={draft.kind} disabled={draft.sent} />
        }
      />
      <div className="flex flex-col gap-3">
        <NewCaseStepper steps={steps} current={at} onGo={(i) => patch(draft.id, stepPatch(i))} />
        {env.workflow ? <WorkflowRow draft={draft} view={env.workflow} /> : null}
      </div>
      <h2 className="sr-only">{NEW_CASE_STEPS[at]}</h2>
      {at === 0 ? <IntakeStep draft={draft} env={env} /> : at === 1 ? <EligibilityStep draft={draft} env={env} /> : at === 2 ? <DocumentationStep draft={draft} env={env} toPreparation={toPreparation} /> : <ReviewStep draft={draft} env={env} />}
    </Page>
  );
}
