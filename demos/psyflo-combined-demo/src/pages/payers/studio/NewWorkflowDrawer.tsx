import { useMemo, useState } from "react";
import { Button, ChoiceCard, Drawer } from "@/components/ui";
import { PROGRAMS, PROGRAM_LABEL, type Program } from "@/data/types";
import { REQUEST_TYPE_LABEL, type RequestType } from "@/data/workflow/types";
import { SelectField, TextField } from "./fields/controls";
import { createNode, TEMPLATE_LIST } from "./lib/engine";
import type { Graph } from "./lib/model";
import { api, type NewWorkflowMeta } from "./lib/store";

/* New workflow: from one of the five templates, or blank (Start and End only). Templates are illustrative, not payer policy. */

export interface PayerInfo { id: string; name: string; state: string; product: string }

const TODAY = "2026-10-20";

/** Start and End, apart, with nothing between them. */
export const blankGraph = (): Graph => ({ nodes: [createNode("start", "start", { x: 120, y: 40 }), createNode("end", "end", { x: 120, y: 360 })], edges: [] });

export function NewWorkflowDrawer({ payer, mode, onClose, onCreated }: { payer: PayerInfo; mode: "template" | "blank"; onClose: () => void; onCreated: (id: string) => void }) {
  const [pick, setPick] = useState<string>(mode === "blank" ? "blank" : "");
  const tpl = TEMPLATE_LIST.find((t) => t.id === pick);
  const [name, setName] = useState("");
  const [service, setService] = useState<Program | "">("");
  const [type, setType] = useState<RequestType | "any" | "">("");
  const chosen = pick === "blank" ? { name: "", requestType: "any" as const } : tpl;
  const effName = name || (chosen ? (pick === "blank" ? "New workflow" : `${chosen.name}${service ? `, ${PROGRAM_LABEL[service]}` : ""}`) : "");
  const effType = type || chosen?.requestType || "any";

  const create = () => {
    if (!chosen) return;
    const meta: NewWorkflowMeta = { payerId: payer.id, name: effName, state: payer.state, product: payer.product, services: service ? [service] : [], requestType: effType, effectiveFrom: TODAY, owner: "Jordan Perez" };
    const id = api.create(meta, pick === "blank" ? undefined : pick);
    if (!id) return;
    if (pick === "blank") api.saveDraft(id, blankGraph(), "Started from a blank canvas");
    onCreated(id);
  };

  const options = useMemo(() => (Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((k) => ({ value: k, label: REQUEST_TYPE_LABEL[k] })), []);

  return (
    <Drawer open onClose={onClose} width={560} title={mode === "blank" ? "Build from scratch" : "Start with a template"} subtitle={`A new draft for ${payer.name}. Nothing is used for cases until you publish it.`} footer={<div className="flex items-center justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!chosen} onClick={create}>Create the draft</Button></div>}>
      <div className="flex flex-col gap-5">
        {mode === "template" ? (
          <div role="radiogroup" aria-label="Templates" className="flex flex-col gap-2.5">
            {TEMPLATE_LIST.map((t) => (
              <ChoiceCard key={t.id} selected={pick === t.id} onClick={() => setPick(t.id)} title={t.name}>
                {t.description}
                <span className="mt-1 block text-xs">Illustrative, not payer policy.</span>
              </ChoiceCard>
            ))}
          </div>
        ) : (
          <p className="m-0 text-sm text-ink2">You get a Start and an End. Add steps from the list on the left of the canvas and connect them.</p>
        )}
        {chosen ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-tile/60 p-4">
            <TextField label="Name" value={name} onChange={setName} placeholder={effName} />
            <SelectField label="Service" value={service} onChange={(v) => setService(v as Program | "")} placeholder="Every service" options={PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))} />
            <SelectField label="Request type" value={effType} onChange={(v) => setType(v as RequestType | "any")} options={[{ value: "any", label: "Any request type (payer default)" }, ...options]} />
            <p className="m-0 text-xs text-muted">Details such as the dates, product and owner can be changed later under Details.</p>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
