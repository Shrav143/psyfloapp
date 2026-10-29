import { useState } from "react";
import type { ImportResult } from "@/components/import";
import type { DemoFile } from "@/components/ui";
import { SAMPLE_LETTERS, type DenialMeta, type DenialType, type SampleLetter } from "@/data/denials";
import { PAYERS } from "@/data/seed";
import type { AgentKey } from "@/data/types";
import { sleep } from "@/lib/format";
import type { NewDenialInput } from "@/store/denials";
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
  /** What was read from a pasted screenshot or an imported file, once the person chose Apply. */
  imported: ImportResult | null;
  note: string;
  /** The person pressed Analyze with no letter chosen. */
  missing: boolean;
  /** The agent step now running, or null when nothing is running. */
  step: number | null;
  chosenName: string | undefined;
  setNote: (v: string) => void;
  chooseFile: (f: DemoFile) => void;
  pickSample: () => void;
  fromImport: (r: ImportResult) => void;
  clear: () => void;
  analyze: () => Promise<void>;
}

/** The kind of denial a letter's stated reason describes, or undefined when the words do not say. */
function typeFromReason(reason: string | undefined): DenialType | undefined {
  if (!reason) return undefined;
  if (/retro/i.test(reason)) return "Retro-authorization denied";
  if (/late|window|timely/i.test(reason)) return "Late notice";
  if (/level of care|lower level|step.?down to/i.test(reason)) return "Level-of-care downgrade";
  if (/unit/i.test(reason)) return "Units cut";
  if (/partial|days|continued.?stay/i.test(reason)) return "Partial approval";
  if (/missing|incomplete|not medically necessary|documentation/i.test(reason)) return "Full denial";
  return undefined;
}

/** The new denial from a letter: a sample's numbers, with whatever the import read from the letter put over them. */
function inputFor(base: SampleLetter, imported: ImportResult | null, letterName: string, note: string): NewDenialInput {
  const field = (k: string) => imported?.fields.find((f) => f.key === k)?.value?.trim() || undefined;
  const payerId = PAYERS.find((p) => p.id === field("payerId"))?.id ?? base.payerId;
  const type = typeFromReason(field("reason")) ?? base.meta.type;
  const req = Number(field("unitsRequested"));
  const got = Number(field("unitsApproved"));
  const counts = Number.isFinite(req) && Number.isFinite(got) && req > 0 && got < req;
  const meta: DenialMeta = { ...base.meta, type, summary: type === "Units cut" && counts ? `Units cut ${req} to ${got}` : type, letterName, note: note.trim() || undefined };
  if (counts && type === "Units cut") Object.assign(meta, { unitsRequested: req, unitsApproved: got, daysRequested: undefined, daysApproved: undefined });
  if (counts && type === "Partial approval") Object.assign(meta, { daysRequested: req, daysApproved: got, unitsRequested: undefined, unitsApproved: undefined });
  return { initials: base.initials, age: base.age, payerId, program: base.program, chance: base.chance, windowMin: base.windowMin, meta };
}

/** The state of "Add a denial letter", kept by the page so that closing the panel does not stop an analysis that is running.
    The four agents work for about five seconds, then the new denial is added (to the site in view) and `onAdded` gets its id. Leaving the page stops it. */
export function useLetter(onAdded: (id: string) => void): Letter {
  const alive = useAlive();
  const added = useStore((s) => Object.values(s.denialMeta).filter((m) => m.letterName).length);
  const [file, setFile] = useState<DemoFile | null>(null);
  const [sample, setSample] = useState<SampleLetter | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const chosenName = file?.name ?? sample?.file ?? imported?.sourceLabel;

  const analyze = async () => {
    if (!chosenName) {
      setMissing(true);
      return;
    }
    const base = sample ?? SAMPLE_LETTERS[(file?.name.length ?? added) % SAMPLE_LETTERS.length];
    for (let i = 0; i < LETTER_STEPS.length; i += 1) {
      setStep(i);
      await sleep(STEP_MS);
      if (!alive.current) return;
    }
    const id = useStore.getState().addDenial(inputFor(base, imported, chosenName, note));
    setStep(null);
    setFile(null);
    setSample(null);
    setImported(null);
    setNote("");
    onAdded(id);
  };

  return {
    file,
    sample,
    imported,
    note,
    missing,
    step,
    chosenName,
    setNote,
    chooseFile: (f) => { setFile(f); setSample(null); setImported(null); setMissing(false); },
    pickSample: () => { setSample(SAMPLE_LETTERS[added % SAMPLE_LETTERS.length]); setFile(null); setImported(null); setMissing(false); },
    fromImport: (r) => { setImported(r); setFile(null); setSample(null); setMissing(false); },
    clear: () => { setFile(null); setSample(null); setImported(null); },
    analyze,
  };
}
