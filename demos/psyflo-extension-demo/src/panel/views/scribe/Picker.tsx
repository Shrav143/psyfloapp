import { useState } from "react";
import { useCurrent } from "@/hooks";
import { useStore } from "@/store";

/** Who the session is for and which document it fills. Choosing opens that document in Lauris, so the panel and the EHR never disagree. */
export default function Picker() {
  const { clinic, docId, consumer } = useCurrent();
  const openDoc = useStore((s) => s.openDoc);
  const scribeOpen = useStore((s) => s.scribeOpen);
  const [chosen, setChosen] = useState<string>("");
  const open = (id: string) => { openDoc(id); scribeOpen(id); };

  // patients with at least one document Scribe can fill
  const withScribe = clinic.consumers.filter((c) => c.docs.some((d) => clinic.scribe.some((s) => s.docId === d)));
  const patientId = consumer && withScribe.some((c) => c.id === consumer.id) && docId ? consumer.id : chosen;
  const patient = clinic.consumers.find((c) => c.id === patientId);
  const docs = patient ? patient.docs.filter((d) => clinic.scribe.some((s) => s.docId === d)) : [];
  const nameOf = (id: string) => { const seed = clinic.docs.find((d) => d.id === id); return seed ? clinic.forms[seed.kind]?.short ?? id : id; };

  return (
    <div className="pk">
      <div>
        <label className="p-lbl" htmlFor="pk-patient">Select a patient</label>
        <select id="pk-patient" className="p-input" data-testid="pick-patient" value={patientId} onChange={(e) => {
          const id = e.target.value;
          setChosen(id);
          const first = clinic.consumers.find((c) => c.id === id)?.docs.filter((d) => clinic.scribe.some((s) => s.docId === d));
          if (first && first.length === 1) open(first[0]);
        }}>
          <option value="">Choose…</option>
          {withScribe.map((c) => <option key={c.id} value={c.id}>{c.ini}, {c.age} ({c.id})</option>)}
        </select>
      </div>
      <div>
        <label className="p-lbl" htmlFor="pk-doc">Document</label>
        <select id="pk-doc" className="p-input" data-testid="pick-doc" value={docId && docs.includes(docId) ? docId : ""} disabled={!patient} onChange={(e) => e.target.value && open(e.target.value)}>
          <option value="">{patient ? "Choose…" : "Choose a patient first"}</option>
          {docs.map((d) => <option key={d} value={d}>{nameOf(d)}</option>)}
        </select>
      </div>
    </div>
  );
}
