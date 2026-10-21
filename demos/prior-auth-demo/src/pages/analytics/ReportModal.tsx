import { useEffect, useState } from "react";
import { Check, FileDown, FileSpreadsheet } from "lucide-react";
import { AgentChip, Button, Modal, Spinner } from "@/components/ui";
import { blockedInHosted } from "@/lib/hosted";
import { useStore } from "@/store";
import type { View } from "./model";
import { downloadFile, reportCsv, reportMarkdown } from "./report";

const STEP_MS = 750;

/** Analyst "builds" the monthly report in four short steps, then offers the real files. */
export function ReportModal({ view, onClose }: { view: View; onClose: () => void }) {
  const steps = [`Collecting the decisions for ${view.period.phrase}`, "Dropping any figure with fewer than 20 decisions", "Writing the summary", "Laying out the report"];
  const [done, setDone] = useState(0);
  const finished = done >= steps.length;

  useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => setDone((d) => d + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [done, finished]);

  const base = `psyflo-monthly-report-${view.period.id}-${view.payer}`;
  const save = (kind: "md" | "csv") => {
    if (blockedInHosted("Download")) return;
    if (kind === "md") downloadFile(`${base}.md`, "text/markdown;charset=utf-8", reportMarkdown(view, view.period.prev));
    else downloadFile(`${base}.csv`, "text/csv;charset=utf-8", reportCsv(view));
    useStore.getState().toast({ title: "Report downloaded", body: `${base}.${kind} has the figures you see on this page.`, tone: "good" });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Monthly report"
      subtitle={`${view.period.label} · ${view.scope}`}
      footer={<Button onClick={onClose}>{finished ? "Done" : "Cancel"}</Button>}
    >
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        Built by <AgentChip agent="analyst" />
      </div>
      <ol className="flex flex-col gap-3" aria-label="Report steps">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span className="grid h-6 w-6 place-items-center">
              {i < done ? <Check size={18} className="ico text-good" aria-label="Done" /> : i === done ? <Spinner /> : <span className="h-2 w-2 rounded-full bg-[#D9D0C3]" />}
            </span>
            <span className={i > done ? "text-muted" : undefined}>{s}</span>
          </li>
        ))}
      </ol>
      {finished ? (
        <div className="psy-fade-up mt-5 rounded-2xl border border-good-edge bg-good-bg px-4 py-3.5">
          <div className="font-semibold text-good-ink">Your report is ready</div>
          <p className="mt-0.5 text-[13.5px] text-good-ink">It uses the same figures as this page. Pick the file you want.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon={FileDown} onClick={() => save("md")}>
              Download report
            </Button>
            <Button icon={FileSpreadsheet} onClick={() => save("csv")}>
              Download data (CSV)
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
