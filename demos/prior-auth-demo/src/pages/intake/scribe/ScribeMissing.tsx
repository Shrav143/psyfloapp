import { Check, X } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { followUpFor } from "@/data/intake/scripts";
import type { IntakeRecord, ScribeSession } from "@/data/intake/types";
import { useStore } from "@/store";
import { detectedTopics } from "./engine";

/** What the conversation has not covered yet, and the follow-up the scribe suggests for each item. The clinician adds a follow-up to the plan or dismisses it. */
export function ScribeMissing({ record, session, canDecide }: { record: IntakeRecord; session: ScribeSession; canDecide: boolean }) {
  const decide = useStore((s) => s.scribeDecideFollowUp);
  const missing = session.missing ?? [];
  const topics = detectedTopics(record, session);
  return (
    <div className="space-y-4">
      {topics.length ? (
        <div>
          <h4 className="text-[13px] font-semibold text-ink2">Topics for this interview</h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Topics for this interview">
            {topics.map((t) => <li key={t.label}><Pill tone={t.covered ? "good" : "neutral"}>{t.label}{t.covered ? "" : ": not yet"}</Pill></li>)}
          </ul>
        </div>
      ) : null}
      {missing.length ? (
        <ul className="space-y-2">
          {missing.map((m) => {
            const d = session.followUps?.[m];
            return (
              <li key={m} data-missing={m} className="rounded-xl border border-line px-3 py-2.5">
                <div className="flex items-start gap-2 text-[14px]">
                  <Pill tone="mid">Missing</Pill>
                  <span className="min-w-0 flex-1">{m}</span>
                  {d ? <Pill tone={d === "accepted" ? "good" : "neutral"}>{d === "accepted" ? "Added to the plan" : "Dismissed"}</Pill> : null}
                </div>
                <p className="mt-1 text-[13px] text-ink2">Suggested follow-up: {followUpFor(m)}</p>
                {canDecide && !d ? (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" icon={Check} aria-label={`Add the follow-up for ${m} to the plan`} onClick={() => decide(record.id, m, "accepted")}>Add to the plan</Button>
                    <Button size="sm" icon={X} aria-label={`Dismiss the follow-up for ${m}`} onClick={() => decide(record.id, m, "dismissed")}>Dismiss</Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-[13px] text-muted">Nothing missing so far.</p>
      )}
    </div>
  );
}
