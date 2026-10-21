import { useState } from "react";
import { Button, Dropdown, Modal } from "@/components/ui";
import { Labeled } from "./Labeled";
import type { UnmappedField } from "@/data/emr";
import { useStore } from "@/store";

/** A small picker: which Psyflo value should this field fill. Applies to every future pull. Mounted only while open. */
export function MapModal({ field, onClose }: { field: UnmappedField; onClose: () => void }) {
  const [value, setValue] = useState(field.options[0].value);
  return (
    <Modal open size="sm" onClose={onClose} title={`Map “${field.field}”`} subtitle={`In ${field.where}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { useStore.getState().mapField(field.id, value); onClose(); }}>Save the mapping</Button></>}>
      <div className="flex flex-col gap-3.5">
        <p className="text-sm text-ink2">{field.question}</p>
        <Labeled label={field.hint}><Dropdown variant="field" ariaLabel={field.hint} value={value} options={field.options} onChange={setValue} /></Labeled>
        <p className="text-[13px] text-muted">It applies to every future pull. Files already pulled are not rewritten.</p>
      </div>
    </Modal>
  );
}
