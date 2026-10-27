import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, FileText, RotateCcw, Save, UserRound } from "lucide-react";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { Button, Card, CardBody } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { ReferralChecklist } from "@/pages/referrals/ReferralChecklist";
import { ReferralStart } from "@/pages/referrals/ReferralStart";
import { authType } from "./authType";
import type { CaseEnv } from "./caseEnv";
import { StepFooter } from "./StepFooter";
import { stepPatchOf } from "./steps";
import { useSaveDraft } from "./useSaveDraft";
import { foldWorkflow } from "./workflow/fold";

/** Step 1, Referral, before Intake. An initial authorization starts here: drop the referral documents, pick one that came in, find a known patient, or go on without one.
    ?ref=RF-2051 shows that referral's checklist until it is continued into the case (which fills Intake); an empty ?ref= shows the inbox again to pick a different one.
    A review, renewal, modification or retroactive request does not start from a referral, so the step says so and leads to Intake. */
export function ReferralStep({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const [params, setParams] = useSearchParams();
  const scope = useScope();
  const referrals = useStore((s) => s.referrals);
  const patch = useStore((s) => s.patchCaseDraft);
  const saveDraft = useSaveDraft(draft.id);
  const ref = params.get("ref");
  const reviewing = ref ? referrals.find((x) => x.id === ref) : undefined;
  const attached = draft.referralId ? referrals.find((x) => x.id === draft.referralId) : undefined;
  const setRef = (v: string | null) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (v === null) next.delete("ref");
      else next.set("ref", v);
      return next;
    });
  const toIntake = (pick?: "patient") => {
    patch(draft.id, stepPatchOf("intake"));
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("ref");
      if (pick) next.set("pick", pick);
      return next;
    });
  };
  const footer = (label: string) => (
    <StepFooter
      actions={
        <>
          <Button icon={Save} onClick={saveDraft}>Save as draft</Button>
          <Button variant="primary" trailing={ArrowRight} onClick={() => toIntake()}>{label}</Button>
        </>
      }
      hint={foldWorkflow(null, env)}
    />
  );

  if (draft.kind !== "initial") {
    return (
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
        <Card>
          <CardBody>
            <h2 className="text-[18px] font-semibold tracking-tight">No referral for {authType(draft.kind).noun}</h2>
            <p className="mt-1 text-[14px] text-ink2">{draft.kind === "retro" ? "A retroactive request starts from the stay that already happened." : "This request starts from a patient who exists, in Intake."}</p>
          </CardBody>
        </Card>
        {footer("Continue to Intake")}
      </div>
    );
  }

  if (ref && reviewing && !scope.has(reviewing.id)) return <OutOfSite id={reviewing.id} what="referral" />;
  if (reviewing) {
    return (
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
        <ReferralChecklist r={reviewing} draftId={draft.id} onReplace={() => setRef("")} />
      </div>
    );
  }

  /* The case already has its referral: say which, with the ways to look at it again or swap it. */
  if (attached && ref === null) {
    return (
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] text-muted">This case starts from</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[16px] font-semibold">
                <FileText size={17} className="ico text-forest" />
                Referral {attached.id}
                <span className="text-[14px] font-normal text-ink2">· {attached.patient.initials}, {attached.patient.age} · {attached.source.name}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={paths.referral(attached.id, draft.id)}><Button size="sm">Open the referral</Button></Link>
              <Button size="sm" icon={RotateCcw} onClick={() => setRef("")}>Use a different referral</Button>
            </div>
          </CardBody>
        </Card>
        {footer("Continue to Intake")}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
      <ReferralStart onOpen={(id) => setRef(id)} extra={<Button icon={UserRound} onClick={() => toIntake("patient")}>Known patient</Button>} />
      {footer(attached ? "Continue to Intake" : "Continue without a referral")}
    </div>
  );
}
