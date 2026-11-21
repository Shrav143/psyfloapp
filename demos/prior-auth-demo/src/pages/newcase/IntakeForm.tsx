import type { ReactNode } from "react";
import { Hash } from "lucide-react";
import { Card, Disclosure, Dropdown, Field, TextInput } from "@/components/ui";
import { ageOn, plansOf, SEX_LABEL, type CaseDraft, type ImportedKey, type Onboarding, type PatientSex } from "@/data/cases";
import { isoOf } from "@/data/patients";
import { PAYERS } from "@/data/seed";
import { PROGRAM_CHOICES, serviceWindowNote } from "@/data/programTables";
import { type PayerId, type Program, type RequestType } from "@/data/types";
import { useStore } from "@/store";
import { authType } from "./authType";
import { DiagnosisPicker } from "./DiagnosisPicker";
import { importNote } from "./importIntake";
import { SitePicker } from "./SitePicker";

const GRID = "grid grid-cols-1 gap-x-4 gap-y-3 min-[640px]:grid-cols-2 min-[900px]:grid-cols-3";
const SEXES = Object.keys(SEX_LABEL) as PatientSex[];

function Section({ title, children, first }: { title: string; children: ReactNode; first?: boolean }) {
  return (
    <section aria-label={title} className={first ? "px-5 pt-4 pb-4" : "border-t border-line px-5 pt-4 pb-4"}>
      <h3 className="mb-3 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** Patient onboarding: who the patient is, their coverage and what is asked, as plain fields written straight to the draft. Rarely needed fields wait under More.
    A field filled by an import says where it came from until it is changed. */
export function IntakeForm({ draft }: { draft: CaseDraft }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const clock = useStore((s) => s.clock);
  const edit = (p: Partial<CaseDraft>) => patch(draft.id, { started: true, ...p });
  const editPatient = (p: Partial<CaseDraft["patient"]>) => edit({ patient: { ...draft.patient, ...p } });
  const more = draft.onboarding ?? {};
  const editMore = (p: Partial<Onboarding>) => edit({ onboarding: { ...more, ...p } });
  const note = (key: ImportedKey) => importNote(draft, key);
  const def = authType(draft.kind);
  const retro = draft.kind === "retro";
  const plans = plansOf(draft.payerId);
  const minor = draft.patient.age !== null && draft.patient.age < 18;
  const filledMore = [more.secondary?.payerId ? "Secondary insurance" : "", more.clinician ? "Clinician" : "", more.guardian ? "Guardian" : "", more.referralSource || draft.referrer ? "Referral source" : "", draft.endDate && !retro ? "End date" : ""].filter(Boolean);

  return (
    <Card>
      <Section title="Patient" first>
        <div className={GRID}>
          <Field label="Initials" required hint={note("initials")}>
            <TextInput value={draft.patient.initials} maxLength={8} placeholder="J.M." onChange={(e) => editPatient({ initials: e.target.value.toUpperCase() })} />
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
            <Field label="Date of birth" required={draft.patient.age === null} hint={note("dob")}>
              <TextInput type="date" value={draft.patient.dob ?? ""} max={isoOf(clock)} onChange={(e) => (e.target.value ? editPatient({ dob: e.target.value, age: ageOn(e.target.value, clock) }) : editPatient({ dob: undefined }))} />
            </Field>
            <Field label="Age" hint={draft.patient.dob ? undefined : note("age")}>
              <TextInput type="number" min={1} max={110} value={draft.patient.age ?? ""} disabled={!!draft.patient.dob} onChange={(e) => editPatient({ age: e.target.value ? Number(e.target.value) : null })} />
            </Field>
          </div>
          <Field label="Sex" hint={note("sex")}>
            <Dropdown<PatientSex | ""> variant="field" ariaLabel="Sex" placeholder="Choose" value={draft.patient.sex ?? ""} onChange={(v) => v && editPatient({ sex: v })} options={SEXES.map((s) => ({ value: s, label: SEX_LABEL[s] }))} />
          </Field>
        </div>
      </Section>

      <Section title="Coverage">
        <div className={GRID}>
          <Field label="Payer" required hint={note("payerId")}>
            <Dropdown<PayerId | ""> variant="field" ariaLabel="Payer" placeholder="Choose a payer" value={draft.payerId ?? ""} onChange={(v) => v && edit({ payerId: v, planType: v === draft.payerId ? draft.planType : plansOf(v)[0] ?? "" })} options={PAYERS.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
          <Field label="Plan type" hint={note("planType")}>
            <Dropdown<string> variant="field" ariaLabel="Plan type" placeholder={draft.payerId ? "Choose a plan" : "Choose the payer first"} disabled={!draft.payerId} value={draft.planType} onChange={(v) => edit({ planType: v })} options={plans.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Member ID" hint={note("memberId")}>
            <TextInput icon={Hash} value={draft.memberId} placeholder="ABC123456789" onChange={(e) => edit({ memberId: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section title="Request">
        <div className={GRID}>
          <Field label="Level of care" required hint={serviceWindowNote(draft.program, draft.startDate) ?? note("program")}>
            <Dropdown<Program | ""> variant="field" ariaLabel="Level of care" placeholder="Choose a level of care" value={draft.program ?? ""} onChange={(v) => v && edit({ program: v, levelLabel: undefined })} options={PROGRAM_CHOICES} />
          </Field>
          {def.types.length > 1 ? (
            <Field label="Request type">
              <Dropdown<RequestType | ""> variant="field" ariaLabel="Request type" placeholder="Choose a type" value={draft.type ?? ""} onChange={(v) => v && edit({ type: v, what: undefined })} options={def.types.map((t) => ({ value: t, label: t }))} />
            </Field>
          ) : null}
          <Field label={retro ? "First date of service" : "Requested start date"} required hint={note("startDate")}>
            <TextInput type="date" value={draft.startDate} onChange={(e) => edit({ startDate: e.target.value })} />
          </Field>
          {retro ? (
            <Field label="Last date of service" required error={draft.endDate && draft.startDate && draft.endDate < draft.startDate ? "Before the first date" : undefined}>
              <TextInput type="date" value={draft.endDate ?? ""} min={draft.startDate || undefined} onChange={(e) => edit({ endDate: e.target.value || undefined })} />
            </Field>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 min-[900px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <DiagnosisPicker label="Primary diagnosis (ICD-10)" value={draft.diagnoses} onChange={(diagnoses) => edit({ diagnoses })} note={note("diagnosis")} />
          <SitePicker draft={draft} />
        </div>
      </Section>

      <Disclosure variant="plain" title={<span className="font-sans text-[14px] font-semibold">More</span>} summary={filledMore.length ? filledMore.join(", ") : undefined} keepMounted>
        <div className="flex flex-col gap-3 px-5 py-4">
          <div className={GRID}>
            <Field label="Secondary insurance">
              <Dropdown<string> variant="field" ariaLabel="Secondary insurance" value={more.secondary?.payerId ?? "none"} onChange={(v) => editMore({ secondary: v === "none" ? undefined : { payerId: v, memberId: more.secondary?.memberId ?? "" } })} options={[{ value: "none", label: "None" }, ...PAYERS.filter((p) => p.id !== draft.payerId).map((p) => ({ value: p.id, label: p.name }))]} />
            </Field>
            {more.secondary?.payerId ? (
              <Field label="Secondary member ID">
                <TextInput value={more.secondary.memberId} onChange={(e) => editMore({ secondary: { payerId: more.secondary?.payerId ?? null, memberId: e.target.value } })} />
              </Field>
            ) : null}
            {retro ? null : <DatesEnd draft={draft} />}
          </div>
          <div className={GRID}>
            <Field label="Attending clinician">
              <TextInput value={more.clinician ?? ""} placeholder="Dr. Rivera" onChange={(e) => editMore({ clinician: e.target.value })} />
            </Field>
            <Field label="Clinician NPI" error={more.npi && !/^\d{10}$/.test(more.npi) ? "10 digits" : undefined}>
              <TextInput inputMode="numeric" maxLength={10} value={more.npi ?? ""} placeholder="1234567890" onChange={(e) => editMore({ npi: e.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Referral source">
              <TextInput value={more.referralSource ?? (draft.referrer ? `${draft.referrer.org}${draft.referrer.clinician ? `, ${draft.referrer.clinician}` : ""}` : "")} placeholder="Clinic, school, hospital or self" onChange={(e) => editMore({ referralSource: e.target.value })} />
            </Field>
            {minor ? (
              <Field label="Guardian">
                <TextInput value={more.guardian ?? ""} placeholder="Initials and relationship, e.g. K.P., mother" onChange={(e) => editMore({ guardian: e.target.value })} />
              </Field>
            ) : null}
          </div>
        </div>
      </Disclosure>
    </Card>
  );
}

/** The requested end date, left empty for the level of care's usual length. */
function DatesEnd({ draft }: { draft: CaseDraft }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const bad = !!draft.endDate && !!draft.startDate && draft.endDate < draft.startDate;
  return (
    <Field label="Requested end date" error={bad ? "Before the start date" : undefined}>
      <TextInput type="date" value={draft.endDate ?? ""} min={draft.startDate || undefined} onChange={(e) => patch(draft.id, { endDate: e.target.value || undefined })} />
    </Field>
  );
}
