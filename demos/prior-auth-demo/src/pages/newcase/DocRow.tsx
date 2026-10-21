import { useId, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, X } from "lucide-react";
import { Button, ChecklistItem } from "@/components/ui";
import type { CaseDraft, DocSlotId } from "@/data/cases";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { isReferralDoc, makeDocument, sampleFile } from "./documents";
import type { Row } from "./recordsModel";

const ICON_BUTTON = "grid h-8 w-8 place-items-center rounded-lg text-ink2 hover:bg-tile";

/** One document of the list. Empty: add a file or use the sample. Filled: look at it or take it out. The referral that came with the case opens the referral instead. */
export function DocRow({ row, slot, draft, onPick, onPreview }: { row: Row; slot: DocSlotId; draft: CaseDraft; onPick: (slot: DocSlotId) => void; onPreview: (slot: DocSlotId) => void }) {
  const labelId = useId();
  const nav = useNavigate();
  const patch = useStore((s) => s.patchCaseDraft);
  const put = useStore((s) => s.putCaseDocs);
  const drop = useStore((s) => s.dropCaseDoc);
  const doc = draft.documents.find((x) => x.slot === slot);
  const empty = row.state === "missing" || row.state === "optional";

  let action: ReactNode;
  if (!doc) {
    action = (
      <>
        {slot === "referral" ? (
          <Button size="sm" aria-describedby={labelId} onClick={() => patch(draft.id, { phase: "referral" })}>
            Add a referral
          </Button>
        ) : null}
        <Button size="sm" variant={row.state === "missing" && slot !== "referral" ? "outline" : "ghost"} aria-describedby={labelId} onClick={() => onPick(slot)}>
          Add file
        </Button>
        <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={() => put(draft.id, [makeDocument(slot, sampleFile(slot))])}>
          Use sample file
        </Button>
      </>
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
        <button type="button" aria-label={`Remove ${doc.file.name}`} onClick={() => drop(draft.id, slot)} className={ICON_BUTTON}>
          <X size={16} className="ico" />
        </button>
      </>
    );
  }

  return <ChecklistItem state={row.state} label={<span id={labelId}>{row.label}</span>} tag={row.tag} detail={row.quiet && empty ? <span className="text-muted">{row.detail}</span> : row.detail} action={action} />;
}
