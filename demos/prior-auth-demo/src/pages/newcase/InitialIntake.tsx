import { Link, useSearchParams } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { Disclosure } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { ReferralChecklist } from "@/pages/referrals/ReferralChecklist";
import { ReferralStart } from "@/pages/referrals/ReferralStart";
import type { CaseEnv } from "./caseEnv";
import { CaseDetails } from "./CaseDetails";
import { DuplicateWarning } from "./DuplicateWarning";
import { PatientSearch } from "./PatientSearch";

/** Intake for an initial authorization: "Start with a referral or patient", then the details the referral or the person filled in.
    The address says what is on screen: ?ref=RF-2051 is that referral's checklist, an empty ?ref= is the start view, and no ?ref= is the details once there is something to show. */
export function InitialIntake({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const [params, setParams] = useSearchParams();
  const scope = useScope();
  const referrals = useStore((s) => s.referrals);
  const patch = useStore((s) => s.patchCaseDraft);
  const choose = useStore((s) => s.chooseCasePatient);
  const toast = useStore((s) => s.toast);
  const ref = params.get("ref");
  const reviewing = ref ? referrals.find((x) => x.id === ref) : undefined;
  const show = (id: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("ref", id);
      return next;
    });

  if (ref && reviewing && !scope.has(reviewing.id)) return <OutOfSite id={reviewing.id} what="referral" />;
  if (reviewing) return <ReferralChecklist r={reviewing} draftId={draft.id} onReplace={() => show("")} />;

  const startView = params.has("ref") ? true : !draft.started;
  if (startView) {
    return (
      <ReferralStart
        onOpen={show}
        onManual={() => {
          patch(draft.id, { started: true });
          setParams((p) => {
            const next = new URLSearchParams(p);
            next.delete("ref");
            return next;
          }, { replace: true });
        }}
        patients={
          <Disclosure title="Find a patient who is already known" summary={`Search ${scope.label.toLowerCase()} by initials or case ID. Nobody is added twice.`}>
            <div className="px-6 py-5">
              <PatientSearch
                book={env.book}
                label="Patient"
                onPick={(p) => {
                  choose(draft.id, { patientId: p.id });
                  setParams((q) => {
                    const next = new URLSearchParams(q);
                    next.delete("ref");
                    return next;
                  }, { replace: true });
                  toast({ title: `${p.initials}, ${p.age} is in this case`, body: "The patient's own details are filled in. No second patient is made.", tone: "good" });
                }}
              />
            </div>
          </Disclosure>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[13.5px] text-muted">
        <span>
          {draft.referralId ? (
            <>
              From referral <Link to={paths.referral(draft.referralId, draft.id)} className="font-medium text-forest underline underline-offset-2">{draft.referralId}</Link>
              {draft.referrer ? <> · {draft.referrer.org}</> : null}. Everything below can be changed.
            </>
          ) : draft.patientId ? (
            <>An existing patient. Their details are filled in and can be changed for this request.</>
          ) : (
            <>Created by hand. Add what you know; Reader fills the rest from the chart.</>
          )}
        </span>
        <button type="button" onClick={() => show("")} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-muted hover:bg-white hover:text-ink">
          <RotateCcw size={13} className="ico" aria-hidden="true" />
          Use a different referral or patient
        </button>
      </div>
      <DuplicateWarning env={env} />
      <CaseDetails draft={draft} />
    </div>
  );
}
