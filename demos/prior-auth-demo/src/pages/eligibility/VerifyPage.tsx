import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button, Page, PageHeader, type DemoFile } from "@/components/ui";
import { PAYERS } from "@/data/seed";
import type { PayerId } from "@/data/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { referralPrefill } from "@/store/referrals";
import { LiveCheck, useLiveCheck } from "./LiveCheck";
import { SAMPLE_CARD, VerifyForm } from "./VerifyForm";
import { verifySteps, type VerifyForm as Form } from "./verifySteps";

const EMPTY: Form = { payerId: "", member: "", dob: "", program: "RES", dos: "10/21/2026", cardName: null };
/** The sample card belongs to J.M., whose check is already on the list. */
const SAMPLE: Form = { payerId: "summit", member: "SM7403964821", dob: "03/14/1992", program: "RES", dos: "10/21/2026", cardName: SAMPLE_CARD };
const READ_MS = 1100;

/** A birth date that matches the age, so a case or referral pre-fills the whole form. The date is never shown elsewhere. */
const dobFor = (age: number | null | undefined): string => (age ? `01/15/${2026 - age}` : "");
const hashDigits = (s: string): string => String(1000 + (Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) * 31) % 9000);

/** Verify a patient: a short form on the left, the live check on the right. Opens the result when the check finishes. */
export default function VerifyPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const toast = useStore((s) => s.toast);
  const [form, setForm] = useState<Form>(EMPTY);
  const [reading, setReading] = useState(false);
  const who = useRef<{ caseId?: string; initials?: string | null; age?: number | null }>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* Pre-fill from ?referral=ID or ?case=ID once. */
  useEffect(() => {
    const st = useStore.getState();
    const referral = params.get("referral");
    const caseId = params.get("case");
    if (referral) {
      const p = referralPrefill(st, referral);
      if (!p) return void st.toast({ title: "Referral not found", body: `We could not find ${referral}. Type the details instead.`, tone: "mid" });
      who.current = { initials: p.patientInitials, age: p.age };
      setForm({ ...EMPTY, payerId: p.payerId ?? "", member: p.memberIdMasked, dob: dobFor(p.age), program: p.program });
    } else if (caseId) {
      const row = st.ebPatients.find((x) => x.id === caseId);
      const req = st.requests.find((r) => r.id === caseId);
      if (row) {
        who.current = { caseId, initials: row.initials, age: row.age };
        setForm({ ...EMPTY, payerId: row.payerId, member: row.memberMasked, dob: dobFor(row.age), program: row.program, dos: row.dos });
      } else if (req) {
        who.current = { caseId, initials: req.patient.initials, age: req.patient.age };
        setForm({ ...EMPTY, payerId: req.payerId, dob: dobFor(req.patient.age), program: req.program });
      }
    }
  }, [params]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const steps = useMemo(() => verifySteps(form), [form]);
  const check = useLiveCheck(steps, () => {
    if (!form.payerId) return;
    const id = useStore.getState().ebApplyCheck({ payerId: form.payerId, program: form.program, memberId: form.member, dos: form.dos, ...who.current });
    nav(paths.eligibilityResult(id));
  });
  const locked = check.started;

  const readCard = (files: DemoFile[]) => {
    const name = files[0]?.name ?? SAMPLE_CARD;
    setReading(true);
    setForm((f) => ({ ...f, cardName: name }));
    timer.current = setTimeout(() => {
      setReading(false);
      const matched = PAYERS.find((p) => name.toLowerCase().includes(p.shortName.toLowerCase()));
      setForm((f) => ({ ...f, payerId: (f.payerId || matched?.id || "summit") as PayerId, member: f.member || (name === SAMPLE_CARD ? SAMPLE.member : `OH7403${hashDigits(name)}`) }));
    }, READ_MS);
  };

  return (
    <Page>
      <Link to={paths.eligibility()} className="-mb-1.5 flex w-fit items-center gap-1.5 text-muted hover:text-ink">
        <ArrowLeft size={14} className="ico" />
        Eligibility &amp; Benefits
      </Link>
      <PageHeader
        title="Verify a patient"
        sub="The agents check coverage and benefits live, so you know whether the clinic will be paid."
        actions={
          <Button
            icon={Sparkles}
            disabled={locked}
            onClick={() => {
              who.current = { initials: "J.M.", age: 34 };
              setForm(SAMPLE);
              toast({ title: "Sample card loaded", body: "Reader filled in the details for J.M., 34. The check can start when you are ready.", tone: "neutral" });
            }}
          >
            Use sample card
          </Button>
        }
      />
      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start gap-5">
        <VerifyForm form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} onCard={readCard} reading={reading} locked={locked} onCheck={check.start} />
        <LiveCheck steps={steps} idx={check.idx} secs={check.secs} running={check.running} finished={check.finished} onSkip={check.skip} />
      </div>
    </Page>
  );
}
