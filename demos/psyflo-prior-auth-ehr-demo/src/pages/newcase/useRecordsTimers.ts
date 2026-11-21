/* The simulated wait on Clinical documentation: Reader reading a file. (Verify's wait is on Eligibility & Benefits, see useVerifyRun.) */
import { useEffect, useRef } from "react";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";

const READ_MS = 1000;
const STAGGER_MS = 150;

/** A file Reader was just given counts as "reading" for about a second, then its checks are settled. It runs on every step, so a file dropped on Intake is read even if the person moves on. */
export function useReading(draft: CaseDraft | undefined): void {
  const finish = useStore((s) => s.finishCaseDoc);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const waiting = draft ? draft.documents.filter((x) => x.status === "validating") : [];
  const key = waiting.map((x) => `${x.slot}:${x.file.id}`).join("|");

  useEffect(() => {
    waiting.forEach((x, i) => {
      const k = `${x.slot}:${x.file.id}`;
      if (timers.current.has(k)) return;
      timers.current.set(
        k,
        setTimeout(() => {
          timers.current.delete(k);
          if (draft) finish(draft.id, x.slot);
        }, READ_MS + i * STAGGER_MS),
      );
    });
    // `key` stands for the whole list of waiting files.
  }, [key, draft?.id, finish]);
  useEffect(() => {
    const all = timers.current;
    return () => {
      all.forEach(clearTimeout);
      all.clear();
    };
  }, []);
}
