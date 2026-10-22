import { Globe, Phone, Printer, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button, Field, Label, TextArea } from "@/components/ui";
import type { PayerConfig, ReachLine } from "@/data/payerConfig";
import { useStore } from "@/store";
import { ReasonModal } from "./ReasonModal";

const ICON: Record<ReachLine["id"], LucideIcon> = { portal: Globe, phone: Phone, fax: Printer };

/** How the payer is reached: portal, phone, fax. Read only here; Edit on the payer changes it. */
export function ReachSection({ name, cfg }: { name: string; cfg: PayerConfig }) {
  return (
    <section aria-label={`How to reach ${name}`} className="px-6 py-5">
      <Label>How to reach {name}</Label>
      <div className="mt-3 flex flex-col gap-3">
        {cfg.reach.map((l) => {
          const Icon = ICON[l.id];
          return (
            <div key={l.id} className="flex items-start gap-3.5">
              <Icon size={18} className="ico mt-0.5 text-muted" />
              <div>
                <div className="font-semibold">{l.title}</div>
                <div className="text-[13px] text-muted">{l.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The script every Phone step follows. Edits are logged and never let Caller agree to a change. */
export function CallerSection({ id, cfg }: { id: string; cfg: PayerConfig }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(cfg.caller.text);
  return (
    <section aria-label="Instructions for Caller" className="px-6 py-5">
      <div className="flex items-center justify-between gap-3">
        <Label>Instructions for Caller</Label>
        <Button size="sm" variant="ghost" onClick={() => { setText(cfg.caller.text); setEditing(true); }}>Edit</Button>
      </div>
      <div className="mt-3 rounded-xl border border-tile-edge bg-tile px-3.5 py-3 text-sm leading-[1.5]">{cfg.caller.text}</div>
      <div className="mt-2.5 text-xs text-muted">Used by the Phone steps. Saved {cfg.caller.confirmed}.</div>
      {editing ? (
        <ReasonModal title="Edit the instructions for Caller" subtitle="Caller follows this on every Phone step and never agrees to a change." onClose={() => setEditing(false)} onSave={(reason) => {
          if (text.trim() === cfg.caller.text) useStore.getState().toast({ title: "Nothing changed", tone: "neutral" });
          else useStore.getState().saveCaller(id, text.trim(), reason);
          setEditing(false);
        }}>
          <Field label="Script"><TextArea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[140px]" /></Field>
        </ReasonModal>
      ) : null}
    </section>
  );
}
