import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CalendarDays, Hash, Paperclip, ShieldCheck } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Dropdown, Field, FileDrop, Pill, Spinner, TextInput, type DemoFile } from "@/components/ui";
import { PAYERS, payerById } from "@/data/seed";
import { PROGRAM_LABEL, PROGRAMS, type PayerId, type Program } from "@/data/types";
import { maskMember } from "@/data/cases";
import { paths } from "@/routes";
import { EXCEPTION_SAMPLES, SAMPLES, type Sample } from "./samples";
import { formReady, type VerifyForm as Form } from "./verifySteps";

export const SAMPLE_CARD = "Insurance card (front).jpg";

function CardStrip({ form, reading, locked, onReplace }: { form: Form; reading: boolean; locked: boolean; onReplace: () => void }) {
  const payer = form.payerId ? payerById(form.payerId) : null;
  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-good-edge bg-[#F3F7F4] p-4">
      <div className="h-[62px] w-24 shrink-0 rounded-[10px] border border-field bg-white p-2 text-[9px] leading-[1.3] text-muted" aria-hidden="true">
        <b className="text-forest">{payer?.shortName ?? "Card"}</b>
        <br />
        {payer?.type ?? "Plan"}
        <br />
        ID ••••{form.member.replace(/\W/g, "").slice(-4) || "0000"}
      </div>
      <div className="min-w-0 flex-1">
        {reading ? (
          <div className="flex items-center gap-2 font-semibold">
            <Spinner />
            Reader is reading the card
          </div>
        ) : (
          <div className="font-semibold">Card read just now</div>
        )}
        <div className="text-[13px] text-muted">Payer, member ID and plan type are filled in below</div>
      </div>
      <Button size="sm" icon={Paperclip} onClick={onReplace} disabled={locked || reading}>
        Replace
      </Button>
    </div>
  );
}

/** One chip per way a check can end. Each fills the form with a member who ends that way. The ones that need a look (a plan change, an ID that differs,
    a benefit nobody confirmed, an unconfirmed enrollment, no rule on file) are one click further, so the form stays calm. */
function SampleRow({ form, onSample, disabled }: { form: Form; onSample: (s: Sample) => void; disabled: boolean }) {
  const [more, setMore] = useState(false);
  const active = [...SAMPLES, ...EXCEPTION_SAMPLES].find((s) => s.form.payerId === form.payerId && s.form.member === form.member && s.form.program === form.program);
  const showMore = more || EXCEPTION_SAMPLES.some((s) => s.id === active?.id);
  const chip = (s: Sample) => (
    <Button key={s.id} size="sm" variant={active?.id === s.id ? "primary" : "outline"} aria-pressed={active?.id === s.id} disabled={disabled} onClick={() => onSample(s)}>
      {s.label}
    </Button>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Try a sample" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] font-medium text-muted">Try a sample</span>
          {SAMPLES.map(chip)}
        </div>
        <Button size="sm" variant="ghost" aria-expanded={showMore} onClick={() => setMore(!showMore)}>
          {showMore ? "Fewer samples" : "More samples"}
        </Button>
      </div>
      {showMore ? (
        <div role="group" aria-label="Try an exception" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] font-medium text-muted">Needs a look</span>
          {EXCEPTION_SAMPLES.map(chip)}
          <span className="basis-full text-xs text-muted">
            To see a check that cannot run, pause Verify in{" "}
            <Link to={paths.settings()} className="font-semibold text-forest hover:underline">
              Settings
            </Link>
            .
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** The short form on the left. Fields lock while the check runs. */
export function VerifyForm({ form, onChange, onCard, onSample, reading, locked, onCheck }: { form: Form; onChange: (p: Partial<Form>) => void; onCard: (files: DemoFile[]) => void; onSample: (s: Sample) => void; reading: boolean; locked: boolean; onCheck: () => void }) {
  const ready = formReady(form);
  const hint = ready ? "Takes about 10 seconds. Nothing is changed at the payer or in the record." : "Add the payer, member ID, date of birth and date of service to check.";
  return (
    <Card>
      <CardHeader title="The patient and the service" subtitle="Add the card, or type the member details" right={<Pill tone="neutral" dot>Privacy mode on</Pill>} />
      <CardBody className="flex flex-col gap-4">
        <SampleRow form={form} onSample={onSample} disabled={locked || reading} />
        {form.cardName || reading ? <CardStrip form={form} reading={reading} locked={locked} onReplace={() => onChange({ cardName: null })} /> : <FileDrop onFiles={onCard} sampleName={SAMPLE_CARD} hint="Drag and drop the insurance card, or click to select a file" disabled={locked} />}
        <div className="grid grid-cols-2 gap-3.5">
          <Field label={form.cardName ? "Payer (read from card)" : "Payer"} required>
            <Dropdown<PayerId | ""> variant="field" value={form.payerId} placeholder="Choose a payer" disabled={locked} onChange={(v) => onChange({ payerId: v })} options={PAYERS.map((p) => ({ value: p.id, label: p.name }))} ariaLabel="Payer" />
          </Field>
          <Field label="State">
            <Dropdown<string> variant="field" value="Ohio" disabled={locked} onChange={() => undefined} options={[{ value: "Ohio", label: "Ohio" }]} ariaLabel="State" />
          </Field>
          <Field label="Member ID (removed before analysis)" required hint={form.member ? `Agents see ${maskMember(form.member)} only` : undefined}>
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
        <Button variant="primary" size="lg" icon={ShieldCheck} disabled={!ready || locked || reading} loading={locked} onClick={onCheck}>
          {locked ? "Checking" : "Check now"}
        </Button>
        <div className="text-center text-xs text-muted">{hint}</div>
      </CardBody>
    </Card>
  );
}
