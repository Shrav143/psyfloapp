import { RotateCcw } from "lucide-react";
import { AgentChip, Button, Spinner } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { readAgainFor, readReferralDocument } from "./agent";

/** While Reader reads a document the section says so; when it was paused or failed, the person can read it again. */
export function ReaderStatus({ record }: { record: IntakeRecord }) {
  const update = useStore((s) => s.updateIntakeTask);
  const tasks = record.tasks.filter((t) => t.role === "referral" && t.source && (t.status === "queued" || t.status === "running" || t.status === "blocked" || t.status === "error"));
  if (!tasks.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {tasks.map((t) => {
        const busy = t.status === "queued" || t.status === "running";
        const again = busy ? null : readAgainFor(record, t.source ?? "");
        return (
          <div key={t.id} data-reader={t.status} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-tile px-3.5 py-2.5 text-[13px]">
            <AgentChip agent="reader" />
            {busy ? <Spinner size={15} /> : null}
            <span className="min-w-0 flex-1">
              {busy ? `Reading ${t.source}. Suggestions appear below for review.` : t.status === "blocked" ? `${t.result ?? "Reader is paused."}` : `Could not read ${t.source}: ${t.error ?? "error"}`}
            </span>
            {again ? (
              <Button
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  update(record.id, t.id, { status: "cancelled", result: "Replaced by a new read" });
                  readReferralDocument(record.id, again.doc, again.extract, again.safety);
                }}
              >
                Read again
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
