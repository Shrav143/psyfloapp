import { useState } from "react";
import { Button, Checkbox, Dropdown, Field, Modal, TextInput } from "@/components/ui";
import { PAYER_GROUPS } from "@/data/payerConfig";
import { PROGRAM_LABEL, PROGRAMS, type Program } from "@/data/types";
import { useStore } from "@/store";
import { Labeled } from "./Labeled";

const TYPES = ["Managed care plan", "PPO", "Medicare Advantage", "Carve-out"].map((v) => ({ value: v, label: v }));
const GROUPS = PAYER_GROUPS.map((v) => ({ value: v, label: v }));
const ROUTES = ["Portal", "Phone", "Fax"];

/** Add a payer: name, type, how it is reached and the programs it covers. It starts with a standard workflow and benchmark figures. Mounted only while open. */
export function AddPayerModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0].value);
  const [group, setGroup] = useState<(typeof PAYER_GROUPS)[number]>(PAYER_GROUPS[0]);
  const [reach, setReach] = useState<string[]>(["Portal"]);
  const [programs, setPrograms] = useState<Program[]>(["RES", "IOP", "PHP"]);
  const [error, setError] = useState("");
  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const save = () => {
    if (!name.trim()) return setError("Add the payer's name.");
    if (!reach.length) return setError("Choose at least one way to reach the payer.");
    if (!programs.length) return setError("Choose at least one program.");
    onAdded(useStore.getState().addPayer({ name: name.trim(), type, group, reach, programs }));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Add a payer" subtitle="The agents start with a standard workflow and learn the rest from decisions." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Add payer</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Payer name" required><TextInput value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="For example: Riverbend Health" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="Plan type"><Dropdown variant="field" value={type} options={TYPES} onChange={setType} ariaLabel="Plan type" /></Labeled>
          <Labeled label="Group"><Dropdown variant="field" value={group} options={GROUPS} onChange={(g) => setGroup(g)} ariaLabel="Group" /></Labeled>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink2">How it is reached</div>
          <div className="flex gap-5">{ROUTES.map((r) => <Checkbox key={r} checked={reach.includes(r)} onChange={() => { setReach(toggle(reach, r)); setError(""); }} label={r} />)}</div>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink2">Programs it covers</div>
          <div className="flex flex-wrap gap-5">{PROGRAMS.map((p) => <Checkbox key={p} checked={programs.includes(p)} onChange={() => { setPrograms(toggle(programs, p)); setError(""); }} label={PROGRAM_LABEL[p]} />)}</div>
        </div>
        {error ? <p role="alert" className="text-[13px] text-risk">{error}</p> : null}
      </div>
    </Modal>
  );
}
