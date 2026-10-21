import { useState } from "react";
import { WandSparkles } from "lucide-react";
import { Banner, Button } from "@/components/ui";
import type { PayerConfig } from "@/data/payerConfig";
import { useOpenDrafts } from "./lib/drafts";
import { UpdateDraftsModal } from "./UpdateDraftsModal";

/** Shown on Process, Rules and Documents after an edit: new drafts use it already, open drafts wait for Update drafts. */
export function Unapplied({ id, name, cfg }: { id: string; name: string; cfg: PayerConfig }) {
  const [open, setOpen] = useState(false);
  const drafts = useOpenDrafts(id);
  if (!cfg.unapplied) return null;
  const n = drafts.length;
  return (
    <>
      <Banner tone="mid" title={`${cfg.unapplied} ${cfg.unapplied === 1 ? "edit applies" : "edits apply"} to new drafts only`} action={<Button size="sm" icon={WandSparkles} onClick={() => setOpen(true)}>{n ? `Update ${n} ${n === 1 ? "draft" : "drafts"}` : "Update drafts"}</Button>}>
        New drafts for {name} use this at once. Sent requests keep what they were sent with. {n ? `Click Update drafts to redraft the open ${n === 1 ? "one" : "ones"} (${drafts.map((d) => d.id).join(", ")}).` : "There are no open drafts for this payer right now."}
      </Banner>
      {open ? <UpdateDraftsModal id={id} name={name} mode="edits" reason={`your edits to ${name}`} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
