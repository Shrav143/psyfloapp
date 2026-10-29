import { Card, Chip, Disclosure, Dropdown, Field, TextArea } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { PROGRAM_CHOICES, serviceWindowNote } from "@/data/programTables";
import { serviceById } from "@/data/va/services";
import type { Program, RequestType } from "@/data/types";
import { useStore } from "@/store";
import { authType, RETRO_REASONS } from "../authType";
import { DatesFields } from "../DatesFields";
import { namesRange } from "../fromIntake";
import { DiagnosisPicker } from "../DiagnosisPicker";
import { ModificationCard } from "../ModificationCard";
import { SitePicker } from "../SitePicker";
import { ServiceNote } from "./ServiceNote";

/** The service, the request type and the dates. The service comes from the care plan when there is one; the person can still change it, and the draft says what the clinician selected. */
export function ServiceSection({ draft }: { draft: CaseDraft }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const def = authType(draft.kind);
  const retro = draft.kind === "retro";
  const edit = (p: Partial<CaseDraft>) => patch(draft.id, { started: true, ...p });
  const fromRecord = !!draft.intakeId;
  /* What the Service field says about where its value comes from. Only a clinician's selection of one service fills it; a range or no selection leaves it to the person, and says why. */
  const note = draft.serviceNote;
  const picked = note?.selected ?? null;
  const serviceHint = !fromRecord || !note ? undefined
    : picked === null ? "No service has been selected by a clinician"
      : namesRange(picked) ? "The care plan names a range; an authorization names one level of care"
        : draft.program === serviceById(picked).program ? "From the care plan"
          : `The care plan selected ${serviceById(picked).short}`;
  const dateLabels = draft.kind === "modify" ? ["Change starts", "Change ends"] : retro ? ["First date of service", "Last date of service"] : ["Requested start date", "Requested end date"];

  return (
    <div className="flex flex-col gap-4">
      <ServiceNote draft={draft} />
      <Card className="px-5 py-4">
        <h3 className="mb-3 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Service and request</h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[640px]:grid-cols-2">
          <Field label="Service" required hint={serviceWindowNote(draft.program, draft.startDate) ?? serviceHint}>
            <Dropdown<Program | ""> variant="field" ariaLabel="Service" placeholder="Choose a service" value={draft.program ?? ""} onChange={(v) => v && edit({ program: v, levelLabel: undefined })} options={PROGRAM_CHOICES} />
          </Field>
          {def.types.length > 1 ? (
            <Field label="Request type">
              <Dropdown<RequestType | ""> variant="field" ariaLabel="Request type" placeholder="Choose a type" value={draft.type ?? ""} onChange={(v) => v && edit({ type: v, what: undefined })} options={def.types.map((t) => ({ value: t, label: t }))} />
            </Field>
          ) : (
            <Field label="Request type"><div className="flex h-[38px] items-center"><Chip>{draft.type ?? def.label}</Chip></div></Field>
          )}
        </div>
        <div className="mt-3">
          <DatesFields draft={draft} from={dateLabels[0]} to={dateLabels[1]} required={retro} />
        </div>
        {fromRecord ? null : <div className="mt-3 max-w-[260px]"><SitePicker draft={draft} /></div>}
      </Card>

      {draft.kind === "modify" ? <ModificationCard draft={draft} /> : null}
      {retro ? (
        <Card className="px-5 py-4">
          <h3 className="mb-3 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Why it was not obtained ahead of time</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {RETRO_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => patch(draft.id, { retroReason: r })} className="rounded-full bg-neutral-bg px-3 py-1 text-[13px] font-medium text-neutral-ink hover:bg-[#E8E5DF]">{r.replace(/\.$/, "")}</button>
            ))}
          </div>
          <Field label="Reason">
            <TextArea value={draft.retroReason ?? ""} onChange={(e) => patch(draft.id, { retroReason: e.target.value })} placeholder="What happened" className="min-h-[72px]" />
          </Field>
        </Card>
      ) : null}

      <Disclosure title={<span className="font-sans text-[14px] font-semibold">Diagnoses and reason</span>} summary={draft.diagnoses.length ? draft.diagnoses.map((d) => d.code).join(", ") : "None on the record yet"} defaultOpen={!draft.diagnoses.length}>
        <div className="flex flex-col gap-3 px-5 py-4">
          <DiagnosisPicker label="Diagnoses (ICD-10)" value={draft.diagnoses} onChange={(diagnoses) => edit({ diagnoses })} note={fromRecord ? "Read from the intake record. Change them in the record's clinical assessment." : undefined} />
          <Field label="Reason for the request">
            <TextArea value={draft.reason} onChange={(e) => edit({ reason: e.target.value })} className="min-h-[64px]" />
          </Field>
        </div>
      </Disclosure>
    </div>
  );
}
