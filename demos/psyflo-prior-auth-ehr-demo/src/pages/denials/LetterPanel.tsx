import type { RefObject } from "react";
import { CheckCircle2, ScanText, ShieldCheck } from "lucide-react";
import { ImportSources } from "@/components/import";
import { AgentBadge, Button, Drawer, FileDrop, FileRow, Pill, Spinner, TextInput } from "@/components/ui";
import { LETTER_STEPS, type Letter } from "./lib/useLetter";
import { useDialogFocus } from "./lib/useDialogFocus";

function Form({ letter, from }: { letter: Letter; from: RefObject<HTMLElement | null> }) {
  const ref = useDialogFocus(from, ["[data-letter-first]", "[aria-label=\"Note about the denial\"]"]);
  const { step, chosenName, file, imported } = letter;
  return (
    <div ref={ref} tabIndex={-1} className="flex flex-col gap-3.5 outline-none">
      {step !== null ? (
        <ol className="flex flex-col gap-3" aria-label="Analysis progress">
          {LETTER_STEPS.map((s, i) => (
            <li key={s.agent} className="flex items-center gap-3">
              <AgentBadge agent={s.agent} size={28} />
              <span className={i > step ? "flex-1 text-muted" : "flex-1"}>{s.text}</span>
              {i < step ? <CheckCircle2 size={18} className="ico text-good" aria-label="Done" /> : i === step ? <Spinner /> : null}
            </li>
          ))}
        </ol>
      ) : (
        <>
          {chosenName ? (
            <FileRow file={file ?? { id: "letter", name: chosenName, sizeKb: imported ? 96 : 184 }} onRemove={letter.clear} />
          ) : (
            <>
              <FileDrop hint="Drop the denial letter, or click to choose a PDF or DOCX" onFiles={(f) => letter.chooseFile(f[0])} />
              <ImportSources target="denial_letter" compact onImport={letter.fromImport} />
            </>
          )}
          {imported ? (
            <ul aria-label="Read from the letter" className="flex flex-wrap gap-1.5">
              {imported.fields.map((f) => <li key={f.key}><Pill tone={f.confidence === "check" ? "mid" : "neutral"}>{f.label}: {f.display ?? f.value}</Pill></li>)}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral"><ShieldCheck size={12} className="ico" aria-hidden="true" />Identifiers removed on upload</Pill>
            {!chosenName ? <Button size="sm" variant="ghost" data-letter-first onClick={letter.pickSample}>Use sample letter</Button> : null}
          </div>
          <TextInput value={letter.note} onChange={(e) => letter.setNote(e.target.value)} placeholder="Note, such as a payer call" aria-label="Note about the denial" />
          <Button variant="primary" icon={ScanText} onClick={() => void letter.analyze()}>Analyze the denial</Button>
          {letter.missing ? <p role="alert" className="text-[13px] text-risk">Add the letter first, or use the sample letter.</p> : null}
        </>
      )}
    </div>
  );
}

/** "Add a denial letter" in a right-hand panel: drop a letter, import a file or paste a screenshot of it, or use a sample; an optional note; Analyze.
    Closing the panel while the agents work does not stop them; the new denial is listed first when they finish. */
export function LetterPanel({ letter, from, onClose }: { letter: Letter; from: RefObject<HTMLElement | null>; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} width={540} title="Add a denial letter">
      <Form letter={letter} from={from} />
    </Drawer>
  );
}
