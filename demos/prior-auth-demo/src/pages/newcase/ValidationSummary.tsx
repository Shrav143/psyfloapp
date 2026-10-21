import { useState } from "react";
import { ChevronDown, CircleAlert, CircleCheck } from "lucide-react";
import { Card, CardHeader, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { cn } from "@/lib/cn";
import { DOC_SLOTS, findingText, isOpen, openFindings, requiredDocs } from "./documents";

interface Row {
  id: string;
  label: string;
  warn: boolean;
  findings: { id: string; ok: boolean; text: string }[];
}

/** Every document with what Reader found: green for what checks out, amber for what to look at. Open by default when amber. */
export function ValidationSummary({ draft }: { draft: CaseDraft }) {
  const payer = draft.payerId ? payerById(draft.payerId).shortName : "The payer";
  const [dateMm, dateDd, dateYy] = [draft.startDate.slice(5, 7), draft.startDate.slice(8, 10), draft.startDate.slice(0, 4)];
  const rows: Row[] = [{ id: "start", label: "Start date", warn: false, findings: [{ id: "start-1", ok: true, text: `The start date ${dateMm}/${dateDd}/${dateYy} is inside the notice window` }] }];
  for (const r of requiredDocs(draft.payerId, draft.program)) {
    const doc = draft.documents.find((d) => d.slot === r.slot);
    if (doc) rows.push({ id: r.slot, label: DOC_SLOTS[r.slot].label, warn: openFindings(doc, draft.answers) > 0, findings: doc.findings.map((f) => ({ id: f.id, ok: !isOpen(f, draft.answers), text: findingText(f, draft.answers) })) });
    else rows.push({ id: r.slot, label: DOC_SLOTS[r.slot].label, warn: true, findings: [{ id: `${r.slot}-none`, ok: false, text: r.required ? "This document was not added." : `Not added. ${payer} usually asks for one. You can sign without it.` }] });
  }
  const flagged = rows.filter((r) => r.warn).length;
  const [open, setOpen] = useState<Set<string>>(() => new Set(rows.filter((r) => r.warn).map((r) => r.id)));
  const toggle = (id: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card>
      <CardHeader
        title="Validation summary"
        subtitle="Reader checked every document against the payer's guidelines. Review the findings before you sign."
        right={
          <Pill tone={flagged ? "mid" : "good"} dot>
            {flagged ? `${flagged} to look at` : "Nothing to look at"}
          </Pill>
        }
      />
      <ul>
        {rows.map((r) => (
          <li key={r.id} className="border-b border-line last:border-b-0">
            <button type="button" aria-expanded={open.has(r.id)} onClick={() => toggle(r.id)} className="flex w-full items-center gap-3 px-6 py-3 text-left hover:bg-[#FBF8F3]">
              {r.warn ? <CircleAlert size={18} className="ico text-mid" aria-label="Has a finding" /> : <CircleCheck size={18} className="ico text-good" aria-label="Checks out" />}
              <span className="flex-1 font-semibold">{r.label}</span>
              <ChevronDown size={16} className={cn("ico text-faint transition-transform", open.has(r.id) && "rotate-180")} />
            </button>
            {open.has(r.id) ? (
              <ul className="flex flex-col gap-1.5 pr-6 pb-3.5 pl-[54px]">
                {r.findings.map((f) => (
                  <li key={f.id} className={cn("flex items-start gap-2 text-[13.5px]", f.ok ? "text-ink2" : "text-mid-ink")}>
                    {f.ok ? <CircleCheck size={14} className="ico mt-1 text-good" /> : <CircleAlert size={14} className="ico mt-1 text-mid" />}
                    {f.text}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
