import { Card, Pill } from "@/components/ui";
import { PROGRAMS, PROGRAM_LABEL } from "@/data/types";
import { REQUEST_TYPE_LABEL, type RequestType, type Workflow, type WorkflowMeta } from "@/data/workflow/types";
import { stateName, US_STATES } from "../lib/states";
import { Labeled, MultiChips, SelectField, TextField } from "./fields/controls";
import { STATUS_TONE, STATUS_WORD, datesOf } from "./lib/ui";

/* The workflow's own facts: who it is for and when it applies. Matching in New Case reads exactly these. */

export const metaOf = (w: Workflow): WorkflowMeta => ({ id: w.id, payerId: w.payerId, name: w.name, state: w.state, product: w.product, services: w.services, providerType: w.providerType, requestType: w.requestType, effectiveFrom: w.effectiveFrom, effectiveTo: w.effectiveTo, owner: w.owner });

export const metaSummary = (w: Pick<WorkflowMeta, "services" | "requestType" | "state" | "product" | "effectiveFrom" | "effectiveTo">): string =>
  [w.services.length ? w.services.map((s) => PROGRAM_LABEL[s]).join(", ") : "Every service", w.requestType === "any" ? "any request type" : REQUEST_TYPE_LABEL[w.requestType], stateName(w.state), w.product, datesOf(w.effectiveFrom, w.effectiveTo)].filter(Boolean).join(" · ");

export function WorkflowDetails({ workflow, payerName, onChange, disabled }: { workflow: Workflow; payerName: string; onChange: (patch: Partial<WorkflowMeta>) => void; disabled?: boolean }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-3.5">
        <h3 className="m-0 font-serif text-[18px] font-semibold">Details</h3>
        <Pill tone={STATUS_TONE[workflow.status]} dot>{STATUS_WORD[workflow.status]} · version {workflow.version}</Pill>
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 px-6 py-5 sm:grid-cols-2 xl:grid-cols-3">
        <TextField label="Name" value={workflow.name} onChange={(name) => onChange({ name })} disabled={disabled} maxLength={80} />
        <Labeled label="Payer" hint="Fixed: a workflow belongs to the payer it was made under."><div className="flex h-[38px] items-center rounded-xl border border-line bg-tile px-3 text-sm text-ink2">{payerName}</div></Labeled>
        <TextField label="Plan or product" value={workflow.product ?? ""} onChange={(product) => onChange({ product })} disabled={disabled} placeholder="For example Medicaid managed care" />
        <SelectField label="State" value={workflow.state} onChange={(state) => onChange({ state })} disabled={disabled} options={US_STATES.map(([code, name]) => ({ value: code, label: name }))} />
        <SelectField label="Request type" value={workflow.requestType} onChange={(v) => onChange({ requestType: v as RequestType | "any" })} disabled={disabled} options={[{ value: "any", label: "Any request type (payer default)" }, ...(Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((k) => ({ value: k, label: REQUEST_TYPE_LABEL[k] }))]} help="A workflow for one request type is more specific than one for any, and wins when both match." />
        <TextField label="Provider type" value={workflow.providerType ?? ""} onChange={(providerType) => onChange({ providerType })} disabled={disabled} placeholder="Where it matters" />
        <div className="sm:col-span-2 xl:col-span-3">
          <MultiChips label="Services" values={workflow.services} onChange={(v) => onChange({ services: PROGRAMS.filter((p) => v.includes(p)) })} options={PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))} help="Leave all unchosen for a workflow that applies to every service." />
        </div>
        <DateField label="Effective from" value={workflow.effectiveFrom} onChange={(effectiveFrom) => onChange({ effectiveFrom })} disabled={disabled} />
        <DateField label="Effective to" value={workflow.effectiveTo ?? ""} onChange={(effectiveTo) => onChange({ effectiveTo: effectiveTo || undefined })} disabled={disabled} optional />
        <TextField label="Owner" value={workflow.owner} onChange={(owner) => onChange({ owner })} disabled={disabled} />
        <Labeled label="Version" hint="Set when the workflow is published."><div className="flex h-[38px] items-center rounded-xl border border-line bg-tile px-3 text-sm text-ink2">{workflow.version}</div></Labeled>
        <Labeled label="Status" hint="Changes with Publish and Archive."><div className="flex h-[38px] items-center rounded-xl border border-line bg-tile px-3 text-sm text-ink2">{STATUS_WORD[workflow.status]}</div></Labeled>
        {workflow.startsFrom ? <Labeled label="Started from"><div className="flex h-[38px] items-center rounded-xl border border-line bg-tile px-3 text-sm text-ink2">{workflow.startsFrom}</div></Labeled> : null}
      </div>
    </Card>
  );
}

function DateField({ label, value, onChange, disabled, optional }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; optional?: boolean }) {
  return (
    <Labeled label={label} hint={optional ? "Leave empty for no end date." : undefined}>
      <input aria-label={label} type="date" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-[38px] w-full rounded-xl border border-field bg-white px-3 text-sm text-ink focus:border-forest focus:ring-2 focus:ring-forest/15 focus:outline-none disabled:bg-tile disabled:text-muted" />
    </Labeled>
  );
}
