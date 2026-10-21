import { useState } from "react";
import { Button, Card, CardHeader, Dropdown } from "@/components/ui";
import type { PayerConfig } from "@/data/payerConfig";
import { PROGRAM_LABEL, PROGRAMS, type Program } from "@/data/types";
import { ChartChecker } from "./ChartChecker";
import { DocListEditModal } from "./DocListEditModal";
import { numberWord } from "./lib/payers";
import { Unapplied } from "./Unapplied";

const OPTIONS = PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }));

/** What the payer wants for a level of care: a plain numbered list with no status on any row. */
export function DocumentsTab({ id, name, cfg }: { id: string; name: string; cfg: PayerConfig }) {
  const [program, setProgram] = useState<Program>("RES");
  const [editing, setEditing] = useState(false);
  const items = cfg.docs[program];
  return (
    <div className="flex flex-col gap-4">
      <Unapplied id={id} name={name} cfg={cfg} />
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-4">
        <Card>
          <CardHeader
            title={`What ${name} wants for ${PROGRAM_LABEL[program]}`}
            subtitle={`${numberWord(items.length)} ${items.length === 1 ? "document" : "documents"}. The agents ask for each one before they write a word.`}
            right={<Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit list</Button>}
          />
          <div className="flex items-center gap-3 border-b border-line px-6 py-3">
            <span className="text-[13px] font-medium text-ink2">Level of care</span>
            <Dropdown value={program} options={OPTIONS} onChange={setProgram} ariaLabel="Level of care" menuWidth={190} />
          </div>
          <ol>
            {items.map((d, i) => (
              <li key={d.id} className="flex items-start gap-3.5 border-b border-line px-6 py-3.5 last:border-b-0">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold text-neutral-ink">{i + 1}</span>
                <div>
                  <div className="font-semibold">{d.title}</div>
                  <div className="text-[13.5px] text-muted">{d.requirement}</div>
                </div>
              </li>
            ))}
            {!items.length ? <li className="px-6 py-8 text-sm text-muted">This list is empty. Add the documents {name} asks for.</li> : null}
          </ol>
        </Card>
        <ChartChecker payerId={id} name={name} lists={cfg.docs} onProgram={setProgram} />
      </div>
      {editing ? <DocListEditModal key={program} id={id} name={name} program={program} items={items} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
