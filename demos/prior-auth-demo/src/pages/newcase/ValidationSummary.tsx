import { useState } from "react";
import { ChevronDown, CircleAlert, CircleCheck } from "lucide-react";
import { Disclosure, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { cn } from "@/lib/cn";
import { docEntries, findingText, isOpen, openFindings, requiredFirst } from "./documents";
import type { PayerContext } from "./payerContext";
import { startDateIssue } from "./payerRules";

export interface ValidationRow {
  id: string;
  label: string;
  warn: boolean;
  /** The payer requires it (the start date always counts). A finding on a required row has to be acknowledged before signing. */
  required: boolean;
  findings: { id: string; ok: boolean; text: string }[];
}

/** The start date, then every document the payer asks for with what Reader found. */
export function validationRows(draft: CaseDraft, clock: number, ctx: PayerContext): ValidationRow[] {
  const payer = draft.payerId ? payerById(draft.payerId).shortName : "The payer";
  const issue = startDateIssue(draft, ctx.rules, clock, payer);
  const [dateMm, dateDd, dateYy] = [draft.startDate.slice(5, 7), draft.startDate.slice(8, 10), draft.startDate.slice(0, 4)];
  const rows: ValidationRow[] = [{ id: "start", label: "Start date", warn: !!issue, required: true, findings: [{ id: "start-1", ok: !issue, text: issue?.text ?? `The start date ${dateMm}/${dateDd}/${dateYy} is inside what ${payer} allows` }] }];
  for (const r of requiredFirst(docEntries(draft.payerId, draft.program, ctx.items))) {
    const doc = draft.documents.find((d) => d.slot === r.slot);
    const reason = draft.unavailable[r.slot];
    if (doc) rows.push({ id: r.slot, label: r.label, warn: openFindings(doc, draft.answers) > 0, required: r.required, findings: doc.findings.map((f) => ({ id: f.id, ok: !isOpen(f, draft.answers), text: findingText(f, draft.answers) })) });
    else if (reason !== undefined) rows.push({ id: r.slot, label: r.label, warn: r.required, required: r.required, findings: [{ id: `${r.slot}-na`, ok: !r.required, text: r.required ? `Marked not available: ${reason}. ${payer} requires it, so it may ask for it.` : `Marked not available: ${reason}. You can sign without it.` }] });
    else rows.push({ id: r.slot, label: r.label, warn: true, required: r.required, findings: [{ id: `${r.slot}-none`, ok: false, text: r.required ? "This document was not added." : `Not added. ${payer} lists it. You can sign without it.` }] });
  }
  return rows;
}

/** Every document against the payer's guidelines: green for what checks out, amber for what to look at. Closed by default, with the rows that need a look open once it opens, because "What is missing" above it already carries what needs a person. */
export function ValidationSummary({ rows }: { rows: ValidationRow[] }) {
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
    <Disclosure
      title="Validation summary"
      summary="Reader checked every document against the payer's guidelines."
      right={
        <Pill tone={flagged ? "mid" : "good"} dot>
          {flagged ? `${flagged} to look at` : "Nothing to look at"}
        </Pill>
      }
    >
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
                  <li key={f.id} className={cn("flex items-start gap-2 text-[13px]", f.ok ? "text-ink2" : "text-mid-ink")}>
                    {f.ok ? <CircleCheck size={14} className="ico mt-1 text-good" /> : <CircleAlert size={14} className="ico mt-1 text-mid" />}
                    {f.text}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}
