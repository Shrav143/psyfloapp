import { useEffect, useRef, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { DocumentSheet } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/time";
import { SimulatedTag } from "../shared/provenance";

/** The source documents, one tab each, with the block behind the hovered or focused field outlined. Clicking a block finds its fields. */
export function DocumentPane({ record, docId, onDoc, blockId, onBlockClick, boxClass, empty }: {
  record: IntakeRecord;
  docId: string | null;
  onDoc: (id: string) => void;
  blockId: string | null;
  onBlockClick: (docId: string, blockId: string) => void;
  /** Size and scroll of the page box (it scrolls on its own so the page does not jump). */
  boxClass: string;
  empty: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const doc = record.documents.find((d) => d.id === docId) ?? record.documents[0];

  /* Bring the outlined block into view inside the box only. */
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(".outline-risk");
    const b = box.current;
    if (!el || !b) return;
    const top = el.offsetTop;
    if (top < b.scrollTop || top + el.offsetHeight > b.scrollTop + b.clientHeight) b.scrollTo({ top: Math.max(0, top - 24), behavior: "smooth" });
  }, [blockId, doc?.id]);

  if (!doc) return <>{empty}</>;
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {record.documents.length > 1 ? (
        <div role="tablist" aria-label="Source documents" className="flex flex-wrap gap-1.5">
          {record.documents.map((d) => {
            const on = d.id === doc.id;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={on}
                title={d.name}
                onClick={() => onDoc(d.id)}
                className={cn("inline-flex max-w-[260px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium", on ? "border-forest bg-sage-bg text-forest" : "border-field bg-white text-ink2 hover:bg-tile")}
              >
                <FileText size={13} className="ico shrink-0" />
                <span className="truncate">{d.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <span className="min-w-0 truncate font-semibold text-ink2" title={doc.name}>{doc.name}</span>
        <span>Received {shortDate(doc.receivedAt)}</span>
        {doc.simulated ? <SimulatedTag what="Synthetic · simulated import" /> : null}
      </div>
      <div ref={box} data-doc-box className={cn("relative overflow-y-auto rounded-xl bg-tile p-2", boxClass)}>
        {doc.pages.map((p, i) => (
          <DocumentSheet key={i} blocks={p} highlightId={blockId} onBlockClick={(b) => onBlockClick(doc.id, b)} page={i + 1} pages={doc.pages.length} className="mb-2 px-6 py-6 last:mb-0" />
        ))}
      </div>
    </div>
  );
}
