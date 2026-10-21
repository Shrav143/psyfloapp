import { TriangleAlert } from "lucide-react";
import { Banner, Card, CardBody, CardHeader, FileDrop, Pill, type DemoFile } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { useStore } from "@/store";
import { DocSlot } from "./DocSlot";
import { makeDocument, requiredDocs, slotForFile } from "./documents";

/** The clinical documents: one slot per document the payer asks for, each checked when a file is added. */
export function DocumentsCard({ draft }: { draft: CaseDraft }) {
  const put = useStore((s) => s.putCaseDocs);
  const toast = useStore((s) => s.toast);
  const list = requiredDocs(draft.payerId, draft.program);
  const have = list.filter((r) => draft.documents.some((d) => d.slot === r.slot)).length;
  const requiredMissing = list.filter((r) => r.required && !draft.documents.some((d) => d.slot === r.slot)).length;
  const payer = draft.payerId ? payerById(draft.payerId).shortName : null;
  /* The recommended documents that are still missing get one plain caution, as the mockup shows for the therapy note. */
  const caution = (["therapy_note", "attendance"] as const).find((slot) => list.some((r) => r.slot === slot) && !draft.documents.some((d) => d.slot === slot));

  /* Reader sorts a pile of files into the slots by file name. */
  const sort = (files: DemoFile[]) => {
    const taken = new Set(draft.documents.map((d) => d.slot));
    const wanted = new Set(list.map((r) => r.slot));
    const placed = [];
    const lost: string[] = [];
    for (const f of files) {
      const slot = slotForFile(f.name, taken);
      if (slot && wanted.has(slot)) {
        taken.add(slot);
        placed.push(makeDocument(slot, f));
      } else lost.push(f.name);
    }
    if (placed.length) put(draft.id, placed);
    toast({ title: placed.length ? `Reader placed ${placed.length} ${placed.length === 1 ? "file" : "files"}` : "Reader could not place those files", body: lost.length ? `Add ${lost.length === 1 ? "this one" : "these"} to a slot below: ${lost.join(", ")}` : "Each one is being checked now.", tone: lost.length ? "mid" : "good" });
  };

  return (
    <Card>
      <CardHeader
        title="The chart"
        subtitle={payer && draft.program ? `${payer} asks for ${list.length} documents for ${PROGRAM_LABEL[draft.program]}. Each is checked when you add it.` : "Choose a payer and a level of care to see every document that is needed. Each is checked when you add it."}
        right={
          <Pill tone={requiredMissing === 0 && have > 0 ? "good" : "neutral"} dot>
            {have} of {list.length} added
          </Pill>
        }
      />
      <CardBody className="flex flex-col gap-4">
        <div className="rounded-2xl border-2 border-dashed border-good-edge bg-[#F3F7F4] p-4">
          <div className="mb-3">
            <div>
              <div className="font-semibold">Drop the whole chart</div>
              <div className="text-[13px] text-muted">Reader sorts the files into the slots below by name</div>
            </div>
          </div>
          <FileDrop onFiles={sort} hint="Drop several files here, or click to choose them" />
        </div>
        {caution ? (
          <Banner tone="mid" icon={TriangleAlert}>
            No {caution === "therapy_note" ? "therapy note from the last 14 days" : "attendance record for the last 14 days"}. {payer ?? "The payer"} usually asks for one. You can continue without it.
          </Banner>
        ) : null}
        <div className="grid grid-cols-2 gap-3.5">
          {list.map((r) => (
            <DocSlot key={r.slot} draft={draft} slot={r.slot} required={r.required} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
