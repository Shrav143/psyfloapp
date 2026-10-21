/* The two simulated waits on the Medical records step: Reader reading a file, and Verify checking coverage. */
import { useEffect, useRef } from "react";
import type { CaseDraft } from "@/data/cases";
import { verdictOf } from "@/data/eligibility";
import { useStore } from "@/store";
import { coverageFor, coverageKey } from "./intakeRules";

const READ_MS = 1000;
const STAGGER_MS = 150;
const CHECK_MS = 1200;

/** A file Reader was just given counts as "reading" for about a second, then its checks are settled. */
export function useReading(draft: CaseDraft): void {
  const finish = useStore((s) => s.finishCaseDoc);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const waiting = draft.documents.filter((x) => x.status === "validating");
  const key = waiting.map((x) => `${x.slot}:${x.file.id}`).join("|");

  useEffect(() => {
    waiting.forEach((x, i) => {
      const k = `${x.slot}:${x.file.id}`;
      if (timers.current.has(k)) return;
      timers.current.set(
        k,
        setTimeout(() => {
          timers.current.delete(k);
          finish(draft.id, x.slot);
        }, READ_MS + i * STAGGER_MS),
      );
    });
    // `key` stands for the whole list of waiting files.
  }, [key, draft.id, finish]);
  useEffect(() => {
    const all = timers.current;
    return () => {
      all.forEach(clearTimeout);
      all.clear();
    };
  }, []);
}

/** Verify checks coverage as soon as the payer, level of care and member ID are known, and again when they change. */
export function useCoverageCheck(draft: CaseDraft, clock: number): void {
  const setCoverage = useStore((s) => s.setCaseCoverage);
  const key = coverageKey(draft);
  const pending = key !== null && draft.coverage?.key !== key;
  useEffect(() => {
    if (!key || !pending) return;
    const t = setTimeout(() => {
      const p = coverageFor(draft, clock);
      if (p) setCoverage(draft.id, { key, verdict: verdictOf(p), at: clock });
    }, CHECK_MS);
    return () => clearTimeout(t);
    // Keyed on what the person typed: re-running on every other change of the draft would restart the wait.
  }, [key, pending]);
}
