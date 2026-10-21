import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button, Chip, DocumentSheet, Modal } from "@/components/ui";
import type { CaseDetail, Evidence } from "@/data/caseDetail";
import { payerById } from "@/data/seed";

/** A source chip. Click it to open the page of the chart it points to, with the used text boxed. */
export function EvidenceChip({ evidence, detail }: { evidence: Evidence; detail: CaseDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Open source: ${evidence.label}`} className="rounded-full hover:opacity-80">
        <Chip className="inline-flex items-center gap-1">
          <Link2 size={12} className="ico" />
          {evidence.label}
        </Chip>
      </button>
      <Modal
        open={open} onClose={() => setOpen(false)} title={evidence.label} subtitle={`Source for ${detail.initials}, ${detail.age}. Privacy mode is on.`}
        footer={<Button onClick={() => setOpen(false)}>Close</Button>}
      >
        <DocumentSheet
          highlightId="hit"
          blocks={[
            { kind: "letterhead", org: "Source document", sub: "Names, dates of birth and member IDs are masked" },
            { kind: "title", text: evidence.label },
            { kind: "meta", items: [["Patient", `${detail.initials}, ${detail.age}`], ["Payer", payerById(detail.payerId).name], ["Level of care", detail.levelLabel], ["Request", detail.id]] },
            { kind: "h", text: "What the agents used" },
            { kind: "p", text: evidence.quote, id: "hit" },
            { kind: "p", text: "The full document stays in the chart system. Reader read it and Integrity checked every sentence against it." },
          ]}
        />
      </Modal>
    </>
  );
}

/** The unique sources a list of evidence points to, in order. */
export function uniqueEvidence(list: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return list.filter((e) => (seen.has(e.label) ? false : (seen.add(e.label), true)));
}
