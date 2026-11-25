import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Inbox, RotateCcw, UserRound } from "lucide-react";
import { ImportSources } from "@/components/import";
import { Button, Count, Drawer, FileDrop, type DemoFile } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { SAMPLE_COUNT, hash } from "@/data/referrals";
import { useScope } from "@/lib/scope";
import { uid } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectConnectedEmr } from "@/store/emr";
import { arrivedReferrals } from "@/pages/referrals/arrived";
import { ReferralReading } from "@/pages/referrals/ReferralReading";
import type { CaseEnv } from "./caseEnv";
import { applyImport, currentOf } from "./importIntake";
import { PatientSearch } from "./PatientSearch";
import { ReferralRows } from "./ReferralRows";

/** A clinical record system is connected for the sites in view, so Pull from EMR is offered. */
export function useEmrConnected(): boolean {
  const systems = useStore((s) => s.emrSystems);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
  return useMemo(() => selectConnectedEmr(useStore.getState()).some((x) => x.kind === "Clinical record"), [systems, viewerId, siteScope]);
}

/** The ways a new patient's case starts, in one row at the top of Intake: Pull from EMR, Import a file, Paste a screenshot, an incoming referral, or a patient who is known.
    Once the case has a referral or a known patient, one line says which, with the way back. */
export function IntakeSources({ draft, env, referrals: withReferrals = true }: { draft: CaseDraft; env: CaseEnv; /** A retroactive request does not start from a referral. */ referrals?: boolean }) {
  const [params, setParams] = useSearchParams();
  const scope = useScope();
  const referrals = useStore((s) => s.referrals);
  const choose = useStore((s) => s.chooseCasePatient);
  const toast = useStore((s) => s.toast);
  const add = useStore((s) => s.addReferral);
  const emr = useEmrConnected();
  const [panel, setPanel] = useState<"referrals" | "patient" | null>(null);
  const [reading, setReading] = useState<{ files: DemoFile[]; sample: number } | null>(null);
  const incoming = useMemo(() => scope.filter(arrivedReferrals(referrals), (r) => r.id), [referrals, scope]);

  /* An empty ?ref= (from "Add a referral" on Clinical documentation) opens the referrals panel. */
  useEffect(() => {
    if (params.get("ref") === "") {
      setPanel("referrals");
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("ref");
        return next;
      }, { replace: true });
    }
  }, [params, setParams]);

  const review = (id: string) => {
    setPanel(null);
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("ref", id);
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
          <>
            {withReferrals ? (
              <Button size="sm" icon={Inbox} onClick={() => setPanel("referrals")}>
                Referrals {incoming.length ? <Count className="h-[18px] min-w-[18px] text-[11px]">{incoming.length}</Count> : null}
              </Button>
            ) : null}
            <Button size="sm" icon={UserRound} onClick={() => setPanel("patient")}>
              Known patient
            </Button>
          </>
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
          <button type="button" onClick={() => setPanel(draft.referralId ? "referrals" : "patient")} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-muted hover:bg-white hover:text-ink">
            <RotateCcw size={13} className="ico" aria-hidden="true" />
            Use a different {draft.referralId ? "referral" : "patient"}
          </button>
        </div>
      ) : null}

      <Drawer open={panel === "referrals"} onClose={() => { setPanel(null); setReading(null); }} title="Incoming referrals" width={560}>
        {reading ? (
          <ReferralReading
            files={reading.files}
            onDone={() => {
              const id = add(reading.sample);
              setReading(null);
              review(id);
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <FileDrop hint="Drop referral documents, or click to choose" onFiles={(files) => setReading({ files, sample: hash(files[0].name) % SAMPLE_COUNT })} />
            <div className="-mt-2">
              <button type="button" className="text-[13px] font-medium text-forest underline underline-offset-2" onClick={() => setReading({ files: [{ id: uid("f"), name: "referral.pdf", sizeKb: 212 }], sample: referrals.length % SAMPLE_COUNT })}>
                Use sample referral
              </button>
            </div>
            <ReferralRows rows={incoming} onReview={review} />
          </div>
        )}
      </Drawer>
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
