import { useId, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, X } from "lucide-react";
import { Button, ChecklistItem, Field, TextInput } from "@/components/ui";
import type { CaseDraft, DocSlotId } from "@/data/cases";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { isReferralDoc, makeDocument, sampleFile } from "./documents";
import { Frame } from "./RecordEditors";
import type { Row } from "./recordsModel";

const ICON_BUTTON = "grid h-8 w-8 place-items-center rounded-lg text-ink2 hover:bg-tile";

/** The short reason a document is "not available". It is kept with the case and read back in the review. */
function Unavailable({ draftId, slot, close }: { draftId: string; slot: DocSlotId; close: () => void }) {
  const mark = useStore((s) => s.markCaseDocUnavailable);
  const [why, setWhy] = useState("");
  const done = () => {
    if (!why.trim()) return;
    mark(draftId, slot, why);
    close();
  };
  return (
    <Frame onClose={close} done={false}>
      <Field label="Why is it not available?">
        <TextInput value={why} maxLength={80} placeholder="For example: the patient has not had one done yet" onChange={(e) => setWhy(e.target.value)} onKeyDown={(e) => e.key === "Enter" && done()} />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" disabled={!why.trim()} onClick={done}>
          Mark not available
        </Button>
        <Button size="sm" variant="ghost" onClick={close}>
          Cancel
        </Button>
      </div>
    </Frame>
  );
}

/** One document of the list. Empty: add a file, use the sample or mark it not available. Filled: look at it, replace it or take it out.
    Marked not available: add the file after all, or undo. The referral that came with the case opens the referral instead. */
export function DocRow({ row, slot, draft, open, onToggle, onPick, onPreview }: { row: Row; slot: DocSlotId; draft: CaseDraft; open: boolean; onToggle: () => void; onPick: (slot: DocSlotId, replace?: boolean) => void; onPreview: (slot: DocSlotId) => void }) {
  const labelId = useId();
  const nav = useNavigate();
  const put = useStore((s) => s.putCaseDocs);
  const drop = useStore((s) => s.dropCaseDoc);
  const undo = useStore((s) => s.clearCaseDocUnavailable);
  const doc = draft.documents.find((x) => x.slot === slot);
  const empty = row.state === "missing" || row.state === "optional";
  const marked = slot in draft.unavailable;

  let action: ReactNode;
  if (!doc && marked) {
    action = (
      <>
        <Button size="sm" aria-describedby={labelId} onClick={() => onPick(slot)}>
          Add file
        </Button>
        <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={() => undo(draft.id, slot)}>
          Undo
        </Button>
      </>
    );
  } else if (!doc) {
    action = (
      <div className="flex max-w-[400px] flex-wrap justify-end gap-2">
        {slot === "referral" && !draft.intakeId ? (
          <Link to={paths.referrals()}>
            <Button size="sm" aria-describedby={labelId}>Find the referral</Button>
          </Link>
        ) : null}
        <Button size="sm" variant={row.state === "missing" && slot !== "referral" ? "outline" : "ghost"} aria-describedby={labelId} onClick={() => onPick(slot)}>
          Add file
        </Button>
        <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={() => put(draft.id, [makeDocument(slot, sampleFile(slot))])}>
          Use sample file
        </Button>
        <Button size="sm" variant="ghost" aria-describedby={labelId} aria-expanded={open} onClick={onToggle}>
          Mark not available
        </Button>
      </div>
    );
  } else if (isReferralDoc(draft.referralId, doc) && draft.referralId) {
    const id = draft.referralId;
    action = (
      <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={() => nav(paths.referral(id, draft.id))}>
        View
      </Button>
    );
  } else {
    action = (
      <>
        <button type="button" aria-label={`View ${doc.file.name}`} onClick={() => onPreview(slot)} className={ICON_BUTTON}>
          <Eye size={16} className="ico" />
        </button>
        <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={() => onPick(slot, true)}>
          Replace
        </Button>
        <button type="button" aria-label={`Remove ${doc.file.name}`} onClick={() => drop(draft.id, slot)} className={ICON_BUTTON}>
          <X size={16} className="ico" />
        </button>
      </>
    );
  }

  return (
    <ChecklistItem state={row.state} label={<span id={labelId}>{row.label}</span>} tag={row.tag} detail={row.quiet && empty ? <span className="text-muted">{row.detail}</span> : row.detail} action={action}>
      {open && !doc && !marked ? <Unavailable draftId={draft.id} slot={slot} close={onToggle} /> : null}
    </ChecklistItem>
  );
}
