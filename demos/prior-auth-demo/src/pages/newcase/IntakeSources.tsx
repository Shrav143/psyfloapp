import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RotateCcw, UserRound } from "lucide-react";
import { ImportSources } from "@/components/import";
import { Button, Drawer } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectConnectedEmr } from "@/store/emr";
import type { CaseEnv } from "./caseEnv";
import { applyImport, currentOf } from "./importIntake";
import { PatientSearch } from "./PatientSearch";
import { stepPatchOf } from "./steps";

/** A clinical record system is connected for the sites in view, so Pull from EMR is offered. */
export function useEmrConnected(): boolean {
  const systems = useStore((s) => s.emrSystems);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
  return useMemo(() => selectConnectedEmr(useStore.getState()).some((x) => x.kind === "Clinical record"), [systems, viewerId, siteScope]);
}

/** The ways a new patient's case is filled in, in one row at the top of Intake: Pull from EMR, Import a file, Paste a screenshot, or a patient who is known.
    The referral is chosen in the step before (Referral). Once the case has a referral or a known patient, one line says which, with the way back. */
export function IntakeSources({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const [params, setParams] = useSearchParams();
  const choose = useStore((s) => s.chooseCasePatient);
  const patch = useStore((s) => s.patchCaseDraft);
  const toast = useStore((s) => s.toast);
  const emr = useEmrConnected();
  const [panel, setPanel] = useState<"patient" | null>(null);

  /* ?pick=patient (from "Known patient" on the Referral step) opens the patient search. */
  useEffect(() => {
    if (params.get("pick") === "patient") {
      setPanel("patient");
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("pick");
        return next;
      }, { replace: true });
    }
  }, [params, setParams]);

  /* A different referral is picked where referrals are: the Referral step, on its inbox. */
  const otherReferral = () => {
    patch(draft.id, stepPatchOf("referral"));
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("ref", "");
      return next;
    });
  };
  const known = draft.patientId ? env.patient : undefined;

  return (
    <div className="flex flex-col gap-2">
      <ImportSources
        target="patient"
        emr={emr}
        current={currentOf(draft)}
        emrChart={draft.emrChart}
        onImport={(r) => applyImport(draft.id, r)}
        extra={
          <Button size="sm" icon={UserRound} onClick={() => setPanel("patient")}>
            Known patient
          </Button>
        }
      />
      {draft.referralId || known ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[13px] text-muted">
          <span>
            {draft.referralId ? (
              <>
                From referral{" "}
                <Link to={paths.referral(draft.referralId, draft.id)} className="font-medium text-forest underline underline-offset-2">
                  {draft.referralId}
                </Link>
                {draft.referrer ? <> · {draft.referrer.org}</> : null}
              </>
            ) : known ? (
              <>Existing patient {known.id}</>
            ) : null}
          </span>
          <button type="button" onClick={() => (draft.referralId ? otherReferral() : setPanel("patient"))} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-muted hover:bg-white hover:text-ink">
            <RotateCcw size={13} className="ico" aria-hidden="true" />
            Use a different {draft.referralId ? "referral" : "patient"}
          </button>
        </div>
      ) : null}

      <Drawer open={panel === "patient"} onClose={() => setPanel(null)} title="Known patient" width={560}>
        <PatientSearch
          book={env.book}
          onPick={(p) => {
            choose(draft.id, { patientId: p.id });
            setPanel(null);
            toast({ title: `${p.initials}, ${p.age} is in this case`, tone: "good" });
          }}
        />
      </Drawer>
    </div>
  );
}
