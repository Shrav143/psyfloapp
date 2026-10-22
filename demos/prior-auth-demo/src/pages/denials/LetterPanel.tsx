import type { RefObject } from "react";
import { ArrowLeft, CheckCircle2, ScanText } from "lucide-react";
import { AgentBadge, Button, Drawer, FileDrop, FileRow, Spinner, TextInput } from "@/components/ui";
import { LETTER_STEPS, type Letter } from "./lib/useLetter";
import { useDialogFocus } from "./lib/useDialogFocus";

function Form({ letter, from }: { letter: Letter; from: RefObject<HTMLElement | null> }) {
  const ref = useDialogFocus(from, ["[data-letter-first]", "[aria-label=\"Note about the denial\"]"]);
  const { step, chosenName, file, sample } = letter;
  return (
    <div ref={ref} tabIndex={-1} className="flex flex-col gap-3.5 outline-none">
      {step !== null ? (
        <ol className="flex flex-col gap-3" aria-label="Analysis progress">
          {LETTER_STEPS.map((s, i) => (
            <li key={s.agent} className="flex items-center gap-3">
              <AgentBadge agent={s.agent} size={32} />
              <span className={i > step ? "flex-1 text-muted" : "flex-1"}>{s.text}</span>
              {i < step ? <CheckCircle2 size={18} className="ico text-good" aria-label="Done" /> : i === step ? <Spinner /> : null}
            </li>
          ))}
        </ol>
      ) : (
        <>
          <p className="text-[13.5px] text-muted">The agents read it, check it against the chart and past appeals, and lay out your options. The new denial belongs to the site you are viewing.</p>
          {chosenName ? (
            <FileRow file={file ?? { id: "sample", name: sample?.file ?? "", sizeKb: 184 }} onRemove={letter.clear} />
          ) : (
            <FileDrop hint="Drop the denial letter here, or click to choose a PDF or DOCX" onFiles={(f) => letter.chooseFile(f[0])} />
          )}
          <div className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
            <span>Identifiers are removed on upload.</span>
            {!chosenName ? <Button size="sm" variant="ghost" data-letter-first onClick={letter.pickSample}>Use sample letter</Button> : null}
          </div>
          <TextInput value={letter.note} onChange={(e) => letter.setNote(e.target.value)} placeholder="Add anything not in the letter, such as a payer call note" aria-label="Note about the denial" />
          <Button variant="primary" icon={ScanText} onClick={() => void letter.analyze()}>Analyze the denial</Button>
          {letter.missing ? <p role="alert" className="text-[13px] text-risk">Add the letter first, or use the sample letter.</p> : null}
        </>
      )}
    </div>
  );
}

/** "Add a denial letter" in a right-hand panel: the drop area, an optional note and Analyze. Closing the panel while the agents work does not stop them; the new denial is selected when they finish. */
export function LetterPanel({ letter, from, onClose, onBack }: { letter: Letter; from: RefObject<HTMLElement | null>; onClose: () => void; onBack?: () => void }) {
  return (
    <Drawer
      open
      onClose={onClose}
      width={540}
      title="Add a denial letter"
      subtitle="Drop a letter or use a sample"
      footer={onBack ? <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>Back to open denials</Button> : undefined}
    >
      <Form letter={letter} from={from} />
    </Drawer>
  );
}
