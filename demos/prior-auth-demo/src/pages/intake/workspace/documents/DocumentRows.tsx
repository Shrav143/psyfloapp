import { Eye } from "lucide-react";
import { Button, Chip, Switch } from "@/components/ui";
import type { ModuleId } from "@/data/assess/types";
import type { IntakeDocument } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { moduleOf, sourceOf, TYPE_LABEL } from "./model";

/** One document per row: what it is, where it came from, when, the module it supports (changeable), whether it goes with the authorization, and a view button. */
export function DocumentRows({ docs, sourceOrg, modules, onView, onAttach, onModule }: {
  docs: IntakeDocument[];
  sourceOrg: string;
  modules: { id: ModuleId; label: string }[];
  onView: (d: IntakeDocument) => void;
  onAttach: (d: IntakeDocument, attach: boolean) => void;
  onModule: (d: IntakeDocument, m: ModuleId | undefined) => void;
}) {
  return (
    <ul className="divide-y divide-line" data-documents>
      {docs.map((d) => {
        const linked = moduleOf(d);
        return (
          <li key={d.id} data-doc={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-5 py-3">
            <div className="min-w-0 flex-1 basis-[220px]">
              <button type="button" onClick={() => onView(d)} className="text-left text-[14px] font-medium text-ink hover:text-forest hover:underline">{d.name}</button>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                <span>{TYPE_LABEL[d.kind]}</span>
                <span>· {sourceOf(d, sourceOrg)}</span>
                <span>· {stamp(d.receivedAt)}</span>
                {d.simulated ? <Chip className="border border-dashed border-field bg-transparent">Simulated</Chip> : null}
              </div>
            </div>
            <label className="flex flex-col gap-0.5 text-[12px] text-muted">
              Linked to
              <select
                value={linked ?? ""}
                onChange={(e) => onModule(d, (e.target.value || undefined) as ModuleId | undefined)}
                aria-label={`Module that ${d.name} supports`}
                className="h-8 max-w-[190px] rounded-[10px] border border-field bg-white px-2 text-[13px] text-ink focus:border-forest focus:outline-none"
              >
                <option value="">Not linked</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <Switch checked={!!d.attach} onChange={(v) => onAttach(d, v)} label={<span className="text-[13px]">Attach to authorization</span>} />
            <Button size="sm" icon={Eye} onClick={() => onView(d)} aria-label={`View ${d.name}`}>View</Button>
          </li>
        );
      })}
    </ul>
  );
}
