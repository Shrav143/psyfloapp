import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ImportSources, type ImportResult } from "@/components/import";
import { Banner, Page } from "@/components/ui";
import { siteOf } from "@/data/sites";
import { sitesInView, useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectConnectedEmr } from "@/store/emr";
import { selectVerificationFor } from "@/store/eligibility";
import { referralPrefill } from "@/store/referrals";
import { formFromImport } from "./importInsurance";
import { LiveCheck, useLiveCheck } from "./LiveCheck";
import { BackLinks, useOrigin } from "./origin";
import { SAMPLES, type Sample } from "./samples";
import { VerifyForm } from "./VerifyForm";
import { dobFor, verifySteps, type VerifyForm as Form } from "./verifySteps";

const EMPTY: Form = { payerId: "", member: "", dob: "", program: "RES", dos: "10/21/2026", source: null };
/** J.M.'s card checks the headline case R-1042, so it is offered only when R-1042 is in view. */
const HEADLINE = "R-1042";

/** Verify a patient: the form on the left, the live check on the right. Opens the result when the check finishes. */
export default function VerifyPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const paused = useStore((s) => s.agentPaused.verify);
  const emr = useStore((s) => selectConnectedEmr(s).length > 0);
  const scope = useScope();
  const [form, setForm] = useState<Form>(EMPTY);
  /** What the import found beyond the form's fields (plan type, group, coverage dates), shown under the import row. */
  const [found, setFound] = useState<string[]>([]);
  const who = useRef<{ caseId?: string; initials?: string | null; age?: number | null }>({});
  const origin = useOrigin();

  /* Pre-fill from ?referral=ID or ?case=ID once. */
  useEffect(() => {
    const st = useStore.getState();
    const referral = params.get("referral");
    const caseId = params.get("case");
    if (referral) {
      const p = referralPrefill(st, referral);
      if (!p) return void st.toast({ title: "Referral not found", body: `${referral} is not in the referrals.`, tone: "mid" });
      who.current = { initials: p.patientInitials, age: p.age };
      setForm({ ...EMPTY, payerId: p.payerId ?? "", member: p.memberIdMasked, dob: dobFor(p.age), program: p.program });
    } else if (caseId) {
      const row = selectVerificationFor(st, caseId)?.row;
      const req = st.requests.find((r) => r.id === caseId && sitesInView(st).includes(siteOf(r.caseId)));
      if (row) {
        who.current = { caseId, initials: row.initials, age: row.age };
        setForm({ ...EMPTY, payerId: row.payerId, member: row.memberMasked, dob: dobFor(row.age), program: row.program, dos: row.dos });
      } else if (req) {
        who.current = { caseId, initials: req.patient.initials, age: req.patient.age };
        setForm({ ...EMPTY, payerId: req.payerId, dob: dobFor(req.patient.age), program: req.program });
      }
    }
  }, [params]);

  const steps = useMemo(() => verifySteps(form, paused), [form, paused]);
  const check = useLiveCheck(steps, () => {
    if (!form.payerId) return;
    const id = useStore.getState().ebApplyCheck({ payerId: form.payerId, program: form.program, memberId: form.member, dos: form.dos, ...who.current });
    nav(`${paths.eligibilityResult(id)}${origin.query}`);
  });
  const locked = check.started;
  const samples = scope.has(HEADLINE) ? SAMPLES : SAMPLES.filter((s) => s.id !== "auth_first");

  const pickSample = (s: Sample) => {
    who.current = { initials: s.initials, age: s.age };
    setForm(s.form);
    setFound([]);
  };
  /* The import applies only what the person kept in its review and chose Apply for. */
  const applyImport = (r: ImportResult) => {
    const { form: patch, found: rest } = formFromImport(r);
    setForm((f) => ({ ...f, ...patch, source: r.sourceLabel }));
    setFound(rest);
  };

  return (
    <Page>
      <BackLinks back={origin.back} />
      <h1 className="sr-only">Verify a patient</h1>
      {paused ? (
        <Banner
          tone="mid"
          title="Verify is paused in Settings"
          action={
            <Link to={paths.settings()} className="text-[13px] font-semibold underline underline-offset-[3px]">
              Open Settings
            </Link>
          }
        />
      ) : null}
      <div className="grid grid-cols-1 items-start gap-5 min-[1200px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <VerifyForm
          form={form}
          onChange={(p) => setForm((f) => ({ ...f, ...p }))}
          importRow={locked ? null : <ImportSources target="insurance" compact emr={emr} current={{ payerId: form.payerId, memberId: form.member }} onImport={applyImport} />}
          found={found}
          samples={samples}
          onSample={pickSample}
          locked={locked}
          onCheck={check.start}
        />
        <LiveCheck steps={steps} idx={check.idx} secs={check.secs} running={check.running} finished={check.finished} onSkip={check.skip} />
      </div>
    </Page>
  );
}
