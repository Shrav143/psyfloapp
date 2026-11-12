import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { AgentChip, Banner, Button, Card, CardBody, CardHeader, Spinner } from "@/components/ui";
import { paths } from "@/routes";
import { useStore } from "@/store";

const STEPS = ["Reading the source", "Finding the fields", "Linking each value to where it came from", "Checking for duplicates and risk language"];

/** The simulated extraction: four short steps, then the review. A paused Referral Agent (Settings) reads nothing, and the screen says so. */
export function Extracting({ label, onDone, onCancel }: { label: string; onDone: () => void; onCancel: () => void }) {
  const paused = useStore((s) => s.agentPaused.reader);
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (paused) return;
    if (done >= STEPS.length) {
      const t = window.setTimeout(onDone, 250);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setDone((d) => d + 1), 650);
    return () => window.clearTimeout(t);
  }, [done, paused, onDone]);
  return (
    <Card data-extracting>
      <CardHeader title="Reading the referral" subtitle={label} right={<AgentChip agent="reader" />} />
      <CardBody className="flex flex-col gap-3">
        {paused ? (
          <Banner tone="mid" title="Reader is paused in Settings" action={<Link to={paths.settings()} className="text-[13px] font-semibold underline">Open Settings</Link>}>
            Nothing is read until you resume it. The draft waits here.
          </Banner>
        ) : null}
        <ol className="flex flex-col gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2.5 text-[14px]">
              {i < done ? <Check size={16} className="ico text-good" aria-label="Done" /> : i === done && !paused ? <Spinner size={16} /> : <span className="h-4 w-4 rounded-full border border-line" aria-hidden="true" />}
              <span className={i > done ? "text-muted" : undefined}>{s}</span>
            </li>
          ))}
        </ol>
        <p className="text-[12px] text-muted">Simulated. Nothing is saved to the queue until you save or decide.</p>
        <div><Button size="sm" onClick={onCancel}>Cancel</Button></div>
      </CardBody>
    </Card>
  );
}
