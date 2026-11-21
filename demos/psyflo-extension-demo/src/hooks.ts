import { useStore } from "./store";
import type { Finding, FindingStatus, ScribeScenario } from "./types";

/** What the person is looking at in the EHR, resolved once so every view reads the same thing. */
export function useCurrent() {
  const clinic = useStore((s) => s.clinic);
  const page = useStore((s) => s.page);
  const docs = useStore((s) => s.docs);
  const scans = useStore((s) => s.scans);
  const docId = page.kind === "form" ? page.docId : null;
  const seed = docId ? clinic.docs.find((d) => d.id === docId) : undefined;
  const spec = seed ? clinic.forms[seed.kind] : undefined;
  const consumerId = page.kind === "consumer" ? page.consumerId : seed?.consumerId ?? null;
  const consumer = consumerId ? clinic.consumers.find((c) => c.id === consumerId) : undefined;
  return { clinic, page, docId, seed, spec, consumer, doc: docId ? docs[docId] : undefined, scan: docId ? scans[docId] : undefined };
}

export const scenarioOf = (scribe: ScribeScenario[], docId: string | null): ScribeScenario | undefined => scribe.find((s) => s.docId === docId);

export function tally(findings: Finding[], status: Record<string, FindingStatus>) {
  const open = findings.filter((f) => status[f.id] === "open");
  return {
    open: open.length,
    severe: open.filter((f) => f.severity === "severe").length,
    medium: open.filter((f) => f.severity === "medium").length,
    low: open.filter((f) => f.severity === "low").length,
    added: findings.filter((f) => status[f.id] === "added").length,
    dismissed: findings.filter((f) => status[f.id] === "dismissed").length,
  };
}
