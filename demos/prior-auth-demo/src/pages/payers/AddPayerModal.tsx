import { useState } from "react";
import { Button, Checkbox, Dropdown, Field, Modal, TextInput } from "@/components/ui";
import { PAYER_GROUPS, payerWithName, REACH_ROUTES } from "@/data/payerConfig";
import { PROGRAM_LABEL, PROGRAMS, type CoreProgram } from "@/data/types";
import { useStore } from "@/store";
import { Labeled } from "./Labeled";
import { DEFAULT_STATE } from "@/data/payerProfile";
import { US_STATES } from "./lib/states";

const TYPES = ["Managed care plan", "Fee-for-service"].map((v) => ({ value: v, label: v }));
const GROUPS = PAYER_GROUPS.map((v) => ({ value: v, label: v }));
const STATES = US_STATES.map(([value, label]) => ({ value, label }));

/** Add a payer: name, organization, product, state, type, how it is reached and the programs it covers. It starts with a standard workflow and benchmark figures. Mounted only while open.
    A name that matches another payer (any capitals) is refused. The organization, state and product place the payer on the landing page; a payer added here joins every picker. */
export function AddPayerModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [product, setProduct] = useState("");
  const [state, setState] = useState<string>(DEFAULT_STATE);
  const [type, setType] = useState(TYPES[0].value);
  const [group, setGroup] = useState<(typeof PAYER_GROUPS)[number]>(PAYER_GROUPS[0]);
  const [reach, setReach] = useState<string[]>(["Portal"]);
  const [programs, setPrograms] = useState<CoreProgram[]>(["RES", "IOP", "PHP"]);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const save = () => {
    if (!name.trim()) return setNameError("Add the payer's name.");
    const same = payerWithName(name, useStore.getState().customPayers);
    if (same) return setNameError(`There is already a payer called “${same.name}”. Use a different name.`);
    if (!reach.length) return setError("Choose at least one way to reach the payer.");
    if (!programs.length) return setError("Choose at least one program.");
    onAdded(useStore.getState().addPayer({ name: name.trim(), type, group, reach, programs, org, state, product }));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Add a payer" subtitle="The agents start with a standard workflow and learn the rest from decisions." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Add payer</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Payer name" required error={nameError}><TextInput value={name} onChange={(e) => { setName(e.target.value); setNameError(""); }} placeholder="For example: Riverbend Health" /></Field>
        <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2">
          <Field label="Organization" hint="The company behind the plan. Left empty, the payer's own name is used."><TextInput value={org} onChange={(e) => setOrg(e.target.value)} placeholder="For example: Riverbend" /></Field>
          <Field label="Product" hint="The plan or product. Left empty, the plan type is used."><TextInput value={product} onChange={(e) => setProduct(e.target.value)} placeholder="For example: Medicaid MCO" /></Field>
          <Labeled label="State"><Dropdown variant="field" value={state} options={STATES} onChange={setState} ariaLabel="State" /></Labeled>
          <Labeled label="Insurance type" hint="Groups the payer and filters the list."><Dropdown variant="field" value={group} options={GROUPS} onChange={(g) => setGroup(g)} ariaLabel="Insurance type" /></Labeled>
          <Labeled label="Plan type"><Dropdown variant="field" value={type} options={TYPES} onChange={setType} ariaLabel="Plan type" /></Labeled>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink2">How it is reached</div>
          <div className="flex gap-5">{REACH_ROUTES.map((r) => <Checkbox key={r} checked={reach.includes(r)} onChange={() => { setReach(toggle(reach, r)); setError(""); }} label={r} />)}</div>
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
