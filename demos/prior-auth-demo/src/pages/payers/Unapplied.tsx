import { useState } from "react";
import { WandSparkles } from "lucide-react";
import { Banner, Button } from "@/components/ui";
import type { PayerConfig } from "@/data/payerConfig";
import { useStore } from "@/store";
import { UpdateDraftsModal } from "./UpdateDraftsModal";

/** Shown on Process, Rules and Documents after an edit: new drafts use it already, open drafts wait for Update drafts. */
export function Unapplied({ id, name, cfg }: { id: string; name: string; cfg: PayerConfig }) {
  const [open, setOpen] = useState(false);
  // A joined string keeps the selector's result stable between renders.
  const draftIds = useStore((s) => s.requests.filter((r) => r.payerId === id && r.stage === "preparing").map((r) => r.id).join(","));
  if (!cfg.unapplied) return null;
  const ids = draftIds ? draftIds.split(",") : [];
  return (
    <>
      <Banner tone="mid" title={`${cfg.unapplied} ${cfg.unapplied === 1 ? "edit applies" : "edits apply"} to new drafts only`} action={<Button size="sm" icon={WandSparkles} onClick={() => setOpen(true)}>{ids.length ? `Update ${ids.length} ${ids.length === 1 ? "draft" : "drafts"}` : "Update drafts"}</Button>}>
        New drafts for {name} use your edits already. {ids.length ? `Open drafts (${ids.join(", ")}) follow when you update them.` : "There are no open drafts for this payer right now."}
      </Banner>
      {open ? <UpdateDraftsModal id={id} name={name} draftIds={ids} reason={`your edits to ${name}`} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
