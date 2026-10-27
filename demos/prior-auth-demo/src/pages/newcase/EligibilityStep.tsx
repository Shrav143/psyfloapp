import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { AgentChip, Button, Card, CardBody, Pill, Spinner } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import type { VerificationException } from "@/data/verification";
import { payerById } from "@/data/seed";
import { VerificationDetailsPanel, VerificationSummary } from "@/pages/eligibility";
import { clockTime, toDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { ExceptionActions } from "./ExceptionActions";
import { NoAuthCard } from "./NoAuthCard";
import { StepFooter } from "./StepFooter";
import { stepPatchOf } from "./steps";
import { useSaveDraft } from "./useSaveDraft";
import { useVerifyRun } from "./useVerifyRun";
import { foldWorkflow } from "./workflow/fold";

/** The warnings the summary's own rows already say (Coverage, Benefits, Authorization, Provider), so the list under them does not repeat them. What to do about them is in "What you can do". */
const SAID_IN_ROWS: ReadonlySet<VerificationException> = new Set<VerificationException>(["coverage_inactive", "payer_changed", "member_id_mismatch", "benefit_unconfirmed", "service_not_covered", "requirement_unknown", "provider_unresolved", "service_unavailable"]);

/** Step 2, Eligibility & Benefits, from the shared verification module: the same record the Eligibility & Benefits page shows. Warnings never trap: each says what to do next,
    and only coverage confirmed inactive with no documented exception stops the final send. */
export function EligibilityStep({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const refresh = useStore((s) => s.refreshVerification);
  const saveDraft = useSaveDraft(draft.id);
  const [panel, setPanel] = useState(false);
  const running = useVerifyRun(draft, env);
  const v = env.verification;
  const rec = v.record;
  const payer = draft.payerId ? payerById(draft.payerId) : null;
  /* A check Verify made while this step was open is new; one that was already there is reused, and the chip says when it was made. */
  const ranHere = useRef(false);
  useEffect(() => {
    if (running) ranHere.current = true;
  }, [running]);
  const when = rec ? `${toDate(rec.checkedAt).toLocaleDateString("en-US", { weekday: "short" })} ${clockTime(toDate(rec.checkedAt))}` : "";
  const chip =
    v.status === "stale"
      ? <Pill tone="mid" dot>{v.staleBecause === "dates" ? "Covers other dates" : `Checked ${v.ageHours === null ? "a while" : `${v.ageHours} h`} ago`}</Pill>
      : v.status === "current" && !ranHere.current
        ? <Pill tone="neutral">Reused · checked {when}</Pill>
        : null;

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
      {v.status === "needs_input" ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px]">Verify needs the payer, level of care, member ID and start date</span>
            <Button size="sm" onClick={() => patch(draft.id, stepPatchOf("intake"))}>Open Intake</Button>
          </CardBody>
        </Card>
      ) : running && !rec ? (
        <Card>
          <CardBody>
            <div className="flex items-center gap-3.5" role="status" aria-live="polite">
              <Spinner size={20} />
              <AgentChip agent="verify" />
              <span className="text-[14px]">Checking coverage and benefits with {payer?.shortName ?? "the payer"}</span>
            </div>
          </CardBody>
        </Card>
      ) : rec ? (
        <>
          <div className="-mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
            {chip ?? <span />}
            <Link to={paths.eligibilityResult(rec.id)} className="text-[13px] font-medium text-forest underline underline-offset-2">
              Open in Eligibility &amp; Benefits
            </Link>
          </div>
          <VerificationSummary record={rec} onRefresh={() => refresh(rec.id)} onDetails={() => setPanel(true)} omit={SAID_IN_ROWS} />
          <NoAuthCard draft={draft} env={env} />
          <ExceptionActions draft={draft} env={env} />
          <VerificationDetailsPanel record={rec} open={panel} onClose={() => setPanel(false)} />
        </>
      ) : null}

      <StepFooter
        actions={
          <>
            <Button icon={ArrowLeft} onClick={() => patch(draft.id, stepPatchOf("intake"))}>
              Back
            </Button>
            <Button icon={Save} onClick={saveDraft}>
              Save as draft
            </Button>
            <Button variant="primary" trailing={ArrowRight} onClick={() => patch(draft.id, stepPatchOf("documentation"))}>
              Continue to Clinical documentation
            </Button>
          </>
        }
        hint={foldWorkflow(null, env)}
      />
    </div>
  );
}
