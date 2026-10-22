import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { noAuthLine } from "./payerRules";
import { DocumentedReasonForm } from "./DocumentedReasonForm";
import { datesOfService, reasonOf } from "./verificationFor";

const mdy = (iso: string): string => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;

/** The outcome "No authorization required": for which payer, service and dates, and the three things the person can do about it. Nothing is prepared or sent unless they choose to go on. */
export function NoAuthCard({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const nav = useNavigate();
  const toast = useStore((s) => s.toast);
  const save = useStore((s) => s.saveVerification);
  const discard = useStore((s) => s.discardCaseDraft);
  const rec = env.verification.record;
  if (!rec || !env.verification.noAuth || !draft.payerId || !draft.program) return null;
  const payer = payerById(draft.payerId);
  const dos = datesOfService(draft);
  const line = noAuthLine(env.ctx.rules, draft.program);
  const said = reasonOf(draft, "no_auth");

  return (
    <Card className="border-good-edge">
      <CardBody className="flex flex-col gap-4">
        <div>
          <h3 className="font-serif text-[21px] font-semibold tracking-tight">No authorization is required</h3>
          <p className="mt-1 text-[14px] text-ink2">
            {payer.name} needs no authorization for {PROGRAM_LABEL[draft.program]}{dos ? `, ${mdy(dos.from)} to ${mdy(dos.to)}` : ""}.{line ? ` Its rule says: ${line}.` : ""} Documentation and preparation do not apply, so those steps are marked Not applicable.
          </p>
        </div>
        <DocumentedReasonForm
          draft={draft}
          kind="no_auth"
          about="The payer needs no authorization"
          button="Continue with a documented exception"
          prompt="Why send a request when none is required?"
          placeholder="For example: the payer's care manager asked for a review in writing"
          extra={
            said ? null : (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    save(rec);
                    toast({ title: "Verification saved", body: `${draft.patient.initials || "The patient"}'s verification is in Eligibility & Benefits.`, tone: "good" });
                    discard(draft.id);
                    nav(paths.eligibilityResult(rec.id));
                  }}
                >
                  Save verification to the patient record
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    discard(draft.id);
                    nav(paths.manager());
                  }}
                >
                  Return to Case Manager
                </Button>
              </>
            )
          }
        />
      </CardBody>
    </Card>
  );
}
