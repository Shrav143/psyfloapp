import { PROGRAMS, PROGRAM_LABEL, type Program } from "@/data/types";
import { REQUEST_TYPE_LABEL, type CaseFacts, type RequestType, type Workflow } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { Button, Checkbox } from "@/components/ui";
import { Fold, Labeled, NumberField, SelectField } from "./fields/controls";
import type { DocItem } from "@/data/payerConfig";
import { gateNodes, type Approvals, type TestCase } from "./lib/testCases";

/* The fictional test case. Every field is a fact the engine reads; nothing here is a real patient. */

const opt = (pairs: [string, string][]): { value: string; label: string }[] => pairs.map(([value, label]) => ({ value, label }));

export function TestForm({ value, onChange, docs, workflow, onService }: { value: TestCase; onChange: (t: TestCase) => void; docs: DocItem[]; workflow?: Pick<Workflow, "nodes">; onService: (s: Program) => void }) {
  const f = value.facts;
  const setF = (p: Partial<CaseFacts>) => onChange({ ...value, facts: { ...f, ...p } });
  const gates = workflow ? gateNodes(workflow) : [];
  const have = docs.filter((d) => f.documents[d.id]).length;
  const retro = f.requestType === "retro";

  return (
    <div className="flex flex-col gap-2.5">
      <Fold title="The request" summary={`${PROGRAM_LABEL[f.service]} · ${REQUEST_TYPE_LABEL[f.requestType]}`} defaultOpen>
        <div className="flex flex-col gap-3.5">
          <SelectField label="Service" value={f.service} onChange={(v) => onService(v as Program)} options={PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))} />
          <SelectField label="Request type" value={f.requestType} onChange={(v) => setF({ requestType: v as RequestType })} options={(Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((k) => ({ value: k, label: REQUEST_TYPE_LABEL[k] }))} />
          <NumberField label="Requested units or days" value={f.requestedUnits ?? ""} min={0} max={365} onChange={(v) => setF({ requestedUnits: v === "" ? undefined : v })} />
        </div>
      </Fold>

      <Fold title="Coverage and authorization" summary={`${cap(f.coverage)} coverage · ${f.benefit.replace("_", " ")} · authorization ${f.authRequirement.replace("_", " ")}`} defaultOpen>
        <div className="flex flex-col gap-3.5">
          <SelectField label="Coverage" value={f.coverage} onChange={(v) => setF({ coverage: v as CaseFacts["coverage"] })} options={opt([["active", "Active"], ["inactive", "Inactive"], ["unknown", "Unknown"]])} />
          <SelectField label="Benefit for the service" value={f.benefit} onChange={(v) => setF({ benefit: v as CaseFacts["benefit"] })} options={opt([["covered", "Covered"], ["limited", "Limited"], ["not_covered", "Not covered"], ["unknown", "Unknown"]])} />
          <SelectField label="Authorization requirement" value={f.authRequirement} onChange={(v) => setF({ authRequirement: v as CaseFacts["authRequirement"] })} options={opt([["required", "Required"], ["concurrent", "Concurrent review required"], ["not_required", "Not required"], ["unknown", "Unknown"]])} />
          <SelectField label="Provider in network" value={f.inNetwork} onChange={(v) => setF({ inNetwork: v as CaseFacts["inNetwork"] })} options={opt([["yes", "Yes"], ["no", "No"], ["unknown", "Unknown"]])} />
        </div>
      </Fold>

      <Fold title="Dates and existing authorization" summary={`Starts ${f.requestedStart}${value.hasExisting ? " · has an authorization" : ""}`}>
        <div className="flex flex-col gap-3.5">
          <DateField label="Today (the demo date)" value={f.today} onChange={(today) => setF({ today })} />
          <DateField label="Requested start date" value={f.requestedStart} onChange={(requestedStart) => setF({ requestedStart })} />
          {retro ? (
            <div className="grid grid-cols-2 gap-3">
              <DateField label="Service from" value={value.serviceFrom} onChange={(serviceFrom) => onChange({ ...value, serviceFrom })} />
              <DateField label="Service to" value={value.serviceTo} onChange={(serviceTo) => onChange({ ...value, serviceTo })} />
            </div>
          ) : null}
          <Checkbox checked={value.hasExisting} onChange={(hasExisting) => onChange({ ...value, hasExisting })} label="Has an existing authorization" />
          {value.hasExisting ? (
            <div className="flex flex-col gap-3.5 rounded-xl bg-tile/70 p-3">
              <NumberField label="Units remaining" value={f.existingAuth?.unitsRemaining ?? 0} min={0} max={365} onChange={(v) => setF({ existingAuth: { ref: f.existingAuth?.ref ?? "A-demo", unitsRemaining: v === "" ? 0 : v, expiresOn: f.existingAuth?.expiresOn ?? f.today } })} />
              <DateField label="Expires on" value={f.existingAuth?.expiresOn ?? ""} onChange={(expiresOn) => setF({ existingAuth: { ref: f.existingAuth?.ref ?? "A-demo", unitsRemaining: f.existingAuth?.unitsRemaining ?? 0, expiresOn } })} />
            </div>
          ) : null}
        </div>
      </Fold>

      <Fold title="Documents on hand" summary={docs.length ? `${have} of ${docs.length} in the case` : "The payer has no list for this service"}>
        {docs.length === 0 ? (
          <p className="m-0 text-[13px] text-muted">This payer has no document list for {PROGRAM_LABEL[f.service]}. Add one in Rules & Instructions.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {docs.map((d) => (
                <li key={d.id}>
                  <Checkbox checked={!!f.documents[d.id]} onChange={(on) => setF({ documents: { ...f.documents, [d.id]: on } })} label={d.title} />
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setF({ documents: Object.fromEntries(docs.map((d) => [d.id, true])) })}>All in</Button>
              <Button size="sm" onClick={() => setF({ documents: Object.fromEntries(docs.map((d) => [d.id, false])) })}>None in</Button>
            </div>
          </div>
        )}
      </Fold>

      <Fold title="Payer and portal" summary={`${f.payerResponse === "none" ? "No answer yet" : f.payerResponse.replace("_", " ")} · portal ${f.portalStatus} · ${f.waitingDays} days waiting`}>
        <div className="flex flex-col gap-3.5">
          <SelectField label="Payer response" value={f.payerResponse} onChange={(v) => setF({ payerResponse: v as CaseFacts["payerResponse"] })} options={opt([["none", "No answer yet"], ["approved", "Approved"], ["partial", "Approved in part"], ["denied", "Denied"], ["more_info", "Asked for more information"]])} />
          <SelectField label="Payer portal" value={f.portalStatus} onChange={(v) => setF({ portalStatus: v as CaseFacts["portalStatus"] })} options={opt([["up", "Up"], ["down", "Down"]])} />
          <NumberField label="Business days waiting" value={f.waitingDays} min={0} max={60} unit="days" onChange={(v) => setF({ waitingDays: v === "" ? 0 : v })} />
        </div>
      </Fold>

      <Fold title="Approvals already given" summary={value.approvals === "none" ? "None given yet" : value.approvals === "all" ? `All ${gates.length} given` : `${value.approvedIds.length} of ${gates.length} given`}>
        <div className="flex flex-col gap-3">
          <Labeled label="Manual approvals">
            <div role="radiogroup" aria-label="Manual approvals" className="grid grid-cols-3 gap-1 rounded-xl border border-field bg-white p-0.5">
              {(["none", "some", "all"] as Approvals[]).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={value.approvals === m} onClick={() => onChange({ ...value, approvals: m })} className={cn("h-8 rounded-[9px] px-1 text-[12px] font-medium", value.approvals === m ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}>
                  {m === "none" ? "None yet" : m === "some" ? "Choose" : "All given"}
                </button>
              ))}
            </div>
          </Labeled>
          {value.approvals === "some" ? (
            gates.length ? (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {gates.map((g) => (
                  <li key={g.id}>
                    <Checkbox checked={value.approvedIds.includes(g.id)} onChange={(on) => onChange({ ...value, approvedIds: on ? [...value.approvedIds, g.id] : value.approvedIds.filter((x) => x !== g.id) })} label={g.title} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[13px] text-muted">This workflow has no step that waits for a person.</p>
            )
          ) : null}
          <p className="m-0 text-xs text-muted">A step that waits for a person stops the run until its approval is given, as in New Authorization.</p>
        </div>
      </Fold>
    </div>
  );
}

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Labeled label={label}>
      <input aria-label={label} type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-[38px] w-full rounded-xl border border-field bg-white px-3 text-sm text-ink focus:border-forest focus:ring-2 focus:ring-forest/15 focus:outline-none" />
    </Labeled>
  );
}
