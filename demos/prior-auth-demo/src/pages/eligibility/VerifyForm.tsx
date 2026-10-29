import { useState, type ReactNode } from "react";
import { Calendar, CalendarDays, Hash, ShieldCheck } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Dropdown, Field, Pill, TextInput } from "@/components/ui";
import { planInfo } from "@/data/payerConfigPlan";
import { PAYERS, payerById } from "@/data/seed";
import { PROGRAM_LABEL, PROGRAMS, type PayerId, type Program } from "@/data/types";
import { cn } from "@/lib/cn";
import { EXCEPTION_SAMPLES, type Sample } from "./samples";
import { formReady, type VerifyForm as Form } from "./verifySteps";

/** A small chip-sized button for the demo samples, quieter than the form's own controls. */
function SampleChip({ s, active, disabled, onSample }: { s: Sample; active: boolean; disabled: boolean; onSample: (s: Sample) => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onSample(s)}
      className={cn("h-7 rounded-full border px-2.5 text-[12px] font-medium transition-colors disabled:opacity-50", active ? "border-forest bg-forest text-white" : "border-field bg-white text-ink2 hover:bg-tile")}
    >
      {s.label}
    </button>
  );
}

/** One chip per way a check can end, for the demo. The ones that need a look are one click further. */
function SampleRow({ form, samples, onSample, disabled }: { form: Form; samples: Sample[]; onSample: (s: Sample) => void; disabled: boolean }) {
  const [more, setMore] = useState(false);
  const active = [...samples, ...EXCEPTION_SAMPLES].find((s) => s.form.payerId === form.payerId && s.form.member === form.member && s.form.program === form.program);
  const showMore = more || EXCEPTION_SAMPLES.some((s) => s.id === active?.id);
  const chip = (s: Sample) => <SampleChip key={s.id} s={s} active={active?.id === s.id} disabled={disabled} onSample={onSample} />;
  return (
    <div className="flex flex-col gap-2 border-t border-line bg-tile px-5 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <div role="group" aria-label="Try a sample" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] text-muted">Try a sample</span>
          {samples.map(chip)}
        </div>
        <button type="button" aria-expanded={showMore} onClick={() => setMore(!showMore)} className="h-7 rounded-full px-2 text-[12px] font-semibold text-forest hover:bg-sage-bg">
          {showMore ? "Fewer samples" : "More samples"}
        </button>
      </div>
      {showMore ? (
        <div role="group" aria-label="Try an exception" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] text-muted">Needs a look</span>
          {EXCEPTION_SAMPLES.map(chip)}
        </div>
      ) : null}
    </div>
  );
}

/** The short form on the left: the import row, the member and the service, Check now, and the demo samples. Fields lock while the check runs. */
export function VerifyForm({ form, onChange, importRow, found, samples, onSample, locked, onCheck }: { form: Form; onChange: (p: Partial<Form>) => void; importRow: ReactNode; found: string[]; samples: Sample[]; onSample: (s: Sample) => void; locked: boolean; onCheck: () => void }) {
  const ready = formReady(form);
  const plan = form.payerId ? planInfo(payerById(form.payerId)) : null;
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Patient and service" right={<Pill tone="neutral" dot>Privacy mode on</Pill>} />
      <CardBody className="flex flex-col gap-4">
        {importRow}
        {form.source ? (
          <p aria-label="Imported" className="-mt-1 text-[12px] text-muted">
            {[form.source, ...found].join(" · ")}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3.5 max-[560px]:grid-cols-1">
          <Field label="Payer" required hint={plan?.label}>
            <Dropdown<PayerId | ""> variant="field" value={form.payerId} placeholder="Choose a payer" disabled={locked} onChange={(v) => onChange({ payerId: v })} options={PAYERS.map((p) => ({ value: p.id, label: p.name }))} ariaLabel="Payer" />
          </Field>
          <Field label="State">
            <Dropdown<string> variant="field" value="Virginia" disabled={locked} onChange={() => undefined} options={[{ value: "Virginia", label: "Virginia" }]} ariaLabel="State" />
          </Field>
          <Field label="Member ID" required>
            <TextInput aria-label="Member ID" icon={Hash} value={form.member} disabled={locked} placeholder="ABC123456789" onChange={(e) => onChange({ member: e.target.value })} />
          </Field>
          <Field label="Date of birth" required>
            <TextInput aria-label="Date of birth" icon={Calendar} value={form.dob} disabled={locked} placeholder="MM/DD/YYYY" inputMode="numeric" onChange={(e) => onChange({ dob: e.target.value })} />
          </Field>
          <Field label="Program" required>
            <Dropdown<Program> variant="field" value={form.program} disabled={locked} onChange={(v) => onChange({ program: v })} options={PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))} ariaLabel="Program" />
          </Field>
          <Field label="Date of service" required>
            <TextInput aria-label="Date of service" icon={CalendarDays} value={form.dos} disabled={locked} placeholder="MM/DD/YYYY" inputMode="numeric" onChange={(e) => onChange({ dos: e.target.value })} />
          </Field>
        </div>
        <Button variant="primary" icon={ShieldCheck} disabled={!ready || locked} loading={locked} onClick={onCheck} className="self-start">
          {locked ? "Checking" : "Check now"}
        </Button>
      </CardBody>
      <SampleRow form={form} samples={samples} onSample={onSample} disabled={locked} />
    </Card>
  );
}
