import { useEffect, useEffectEvent, useState } from "react";
import { Check } from "lucide-react";
import { AgentChip, Card, CardBody, CardHeader, Spinner, type DemoFile } from "@/components/ui";
import { plural } from "@/lib/format";
import { cn } from "@/lib/cn";

const STEPS = ["Reader is scanning the documents", "Checking the program's requirements", "Verifying required components", "Confirming the data is complete"];
const STEP_MS = 1000;

/** Reader reads what was dropped, one short step at a time. Calls `onDone` after the last step. */
export function ReferralReading({ files, onDone }: { files: DemoFile[]; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const finish = useEffectEvent(onDone);
  useEffect(() => {
    const t = setTimeout(() => (step < STEPS.length - 1 ? setStep(step + 1) : finish()), STEP_MS);
    return () => clearTimeout(t);
  }, [step]);

  const names = files.slice(0, 3).map((f) => f.name).join(", ");
  return (
    <Card>
      <CardHeader title={`Reader is reading ${plural(files.length, "document")}`} subtitle={`${names}${files.length > 3 ? ` and ${files.length - 3} more` : ""}`} right={<AgentChip agent="reader" />} />
      <CardBody>
        <ul className="flex flex-col gap-3.5" aria-live="polite">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-3", i > step && "text-faint")}>
              {i < step ? <span className="grid h-5 w-5 place-items-center rounded-full bg-good-bg text-good"><Check size={13} className="ico" /></span> : i === step ? <Spinner size={20} /> : <span className="h-5 w-5 rounded-full border-[1.5px] border-[#D9D0C3]" />}
              <span className={cn(i === step && "font-semibold")}>{s}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
