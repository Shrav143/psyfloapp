import { useState } from "react";
import { CheckCircle2, ScanText } from "lucide-react";
import { AgentBadge, Button, Card, CardBody, CardHeader, FileDrop, FileRow, Spinner, TextInput, type DemoFile } from "@/components/ui";
import { SAMPLE_LETTERS, type SampleLetter } from "@/data/denials";
import type { AgentKey } from "@/data/types";
import { sleep } from "@/lib/format";
import { useStore } from "@/store";
import { useAlive } from "./lib/useAlive";

const STEPS: { agent: AgentKey; text: string }[] = [
  { agent: "reader", text: "Reader is reading the letter and removing identifiers" },
  { agent: "advocate", text: "Advocate is checking the notice, the deadline and the payer's own criteria" },
  { agent: "historian", text: "Historian is comparing similar decisions and appeals" },
  { agent: "integrity", text: "Integrity is checking every statement against the chart" },
];
const STEP_MS = 1250;

/** The drop area, an optional note and Analyze. The four agents work for about five seconds, then the new denial is selected. */
export function AddLetterCard({ onAdded }: { onAdded: (id: string) => void }) {
  const alive = useAlive();
  const added = useStore((s) => Object.values(s.denialMeta).filter((m) => m.letterName).length);
  const [file, setFile] = useState<DemoFile | null>(null);
  const [sample, setSample] = useState<SampleLetter | null>(null);
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState<number | null>(null);

  const chosenName = file?.name ?? sample?.file;
  const pickSample = () => {
    setSample(SAMPLE_LETTERS[added % SAMPLE_LETTERS.length]);
    setFile(null);
    setMissing(false);
  };

  const analyze = async () => {
    if (!chosenName) {
      setMissing(true);
      return;
    }
    const base = sample ?? SAMPLE_LETTERS[(file?.name.length ?? 0) % SAMPLE_LETTERS.length];
    for (let i = 0; i < STEPS.length; i += 1) {
      setStep(i);
      await sleep(STEP_MS);
      if (!alive.current) return;
    }
    const id = useStore.getState().addDenial({ initials: base.initials, age: base.age, payerId: base.payerId, program: base.program, atStake: base.atStake, chance: base.chance, windowMin: base.windowMin, meta: { ...base.meta, letterName: chosenName, note: note.trim() || undefined } });
    setStep(null);
    setFile(null);
    setSample(null);
    setNote("");
    onAdded(id);
  };

  return (
    <Card>
      <CardHeader title="Add a denial letter" subtitle="The agents read it, check it against your chart and past appeals, and lay out your options" />
      <CardBody>
        {step !== null ? (
          <ol className="flex flex-col gap-3" aria-label="Analysis progress">
            {STEPS.map((s, i) => (
              <li key={s.agent} className="flex items-center gap-3">
                <AgentBadge agent={s.agent} size={32} />
                <span className={i > step ? "flex-1 text-muted" : "flex-1"}>{s.text}</span>
                {i < step ? <CheckCircle2 size={18} className="ico text-good" aria-label="Done" /> : i === step ? <Spinner /> : null}
              </li>
            ))}
          </ol>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2.5">
              {chosenName ? (
                <FileRow file={file ?? { id: "sample", name: sample?.file ?? "", sizeKb: 184 }} onRemove={() => { setFile(null); setSample(null); }} />
              ) : (
                <FileDrop hint="Drop the denial letter here, or click to choose a PDF or DOCX" onFiles={(f) => { setFile(f[0]); setSample(null); setMissing(false); }} />
              )}
              <div className="flex items-center gap-3 text-[13px] text-muted">
                <span>Identifiers are removed on upload.</span>
                {!chosenName ? <Button size="sm" variant="ghost" onClick={pickSample}>Use sample letter</Button> : null}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add anything not in the letter, such as a payer call note" aria-label="Note about the denial" />
              <Button variant="primary" icon={ScanText} onClick={analyze}>Analyze the denial</Button>
              {missing ? <p role="alert" className="text-[13px] text-risk">Add the letter first, or use the sample letter.</p> : null}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
