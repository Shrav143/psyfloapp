import { useState } from "react";
import { useCurrent } from "@/hooks";
import { useStore } from "@/store";
import type { DocKind } from "@/types";

const ORDER: DocKind[] = ["dpn", "admission", "intake", "assessment", "sra"];

/**
 * Who it is for and which document. Every patient on the roster, every kind of document the clinic uses.
 * A patient's existing document opens as it is; a kind they do not have yet opens as a new blank one in Lauris.
 * Choosing always opens the document in Lauris, so the panel and the EHR never disagree.
 */
export default function Picker({ then = "scribe" }: { then?: "scribe" | "scan" }) {
  const { clinic, docId, consumer } = useCurrent();
  const openDoc = useStore((s) => s.openDoc);
  const scribeOpen = useStore((s) => s.scribeOpen);
  const newDoc = useStore((s) => s.newDoc);
  const [chosen, setChosen] = useState<string>("");

  const patientId = docId && consumer ? consumer.id : chosen;
  const patient = clinic.consumers.find((c) => c.id === patientId);
  const kinds = ORDER.filter((k) => clinic.forms[k]);
  const existing = (k: DocKind) => patient?.docs.find((d) => clinic.docs.find((x) => x.id === d)?.kind === k);
  const curKind = docId && consumer?.id === patientId ? clinic.docs.find((d) => d.id === docId)?.kind ?? "" : "";

  return (
    <div className="pk">
      <div>
        <label className="p-lbl" htmlFor="pk-patient">Select a patient</label>
        <select id="pk-patient" className="p-input" data-testid="pick-patient" value={patientId} onChange={(e) => setChosen(e.target.value)}>
          <option value="">Choose…</option>
          {clinic.consumers.map((c) => <option key={c.id} value={c.id}>{c.ini}, {c.age} ({c.id})</option>)}
        </select>
      </div>
      <div>
        <label className="p-lbl" htmlFor="pk-doc">Document</label>
        <select id="pk-doc" className="p-input" data-testid="pick-doc" value={curKind} disabled={!patient} onChange={(e) => {
          const kind = e.target.value as DocKind;
          if (!kind || !patient) return;
          const id = existing(kind) ?? newDoc(patient.id, kind);
          if (!id) return;
          openDoc(id);
          if (then === "scribe") scribeOpen(id);
        }}>
          <option value="">{patient ? "Choose…" : "Choose a patient first"}</option>
          {kinds.map((k) => <option key={k} value={k}>{clinic.forms[k]?.short ?? k}{patient && !existing(k) ? " (new)" : ""}</option>)}
        </select>
      </div>
    </div>
  );
}
