import { useState } from "react";
import { Button, Disclosure, Dropdown } from "@/components/ui";
import type { PayerConfig } from "@/data/payerConfig";
import { PROGRAM_LABEL, PROGRAMS, type CoreProgram } from "@/data/types";
import { ChartChecker } from "./ChartChecker";
import { DocListEditModal } from "./DocListEditModal";
import { numberWord } from "../lib/payers";

const OPTIONS = PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }));

/** The Clinical documentation group: what the payer wants for a level of care. The list is closed on a one-line summary and opens to a numbered list; the chart checker sits below it. */
export function DocumentsGroup({ id, name, cfg, startProgram = "RES" }: { id: string; name: string; cfg: PayerConfig; startProgram?: CoreProgram }) {
  const [program, setProgram] = useState<CoreProgram>(startProgram);
  const [editing, setEditing] = useState(false);
  const items = cfg.docs[program];
  const first = items.slice(0, 2).map((d) => d.title);
  const summary = items.length ? `${numberWord(items.length)} ${items.length === 1 ? "document" : "documents"}: ${first.join(", ")}${items.length > first.length ? `, and ${items.length - first.length} more` : ""}.` : "This list is empty.";
  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-medium text-ink2">Level of care</span>
        <Dropdown value={program} options={OPTIONS} onChange={setProgram} ariaLabel="Level of care" menuWidth={190} />
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit list</Button>
        <span className="text-xs text-muted">Demo sample lists, Unverified. New Case asks for what is listed here.</span>
      </div>
      <Disclosure title={`What ${name} wants for ${PROGRAM_LABEL[program]}`} summary={summary}>
        <ol>
          {items.map((d, i) => (
            <li key={d.id} className="flex items-start gap-3.5 border-b border-line px-6 py-3.5 last:border-b-0">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold text-neutral-ink">{i + 1}</span>
              <div>
                <div className="font-semibold">{d.title}</div>
                <div className="text-[13px] text-muted">{d.requirement}</div>
              </div>
            </li>
          ))}
          {!items.length ? <li className="px-6 py-8 text-sm text-muted">This list is empty. Add the documents {name} asks for.</li> : null}
        </ol>
        <p className="border-t border-line px-6 py-3 text-xs text-muted">The agents ask for each one before they write a word.</p>
      </Disclosure>
      <ChartChecker payerId={id} name={name} lists={cfg.docs} program={program} onProgram={setProgram} />
      {editing ? <DocListEditModal key={program} id={id} name={name} program={program} items={items} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
