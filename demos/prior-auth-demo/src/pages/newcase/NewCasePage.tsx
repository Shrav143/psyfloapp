import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, SearchX, Send, Sparkles } from "lucide-react";
import { Button, Card, EmptyState, Page, PageHeader, Stepper } from "@/components/ui";
import { payerById } from "@/data/seed";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AgentsStep } from "./AgentsStep";
import { IntakeStep } from "./IntakeStep";
import { applySampleChart, initialDraft } from "./intake";
import { ReviewStep } from "./ReviewStep";

const STEPS = ["Intake", "Agents work", "Review and sign"];

/** New case. /authorizations/new starts a draft and moves to /authorizations/new/:draftId, which resumes one. */
export default function NewCasePage() {
  const { draftId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const draft = useStore((s) => s.caseDrafts.find((d) => d.id === draftId));
  const patch = useStore((s) => s.patchCaseDraft);
  const created = useRef(false);

  /* No draft in the address: start one (from ?referral=ID or a coverage result) and open it. The ref stops a second draft in development. */
  useEffect(() => {
    if (draftId) {
      created.current = false;
      return;
    }
    if (created.current) return;
    created.current = true;
    const st = useStore.getState();
    const { init, missingReferral } = initialDraft(params, st);
    if (missingReferral) st.toast({ title: "Referral not found", body: `We could not find ${missingReferral}. Start from a blank case instead.`, tone: "mid" });
    nav(paths.newCase({ draft: st.createCaseDraft(init) }), { replace: true });
  }, [draftId, params, nav]);

  /* A draft whose agents already ran reopens on the agents step, not on intake. */
  useEffect(() => {
    if (draft && draft.step === 0 && draft.run.done > 0) patch(draft.id, { step: draft.run.done >= 10 ? 2 : 1 });
    // Only on opening a draft: going Back to intake later must stay on intake.
  }, [draft?.id]);

  if (!draftId) return null;
  if (!draft) {
    return (
      <Page>
        <PageHeader title="New case" sub="That draft is not in the demo." />
        <Card>
          <EmptyState icon={SearchX} title="We could not find that draft" action={<Button variant="primary" onClick={() => nav(paths.newCase())}>Start a new case</Button>}>
            It may have been cleared when the demo data was reset.
          </EmptyState>
        </Card>
      </Page>
    );
  }

  /* A case that was signed and sent is on the Dashboard now; this page must not offer to sign it again. */
  if (draft.sent && draft.caseId) {
    const sentId = draft.caseId;
    return (
      <Page>
        <PageHeader title={`${sentId} was sent`} sub="It was signed and sent to the payer. The agents are following it from the Dashboard." />
        <Card>
          <EmptyState
            icon={Send}
            title="This case is no longer being prepared"
            action={
              <div className="flex gap-2.5">
                <Button variant="primary" onClick={() => nav(paths.dashboard({ request: sentId }))}>Open it on the Dashboard</Button>
                <Button onClick={() => nav(paths.active())}>Back to Active Cases</Button>
              </div>
            }
          >
            Nothing more is needed here.
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const payer = draft.payerId ? payerById(draft.payerId) : null;
  const title = draft.step === 2 ? "Ready for your signature" : "New case";
  const sub =
    draft.step === 0
      ? "Add the patient, the payer and the chart. The agents do the research and drafting, and you review and sign."
      : draft.step === 1
        ? `The agents are reading the chart and checking ${payer?.shortName ?? "the payer"}'s rules. Questions come to you only when they must.`
        : "Nothing goes to the payer until a clinician signs.";

  return (
    <Page>
      <Link to={paths.active()} className="-mb-1.5 flex w-fit items-center gap-1.5 text-muted hover:text-ink">
        <ArrowLeft size={14} className="ico" />
        Active Cases
      </Link>
      <PageHeader
        title={title}
        sub={sub}
        actions={
          draft.step === 0 ? (
            <Button icon={Sparkles} onClick={() => applySampleChart(draft.id)}>
              Use sample chart
            </Button>
          ) : null
        }
      />
      <Stepper steps={STEPS} current={draft.step} onGo={(i) => patch(draft.id, { step: i as 0 | 1 | 2 })} />
      {draft.step === 0 ? <IntakeStep draft={draft} /> : draft.step === 1 ? <AgentsStep draft={draft} /> : <ReviewStep draft={draft} />}
    </Page>
  );
}
