import { useState } from "react";
import { Dropdown, Field, TextInput } from "@/components/ui";
import { REACHED_BY, type LogChange, type PayerConfig, type ReachLine } from "@/data/payerConfig";
import { useStore } from "@/store";
import { Labeled } from "./Labeled";
import { ReasonModal } from "./ReasonModal";

const REACHED = REACHED_BY.map((v) => ({ value: v, label: v }));

/** Edit the plan line, how the payer is reached and the notice rule. Save asks for a reason and logs each change.
    "Reached by" only holds a listed value: one that is not listed starts empty and has to be picked before Save works. */
export function EditPayerModal({ id, cfg, onClose }: { id: string; cfg: PayerConfig; onClose: () => void }) {
  const [plan, setPlan] = useState(cfg.planLine);
  const [reached, setReached] = useState(cfg.reachedBy);
  const [notice, setNotice] = useState(cfg.facts.noticeDue);
  const [backup, setBackup] = useState(cfg.facts.backup);
  const [lines, setLines] = useState<ReachLine[]>(cfg.reach);
  const setLine = (lineId: ReachLine["id"], text: string) => setLines((l) => l.map((x) => (x.id === lineId ? { ...x, text } : x)));
  const listed = REACHED_BY.includes(reached);

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
    <ReasonModal title="Edit payer details" subtitle="Admins can edit. Every edit is logged." valid={listed} onClose={onClose} onSave={save}>
      <Field label="Plan line"><TextInput value={plan} onChange={(e) => setPlan(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Reached by" error={listed ? undefined : `“${reached}” is not one of the listed ways. Pick one from the list.`}>
          <Dropdown variant="field" value={listed ? reached : ""} options={REACHED} onChange={setReached} ariaLabel="Reached by" placeholder="Pick how it is reached" />
        </Labeled>
        <Field label="Notice due"><TextInput value={notice} onChange={(e) => setNotice(e.target.value)} /></Field>
      </div>
      <Field label="Backup route"><TextInput value={backup} onChange={(e) => setBackup(e.target.value)} /></Field>
      {lines.map((l) => (
        <Field key={l.id} label={l.title}><TextInput value={l.text} onChange={(e) => setLine(l.id, e.target.value)} /></Field>
      ))}
    </ReasonModal>
  );
}
