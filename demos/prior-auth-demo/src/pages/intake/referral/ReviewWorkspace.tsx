import { useRef, useState } from "react";
import { FileX } from "lucide-react";
import { InfoTip } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { AddDocumentButton } from "./AddDocument";
import { BulkAccept } from "./BulkAccept";
import { DocumentPane } from "./DocumentPane";
import { ReferralFields, type DocSpot } from "./ReferralFields";

/* The source document beside the extracted fields. In the section it goes side by side from 1100 px of room and stacks below that; in the
   wide review drawer from 860 px. The page box scrolls on its own, so outlining a block never moves the page. */
const LAYOUT = {
  section: { grid: "@min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", doc: "max-h-[440px] @min-[1100px]:max-h-[calc(100vh-140px)]", sticky: "@min-[1100px]:sticky @min-[1100px]:top-4 @min-[1100px]:self-start" },
  wide: { grid: "@min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", doc: "max-h-[440px] @min-[860px]:max-h-[calc(100vh-170px)]", sticky: "@min-[860px]:sticky @min-[860px]:top-0 @min-[860px]:self-start" },
};

export function ReviewWorkspace({ record, variant = "section", docId, onDoc }: { record: IntakeRecord; variant?: keyof typeof LAYOUT; docId: string | null; onDoc: (id: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<DocSpot | null>(null);
  const [pin, setPin] = useState<DocSpot | null>(null);
  const spot = hover ?? pin;
  const shownDoc = spot?.docId ?? docId;
  const L = LAYOUT[variant];

  const findFields = (d: string, b: string) => {
    setPin({ docId: d, blockId: b });
    const el = root.current?.querySelector<HTMLElement>(`[data-src-doc="${d}"][data-src-block="${b}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <div ref={root} className="@container">
      <div className={cn("grid grid-cols-1 gap-5", L.grid)}>
        <div className={cn("min-w-0", L.sticky)}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1 text-[16px] font-semibold">
              Source documents
              <InfoTip label="About the outline">Hover or focus a field to outline where it came from. Click a passage in the document to find the fields taken from it.</InfoTip>
            </h3>
            <AddDocumentButton record={record} onAdded={onDoc} />
          </div>
          <DocumentPane
            record={record}
            docId={shownDoc}
            onDoc={(id) => {
              setPin(null);
              onDoc(id);
            }}
            blockId={spot && spot.docId === (shownDoc ?? record.documents[0]?.id) ? spot.blockId : null}
            onBlockClick={findFields}
            boxClass={L.doc}
            empty={
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-field px-4 py-8 text-center text-[13px] text-muted">
                <FileX size={20} className="ico" />
                No document yet. {record.method === "manual" || record.method === "phone" || record.method === "voice" ? "This intake started without one." : ""} Add the referral or a supporting document to have Reader suggest fields.
              </div>
            }
          />
          {pin ? (
            <p className="mt-2 text-[12px] text-muted">
              Outlined: the source of the highlighted fields.{" "}
              <button type="button" className="font-semibold text-forest hover:underline" onClick={() => setPin(null)}>Clear</button>
            </p>
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-semibold">Referral details</h3>
            <BulkAccept record={record} />
          </div>
          <ReferralFields record={record} active={spot} onHover={setHover} onPin={setPin} />
        </div>
      </div>
    </div>
  );
}
