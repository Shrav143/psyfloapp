import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, SearchX, Send, Sparkles } from "lucide-react";
import { Button, Card, EmptyState, Page, PageHeader, Stepper } from "@/components/ui";
import { payerById } from "@/data/seed";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AgentsStep } from "./AgentsStep";
import { IntakeStep } from "./IntakeStep";
import { applySampleChart, attachReferral, initialDraft } from "./intake";
import { ReferralStep } from "./ReferralStep";
import { ReviewStep } from "./ReviewStep";
import { NEW_CASE_STEPS, stepIndex, stepPatch } from "./steps";

/** New case. /authorizations/new starts a draft and moves to /authorizations/new/:draftId, which resumes one. */
export default function NewCasePage() {
  const { draftId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const draft = useStore((s) => s.caseDrafts.find((d) => d.id === draftId));
  const patch = useStore((s) => s.patchCaseDraft);
  const created = useRef(false);
  // "Was sent" is only said for a request the store holds: one signed here, or one that is on the Dashboard.
  const recorded = useStore((s) => (draft?.caseId ? s.requests.some((r) => r.id === draft.caseId || r.caseId === draft.caseId) : false));

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
    const id = st.createCaseDraft(init);
    if (init.referralId) attachReferral(id, init.referralId);
    nav(paths.newCase({ draft: id }), { replace: true });
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
        <PageHeader
          title={recorded ? `${sentId} was sent` : `${sentId} is with the payer`}
          sub={recorded ? "It was signed and sent to the payer. The agents are following it from the Dashboard." : "It is already with the payer, so there is nothing to sign here."}
        />
        <Card>
          <EmptyState
            icon={Send}
            title="This case is no longer being prepared"
            action={
              <div className="flex gap-2.5">
                {recorded ? <Button variant="primary" onClick={() => nav(paths.dashboard({ request: sentId }))}>Open it on the Dashboard</Button> : <Button variant="primary" onClick={() => nav(paths.case(sentId))}>Back to the case</Button>}
                <Button onClick={() => nav(paths.manager())}>Back to Case Manager</Button>
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
  const at = stepIndex(draft);
  const title = at === 3 ? "Review and sign" : "New case";
  const SUBS = [
    "Start with the referral. Drop the documents and Reader lists anything that is missing.",
    "Drop what you have. Reader sorts the files and lists what is still missing, then the agents check the payer's rules.",
    `The agents are reading the chart and checking ${payer?.shortName ?? "the payer"}'s rules. Questions come to you only when they must.`,
    "Nothing is sent to the payer until a person signs. See what is missing first, then read the summary.",
  ];
  const sub = SUBS[at];

  return (
    <Page>
      <Link to={paths.manager()} className="-mb-1.5 flex w-fit items-center gap-1.5 text-muted hover:text-ink">
        <ArrowLeft size={14} className="ico" />
        Case Manager
      </Link>
      <PageHeader
        title={title}
        sub={sub}
        actions={
          at === 1 ? (
            <Button icon={Sparkles} onClick={() => applySampleChart(draft.id)}>
              Use sample chart
            </Button>
          ) : null
        }
      />
      <Stepper steps={NEW_CASE_STEPS} current={at} onGo={(i) => patch(draft.id, stepPatch(i))} className="flex-wrap gap-y-2" />
      {at === 0 ? <ReferralStep draft={draft} /> : at === 1 ? <IntakeStep draft={draft} /> : at === 2 ? <AgentsStep draft={draft} /> : <ReviewStep draft={draft} />}
    </Page>
  );
}
