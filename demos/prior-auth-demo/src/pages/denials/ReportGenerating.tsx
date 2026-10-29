import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AgentBadge, Card, CardBody, CardHeader, Spinner } from "@/components/ui";
import type { AgentKey } from "@/data/types";
import { REPORT_STEP_MS } from "./lib/report";
import type { DenialView } from "./lib/useDenialView";

const reduced = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The three agents "put the report together" for about two and a half seconds, then `onDone` shows it. Mounted only while the report is not yet generated. */
export function ReportGenerating({ view, onDone }: { view: DenialView; onDone: () => void }) {
  const { analysis: a } = view;
  const steps: { agent: AgentKey; text: string }[] = [
    { agent: "reader", text: "Reader is reading the letter and the chart, and removing identifiers" },
    { agent: "advocate", text: `Advocate is checking the notice, the deadline and how ${a.ctx.payer} applied its own criteria` },
    { agent: "historian", text: `Historian is comparing ${a.similar} similar ${a.ctx.payer} decisions and appeals` },
  ];
  const [done, setDone] = useState(0);
  const finish = useRef(onDone);
  finish.current = onDone;
  const wait = reduced() ? 300 : REPORT_STEP_MS;

  useEffect(() => {
    const t = setTimeout(() => (done >= steps.length ? finish.current() : setDone(done + 1)), done >= steps.length ? 200 : wait);
    return () => clearTimeout(t);
  }, [done, steps.length, wait]);

  return (
    <Card className="mx-auto w-full max-w-[860px]">
      <CardHeader title="Generating appeal analysis" subtitle={`${view.req.id} · ${a.ctx.who} · ${a.ctx.payerName}. A clinician reviews the report before anything is sent.`} />
      <CardBody>
        <ol className="flex flex-col gap-3.5" role="status" aria-live="polite" aria-label="Report progress">
          {steps.map((s, i) => (
            <li key={s.agent} className="flex items-center gap-3">
              <AgentBadge agent={s.agent} size={32} />
              <span className={i > done ? "flex-1 text-muted" : "flex-1"}>{s.text}</span>
              {i < done ? <CheckCircle2 size={18} className="ico text-good" aria-label="Done" /> : i === done ? <Spinner /> : null}
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
