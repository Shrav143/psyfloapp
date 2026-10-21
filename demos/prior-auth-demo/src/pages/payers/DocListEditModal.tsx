import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, TextInput } from "@/components/ui";
import type { DocItem } from "@/data/payerConfig";
import { PROGRAM_LABEL, type Program } from "@/data/types";
import { uid } from "@/lib/format";
import { useStore } from "@/store";
import { docsChanges } from "./lib/diffs";
import { ReasonModal } from "./ReasonModal";

/** Add, remove and rename the documents on one list. Save asks for a reason and logs each change. Mounted only while open. */
export function DocListEditModal({ id, name, program, items, onClose }: { id: string; name: string; program: Program; items: DocItem[]; onClose: () => void }) {
  const [list, setList] = useState<DocItem[]>(items.map((d) => ({ ...d })));
  const patch = (docId: string, p: Partial<DocItem>) => setList((l) => l.map((d) => (d.id === docId ? { ...d, ...p } : d)));
  return (
    <ReasonModal size="lg" title={`Edit what ${name} wants for ${PROGRAM_LABEL[program]}`} subtitle="New drafts use this list at once. Sent requests keep what they were sent with. Click Update drafts to redraft open ones." onClose={onClose} onSave={(reason) => {
      const clean = list.filter((d) => d.title.trim()).map((d) => ({ ...d, title: d.title.trim(), requirement: d.requirement.trim() }));
      const changes = docsChanges(items, clean);
      if (!changes.length) useStore.getState().toast({ title: "Nothing changed", tone: "neutral" });
      else useStore.getState().saveDocs(id, program, clean, reason, changes);
      onClose();
    }}>
      <div className="flex flex-col gap-2.5">
        {list.map((d, i) => (
          <div key={d.id} className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold">{i + 1}</span>
            <TextInput aria-label={`Document ${i + 1} name`} value={d.title} onChange={(e) => patch(d.id, { title: e.target.value })} className="flex-[3]" />
            <TextInput aria-label={`Document ${i + 1} requirement`} value={d.requirement} onChange={(e) => patch(d.id, { requirement: e.target.value })} className="flex-[2]" placeholder="What it must show" />
            <button type="button" aria-label={`Remove document ${i + 1}`} onClick={() => setList((l) => l.filter((x) => x.id !== d.id))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-field bg-white text-ink2 hover:bg-tile"><Trash2 size={15} className="ico" /></button>
          </div>
        ))}
        <div><Button size="sm" variant="ghost" icon={Plus} onClick={() => setList((l) => [...l, { id: uid("doc"), title: "", requirement: "" }])}>Add a document</Button></div>
      </div>
    </ReasonModal>
  );
}
