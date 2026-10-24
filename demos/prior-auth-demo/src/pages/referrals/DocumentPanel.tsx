import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Button, Card, DocumentSheet, Segmented } from "@/components/ui";
import { CHANNEL_LABEL, type DocId, type Referral, type ReferralDoc } from "@/data/referrals";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";

interface Props {
  r: Referral;
  docs: ReferralDoc[];
  docId: DocId;
  page: number;
  highlightId: string | null;
  onDoc: (d: DocId) => void;
  onPage: (p: number) => void;
  onBlock: (blockId: string) => void;
}

/** The source document, paper-style, with the evidence block boxed in red when a field is selected. */
export function DocumentPanel({ r, docs, docId, page, highlightId, onDoc, onPage, onBlock }: Props) {
  const toast = useStore((s) => s.toast);
  const doc = docs.find((d) => d.id === docId) ?? docs[0];
  const pages = doc.pages.length;
  const current = Math.min(page, pages);
  return (
    <Card className="flex max-h-[calc(100vh-96px)] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-semibold leading-tight">Source document</h3>
          <p className="text-[13px] text-muted">{CHANNEL_LABEL[r.channel]} from {r.source.name}, {stamp(r.receivedAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented items={docs.map((d) => ({ id: d.id, label: d.title }))} value={docId} onChange={onDoc} />
          <Button size="sm" icon={Printer} aria-label="Print the source document" onClick={() => toast({ title: "Printing the original", body: "This is a demo. The faxed pages would open in your print dialog.", tone: "neutral" })} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F2EA] p-4">
        <DocumentSheet blocks={doc.pages[current - 1]} highlightId={highlightId} onBlockClick={onBlock} className="px-8 py-7" />
      </div>
      {pages > 1 ? (
        <div className="flex items-center justify-center gap-4 border-t border-line px-5 py-3">
          <Button size="sm" icon={ChevronLeft} disabled={current === 1} onClick={() => onPage(current - 1)}>Previous</Button>
          <span className="text-sm font-medium">Page {current} of {pages}</span>
          <Button size="sm" trailing={ChevronRight} disabled={current === pages} onClick={() => onPage(current + 1)}>Next</Button>
        </div>
      ) : (
        <div className="border-t border-line px-5 py-3 text-center text-sm text-muted">Page 1 of 1</div>
      )}
    </Card>
  );
}
