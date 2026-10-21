import { useState } from "react";
import { Dropdown, Field, TextInput } from "@/components/ui";
import { Labeled } from "./Labeled";
import type { LogChange, PayerConfig, ReachLine } from "@/data/payerConfig";
import { useStore } from "@/store";
import { ReasonModal } from "./ReasonModal";

const REACHED = ["Portal", "Portal and fax", "Portal and phone", "Phone", "Fax"].map((v) => ({ value: v, label: v }));

/** Edit the plan line, how the payer is reached and the notice rule. Save asks for a reason and logs each change. */
export function EditPayerModal({ id, cfg, onClose }: { id: string; cfg: PayerConfig; onClose: () => void }) {
  const [plan, setPlan] = useState(cfg.planLine);
  const [reached, setReached] = useState(REACHED.some((r) => r.value === cfg.reachedBy) ? cfg.reachedBy : "Portal");
  const [notice, setNotice] = useState(cfg.facts.noticeDue);
  const [backup, setBackup] = useState(cfg.facts.backup);
  const [lines, setLines] = useState<ReachLine[]>(cfg.reach);
  const setLine = (lineId: ReachLine["id"], text: string) => setLines((l) => l.map((x) => (x.id === lineId ? { ...x, text } : x)));

  const save = (reason: string) => {
    const changes: LogChange[] = [];
    if (plan !== cfg.planLine) changes.push({ what: "Plan line", before: cfg.planLine, after: plan });
    if (reached !== cfg.reachedBy) changes.push({ what: "Reached by", before: cfg.reachedBy, after: reached });
    if (notice !== cfg.facts.noticeDue) changes.push({ what: "Notice due", before: cfg.facts.noticeDue, after: notice });
    if (backup !== cfg.facts.backup) changes.push({ what: "Backup route", before: cfg.facts.backup, after: backup });
    for (const l of lines) {
      const o = cfg.reach.find((x) => x.id === l.id);
      if (o && o.text !== l.text) changes.push({ what: `How to reach: ${l.title}`, before: o.text, after: l.text });
    }
    if (!changes.length) {
      useStore.getState().toast({ title: "Nothing changed", tone: "neutral" });
    } else {
      useStore.getState().editPayerDetails(id, { planLine: plan, reachedBy: reached, noticeDue: notice, backup, reach: lines }, reason, changes);
    }
    onClose();
  };

  return (
    <ReasonModal title="Edit payer details" subtitle="Admins can edit. Every edit is logged." onClose={onClose} onSave={save}>
      <Field label="Plan line"><TextInput value={plan} onChange={(e) => setPlan(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Reached by"><Dropdown variant="field" value={reached} options={REACHED} onChange={setReached} ariaLabel="Reached by" /></Labeled>
        <Field label="Notice due"><TextInput value={notice} onChange={(e) => setNotice(e.target.value)} /></Field>
      </div>
      <Field label="Backup route"><TextInput value={backup} onChange={(e) => setBackup(e.target.value)} /></Field>
      {lines.map((l) => (
        <Field key={l.id} label={l.title}><TextInput value={l.text} onChange={(e) => setLine(l.id, e.target.value)} /></Field>
      ))}
    </ReasonModal>
  );
}
