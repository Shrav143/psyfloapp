import { useState } from "react";
import { Link2 } from "lucide-react";
import { Chip, DocumentSheet, Drawer } from "@/components/ui";
import type { CaseDetail, Evidence } from "@/data/caseDetail";
import { payerById } from "@/data/seed";

/** A source chip. Click it to open the page of the chart it points to in a side panel, with the used text boxed. */
export function EvidenceChip({ evidence, detail }: { evidence: Evidence; detail: CaseDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Open source: ${evidence.label}`} aria-haspopup="dialog" className="rounded-full align-middle hover:opacity-80">
        <Chip className="inline-flex items-center gap-1">
          <Link2 size={12} className="ico" />
          {evidence.label}
        </Chip>
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} width={520} title={evidence.label} subtitle={`${detail.initials}, ${detail.age} · ${detail.id}`}>
        <DocumentSheet
          highlightId="hit"
          blocks={[
            { kind: "letterhead", org: "Source document", sub: "Privacy mode: names, dates of birth and member IDs masked" },
            { kind: "title", text: evidence.label },
            { kind: "meta", items: [["Patient", `${detail.initials}, ${detail.age}`], ["Payer", payerById(detail.payerId).name], ["Level of care", detail.levelLabel], ["Request", detail.id]] },
            { kind: "p", text: evidence.quote, id: "hit" },
          ]}
        />
      </Drawer>
    </>
  );
}

/** The unique sources a list of evidence points to, in order. */
export function uniqueEvidence(list: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return list.filter((e) => (seen.has(e.label) ? false : (seen.add(e.label), true)));
}
