import { useState } from "react";
import { Button, Field, FileDrop, FileRow, Modal, Segmented, TextInput, type DemoFile } from "@/components/ui";
import type { AssessmentPlan, ModuleId } from "@/data/assess/types";
import type { IntakeDocument, IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { moduleOptions } from "./moduleOptions";
import { TYPE_LABEL } from "./model";
import { DOC_SAMPLES, unreadPages } from "./samples";

type Source = "sample" | "file";
type Use = "record" | "authorization";
const KINDS = Object.keys(TYPE_LABEL) as IntakeDocument["kind"][];

/** Adds a document to the intake: one of the synthetic samples, or a dropped file the demo does not read (it records the name and type and says so). */
export function AddDocumentDialog({ record, plan, onClose, onAdded }: { record: IntakeRecord; plan: AssessmentPlan | null; onClose: () => void; onAdded: () => void }) {
  const [source, setSource] = useState<Source>("sample");
  const [sampleId, setSampleId] = useState(DOC_SAMPLES[0].id);
  const [file, setFile] = useState<DemoFile | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<IntakeDocument["kind"]>(DOC_SAMPLES[0].kind);
  const [use, setUse] = useState<Use>("record");
  const [mod, setMod] = useState<ModuleId | "">(DOC_SAMPLES[0].module ?? "");
  const modules = moduleOptions(record, plan);
  const sample = DOC_SAMPLES.find((s) => s.id === sampleId) ?? DOC_SAMPLES[0];
  const shownName = name || (source === "file" ? file?.name ?? "" : sample.label);
  const ready = source === "sample" || !!file;

  const pickSample = (id: string) => {
    const s = DOC_SAMPLES.find((x) => x.id === id);
    if (!s) return;
    setSampleId(id);
    setKind(s.kind);
    setMod(s.module ?? "");
    setName("");
  };
  const submit = () => {
    const st = useStore.getState();
    const id = `doc-${record.id}-${Date.now().toString(36)}`;
    const doc: IntakeDocument = {
      id, name: shownName, kind, receivedAt: st.clock, simulated: true,
      pages: source === "sample" ? [sample.blocks(record)] : unreadPages(file?.name ?? shownName),
      origin: use === "authorization" ? "authorization" : "uploaded", moduleId: mod || undefined, attach: use === "authorization" ? true : undefined,
    };
    st.addIntakeDocument(record.id, doc, source === "sample" ? "Synthetic sample (simulated import)" : "The file was not read; only its name and type are recorded (simulated)");
    st.toast({ title: `Added: ${doc.name}`, body: use === "authorization" ? "It will go with the authorization." : "It is on the intake record.", tone: "good" });
    onAdded();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Add a document" subtitle={`${record.id} · simulated import, nothing is read from your computer`} size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!ready || !shownName.trim()} onClick={submit}>Add document</Button></>}>
      <div className="flex flex-col gap-4">
        <Segmented<Source> items={[{ id: "sample", label: "Sample document" }, { id: "file", label: "My file" }]} value={source} onChange={setSource} />
        {source === "sample" ? (
          <div role="radiogroup" aria-label="Sample document" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DOC_SAMPLES.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={s.id === sampleId} onClick={() => pickSample(s.id)} className={`rounded-xl border px-3 py-2.5 text-left ${s.id === sampleId ? "border-forest bg-sage-bg" : "border-edge bg-white hover:bg-tile"}`}>
                <span className="block text-[14px] font-medium">{s.label}</span>
                <span className="block text-[12px] text-muted">{s.summary}</span>
              </button>
            ))}
          </div>
        ) : file ? (
          <FileRow file={file} status="warn" onRemove={() => { setFile(null); setName(""); }} />
        ) : (
          <FileDrop onFiles={(f) => { setFile(f[0] ?? null); setName(f[0]?.name ?? ""); }} hint="Drop a file, or click to choose one" />
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name"><TextInput value={shownName} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Type">
            <select aria-label="Document type" value={kind} onChange={(e) => setKind(e.target.value as IntakeDocument["kind"])} className="h-[38px] w-full rounded-xl border border-field bg-white px-3 text-sm focus:border-forest focus:outline-none">
              {KINDS.map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
            </select>
          </Field>
          <Field label="Supports this module">
            <select aria-label="Module this document supports" value={mod} onChange={(e) => setMod(e.target.value as ModuleId | "")} className="h-[38px] w-full rounded-xl border border-field bg-white px-3 text-sm focus:border-forest focus:outline-none">
              <option value="">Not linked</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Used for">
            <Segmented<Use> items={[{ id: "record", label: "Intake record" }, { id: "authorization", label: "Authorization attachment" }]} value={use} onChange={setUse} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
