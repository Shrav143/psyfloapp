import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { AgentChip, Button, Card, CardBody, Spinner } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { VerificationDetailsPanel, VerificationSummary } from "@/pages/eligibility";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { eligibilityIssues } from "./caseIssues";
import { ExceptionActions } from "./ExceptionActions";
import { NoAuthCard } from "./NoAuthCard";
import { StepFooter } from "./StepFooter";
import { stepPatch } from "./steps";
import { useVerifyRun } from "./useVerifyRun";

/** What Verify does on this type of request, in one line under the heading of the step. */
const LEAD = {
  initial: "Verify runs a check for the dates asked, or reuses one made in the last 24 hours.",
  concurrent: "The patient's last check is shown. Refresh it if it is old.",
  reauth: "Check that coverage continues and that the plan has not changed.",
  modify: "Check whether the change alters what the plan requires.",
  retro: "Verify checks coverage for the dates of service.",
} as const;

/** Step 2, Eligibility & Benefits, from the shared verification module: the same record the Eligibility & Benefits page shows. Warnings never trap: each says what to do next,
    and only coverage confirmed inactive with no documented exception stops the final send. */
export function EligibilityStep({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const save = useStore((s) => s.saveCaseDraft);
  const refresh = useStore((s) => s.refreshVerification);
  const toast = useStore((s) => s.toast);
  const [panel, setPanel] = useState(false);
  const running = useVerifyRun(draft, env);
  const v = env.verification;
  const rec = v.record;
  const payer = draft.payerId ? payerById(draft.payerId) : null;
  const open = eligibilityIssues(env).filter((i) => i.severity !== "note");

  const saveDraft = () => {
    save(draft.id);
    const id = useStore.getState().caseDrafts.find((d) => d.id === draft.id)?.caseId;
    toast({ title: "Draft saved", body: `${id ?? "The draft"} is in Case Manager. Pick it up whenever you like.`, tone: "good" });
  };

  const hint = v.noAuth && !env.draft.documented?.some((r) => r.kind === "no_auth")
    ? "No authorization is required. Save the verification, return to Case Manager, or continue with a documented exception."
    : open.length ? `${open.length} ${open.length === 1 ? "warning" : "warnings"}. You can go on; Review & submit lists them again.` : "Nothing is sent to the payer until a clinician signs.";

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
      <p className="px-1 text-[13.5px] text-muted">{LEAD[draft.kind]}</p>

      {v.status === "needs_input" ? (
        <Card>
          <CardBody className="flex flex-col items-start gap-3">
            <h2 className="font-serif text-[21px] font-semibold">Verify needs a little more</h2>
            <p className="text-[14px] text-muted">Add the payer, the level of care, the member ID and the start date in Intake, and Verify checks coverage for those dates.</p>
            <Button onClick={() => patch(draft.id, stepPatch(0))}>Open Intake</Button>
          </CardBody>
        </Card>
      ) : running && !rec ? (
        <Card>
          <CardBody>
            <div className="flex items-center gap-3.5" role="status" aria-live="polite">
              <Spinner size={20} />
              <AgentChip agent="verify" />
              <span className="text-[14px]">Verify is checking coverage and benefits with {payer?.shortName ?? "the payer"}</span>
            </div>
          </CardBody>
        </Card>
      ) : rec ? (
        <>
          {v.status === "stale" ? (
            <p className="px-1 text-[13.5px] text-mid-ink">
              {v.staleBecause === "dates" ? "This check covers other dates than the request asks for." : `This check is ${v.ageHours === null ? "old" : `${v.ageHours} hours old`}.`} Refresh it before you send.
            </p>
          ) : v.status === "current" ? (
            <p className="px-1 text-[13.5px] text-muted">
              This check is recent ({v.ageHours === 0 ? "made just now" : `${v.ageHours} ${v.ageHours === 1 ? "hour" : "hours"} old`}) and covers these dates, so it is reused. Refresh it only if something changed.
            </p>
          ) : null}
          <VerificationSummary record={rec} onRefresh={() => refresh(rec.id)} onDetails={() => setPanel(true)} />
          <NoAuthCard draft={draft} env={env} />
          <ExceptionActions draft={draft} env={env} />
          <VerificationDetailsPanel record={rec} open={panel} onClose={() => setPanel(false)} />
          <p className="px-1 text-xs text-muted">
            This is the same record as on <Link to={paths.eligibilityResult(rec.id)} className="font-medium text-forest underline underline-offset-2">Eligibility &amp; Benefits</Link>. It is a simulated check and never a payer's decision.
          </p>
        </>
      ) : null}

      <StepFooter
        actions={
          <>
            <Button icon={ArrowLeft} onClick={() => patch(draft.id, stepPatch(0))}>
              Back
            </Button>
            <Button icon={Save} onClick={saveDraft}>
              Save as draft
            </Button>
            <Button variant="primary" trailing={ArrowRight} onClick={() => patch(draft.id, stepPatch(2))}>
              Continue to Clinical documentation
            </Button>
          </>
        }
        hint={hint}
      />
    </div>
  );
}
