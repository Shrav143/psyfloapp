import { useState } from "react";
import type { DemoFile } from "@/components/ui";
import { SAMPLE_LETTERS, type SampleLetter } from "@/data/denials";
import type { AgentKey } from "@/data/types";
import { sleep } from "@/lib/format";
import { useStore } from "@/store";
import { useAlive } from "./useAlive";

export const LETTER_STEPS: { agent: AgentKey; text: string }[] = [
  { agent: "reader", text: "Reader is reading the letter and removing identifiers" },
  { agent: "advocate", text: "Advocate is checking the notice, the deadline and the payer's own criteria" },
  { agent: "historian", text: "Historian is comparing similar decisions and appeals" },
  { agent: "integrity", text: "Integrity is checking every statement against the chart" },
];
const STEP_MS = 1250;

export interface Letter {
  file: DemoFile | null;
  sample: SampleLetter | null;
  note: string;
  /** The person pressed Analyze with no letter chosen. */
  missing: boolean;
  /** The agent step now running, or null when nothing is running. */
  step: number | null;
  chosenName: string | undefined;
  setNote: (v: string) => void;
  chooseFile: (f: DemoFile) => void;
  pickSample: () => void;
  clear: () => void;
  analyze: () => Promise<void>;
}

/** The state of "Add a denial letter", kept by the page so that closing the panel does not stop an analysis that is running.
    The four agents work for about five seconds, then the new denial is added (to the site in view) and `onAdded` gets its id. Leaving the page stops it. */
export function useLetter(onAdded: (id: string) => void): Letter {
  const alive = useAlive();
  const added = useStore((s) => Object.values(s.denialMeta).filter((m) => m.letterName).length);
  const [file, setFile] = useState<DemoFile | null>(null);
  const [sample, setSample] = useState<SampleLetter | null>(null);
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const chosenName = file?.name ?? sample?.file;

  const analyze = async () => {
    if (!chosenName) {
      setMissing(true);
      return;
    }
    const base = sample ?? SAMPLE_LETTERS[(file?.name.length ?? 0) % SAMPLE_LETTERS.length];
    for (let i = 0; i < LETTER_STEPS.length; i += 1) {
      setStep(i);
      await sleep(STEP_MS);
      if (!alive.current) return;
    }
    const id = useStore.getState().addDenial({ initials: base.initials, age: base.age, payerId: base.payerId, program: base.program, chance: base.chance, windowMin: base.windowMin, meta: { ...base.meta, letterName: chosenName, note: note.trim() || undefined } });
    setStep(null);
    setFile(null);
    setSample(null);
    setNote("");
    onAdded(id);
  };

  return {
    file,
    sample,
    note,
    missing,
    step,
    chosenName,
    setNote,
    chooseFile: (f) => { setFile(f); setSample(null); setMissing(false); },
    pickSample: () => { setSample(SAMPLE_LETTERS[added % SAMPLE_LETTERS.length]); setFile(null); setMissing(false); },
    clear: () => { setFile(null); setSample(null); },
    analyze,
  };
}
