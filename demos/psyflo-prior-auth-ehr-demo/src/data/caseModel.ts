import type { CaseDetail, Criterion, Evidence, FocusId, OpenItem, Rec } from "./caseDetail";
import { payerById } from "./seed";
import type { AgentKey, PsyRequest, StageKey, Tone } from "./types";

/* Pure functions that turn a case's detail plus the user's work on it into what the screens show.
   Nothing here touches the store, so the same numbers appear on every tab and in the queue. */

export interface RunState { token: string; recIds: string[]; stage: number; sub: number }
/** `actor` is who did it: the signed-in person or a named agent. It labels the line in History. */
export interface LogEntry { at: number; actor: AgentKey | "you"; text: string }
export interface DraftEdit { text: string; includes: string[] } // includes = recommendations already folded into the edited text
export interface VersionEntry { n: number; at: number; by: string; note: string; text: string }

export interface CaseWork {
  excluded: string[]; // recommendations the user unchecked
  inputs: Record<string, string>; // answers typed into "Needs your input" cards
  notes: Record<string, string>;
  applied: string[];
  dismissed: { id: string; reason: string; at: number }[];
  run: RunState | null;
  edits: Record<string, DraftEdit>;
  dirty: boolean; // the draft was edited and Integrity has not read it again
  context: string[]; // the clinical context added on this page (the same notes are in the shared list the draft reads)
  focus: FocusId | null; // what "Refine recommendations" put first
  versions: VersionEntry[];
  log: LogEntry[];
  chance?: number; // set when actions are applied, so the queue can show it
  liftLeft?: number;
  ready?: boolean; // every check passed after the last apply
}
export const EMPTY_WORK: CaseWork = { excluded: [], inputs: {}, notes: {}, applied: [], dismissed: [], run: null, edits: {}, dirty: false, context: [], focus: null, versions: [], log: [] };

/** Steps of the simulated run: [ms from start, agent stage, line]. The run ends at RUN_END. About 8 seconds in all. */
export const RUN_STEPS: [number, number, number][] = [[1200, 0, 1], [2400, 0, 2], [3400, 1, 0], [4600, 1, 1], [5800, 2, 0], [7000, 2, 1]];
export const RUN_END = 8200;

export const gainOf = (r: Rec): number => Object.values(r.moves).reduce((a, b) => a + b, 0);
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export interface RecGroups { open: Rec[]; applied: Rec[]; dismissed: { rec: Rec; reason: string }[] }
export function groupRecs(d: CaseDetail, w: CaseWork): RecGroups {
  const dismissed = d.recs.filter((r) => w.dismissed.some((x) => x.id === r.id)).map((rec) => ({ rec, reason: w.dismissed.find((x) => x.id === rec.id)?.reason ?? "" }));
  return {
    applied: d.recs.filter((r) => w.applied.includes(r.id)),
    dismissed,
    open: d.recs.filter((r) => !w.applied.includes(r.id) && !dismissed.some((x) => x.rec.id === r.id)),
  };
}

/** Each note of clinical context is worth a point, up to three, so the chance never runs away from what the chart shows. */
export const CONTEXT_PTS_MAX = 3;
export const contextPts = (w: CaseWork): number => Math.min(CONTEXT_PTS_MAX, w.context.length);

export const currentChance = (d: CaseDetail, w: CaseWork): number => d.baseChance + sum(groupRecs(d, w).applied.map(gainOf)) + contextPts(w);
export const projectedChance = (d: CaseDetail, w: CaseWork): number => currentChance(d, w) + sum(groupRecs(d, w).open.map(gainOf));
export const rangeOf = (d: CaseDetail, chance: number): [number, number] => [Math.max(1, chance - d.spread[0]), Math.min(99, chance + d.spread[1])];
export const similarTotal = (d: CaseDetail): number => d.similar.own + d.similar.network + d.similar.benchmark;
/** With little history of your own or the network's, the number is a benchmark estimate and says so. */
export const isBenchmarkOnly = (d: CaseDetail): boolean => d.similar.own + d.similar.network < 100;
export const confidenceWord = (d: CaseDetail): string => (isBenchmarkOnly(d) ? "Benchmark estimate" : similarTotal(d) >= 800 ? "High" : "Medium");
/** Days likely granted: the chance of all days, otherwise about half. */
export const daysLikely = (chance: number, days: number): number => Math.round((chance / 100) * days + (1 - chance / 100) * Math.round(days / 2));
/** Approved as asked, partly approved, denied. 88 gives 88 / 8 / 4. */
export function outcomeSplit(chance: number): [number, number, number] {
  const partly = Math.round((100 - chance) * (2 / 3));
  return [chance, partly, 100 - chance - partly];
}

export interface DriverView { id: string; label: string; pts: number; finalPts: number; start?: boolean }
/** "Why this number": start plus each row. The rows always add up to the chance now. */
export function driverView(d: CaseDetail, w: CaseWork): { rows: DriverView[]; total: number } {
  const applied = groupRecs(d, w).applied;
  const rows: DriverView[] = [{ id: "start", label: `Starting point for ${payerById(d.payerId).shortName} ${d.levelLabel} requests`, pts: d.start, finalPts: d.start, start: true }];
  for (const r of d.rows) {
    rows.push({ id: r.id, label: r.label, pts: r.base + sum(applied.map((x) => x.moves[r.id] ?? 0)), finalPts: r.base + sum(d.recs.map((x) => x.moves[r.id] ?? 0)) });
  }
  const added = contextPts(w);
  if (added > 0) rows.push({ id: "context", label: "Clinical context you added", pts: added, finalPts: added });
  return { rows, total: sum(rows.map((r) => r.pts)) };
}

export interface CheckView { id: string; label: string; ok: boolean; note: string }
export function checkViews(d: CaseDetail, w: CaseWork): CheckView[] {
  return d.checks.map((c) => {
    if (c.id === "chart" && w.dirty) return { id: c.id, label: c.label, ok: false, note: "You edited the draft. Integrity has not read it again yet." };
    const open = c.blockedBy.some((id) => !w.applied.includes(id));
    return { id: c.id, label: c.label, ok: !open, note: open ? c.warnNote : c.okNote };
  });
}
export const canSend = (d: CaseDetail, w: CaseWork): boolean => d.phase !== "payer" && d.phase !== "denial" && !d.chip && checkViews(d, w).every((c) => c.ok);
export function sendBlockedReason(d: CaseDetail, w: CaseWork): string {
  if (d.chip) return `${d.chip.text}. Nothing is left to send.`;
  if (d.phase === "payer") return "Already with the payer. Navigator is tracking it.";
  if (d.phase === "denial") return "This request was denied. Advocate owns the next step.";
  const open = checkViews(d, w).filter((c) => !c.ok).length;
  return `Integrity has ${open} open ${open === 1 ? "check" : "checks"}. Apply the matching actions first.`;
}

/** Where the Dashboard says the request is now, read from the request itself so the case page never shows an older status. */
export interface LiveView {
  requestId: string; // a request that was denied is renamed D-xxxx, so this can differ from the case's own ID
  stage: StageKey;
  sent: boolean; // it left the case page's hands: nothing is left to send
  moved: boolean; // it is past the stage the queue row was written for, so the page shows the request's own chip and line
  chip: string;
  tone: Tone;
  line: string;
  agent: AgentKey;
  needsYou: boolean; // the payer asked something and the answer waits for a person
}
const STAGES_WITH_PAYER: StageKey[] = ["received", "under_review", "info_requested"];
export const isWithPayer = (stage: StageKey): boolean => STAGES_WITH_PAYER.includes(stage);

/** Null while the request is still being prepared (or has no Dashboard entry): the page then keeps the wording of its own row. */
export function liveView(d: CaseDetail, requests: PsyRequest[]): LiveView | null {
  const r = requests.find((x) => x.id === d.requestId) ?? requests.find((x) => x.caseId === d.id);
  if (!r || r.stage === "preparing") return null;
  const expected: StageKey[] = d.phase === "payer" ? STAGES_WITH_PAYER : d.phase === "denial" ? ["appeal"] : ["preparing"];
  return { requestId: r.id, stage: r.stage, sent: d.phase !== "denial", moved: !expected.includes(r.stage), chip: r.chip, tone: r.tone, line: r.next, agent: r.agent, needsYou: !!r.needsYou };
}

export interface CriterionView extends Criterion { met: boolean }
export function criteriaView(d: CaseDetail, w: CaseWork): CriterionView[] {
  return d.criteria.map((c) => {
    const fixed = !c.metNow && !!c.fixRec && w.applied.includes(c.fixRec);
    const answer = c.fixRec ? w.inputs[c.fixRec]?.trim() : "";
    return {
      ...c, met: c.metNow || fixed,
      evidence: fixed && answer ? `Added by Scribe from your answer: ${answer}` : c.evidence,
      note: fixed ? "Closed by the action you applied. Criteria checked the draft again." : c.note,
    };
  });
}
export const openFor = (d: CaseDetail, w: CaseWork): OpenItem[] => d.open.filter((o) => !w.applied.includes(o.fixRec));

export interface SectionView { id: string; title: string; text: string; sources: Evidence[]; added: { recId: string; text: string }[]; edited: boolean }
export function draftView(d: CaseDetail, w: CaseWork): SectionView[] {
  return d.draft.map((s) => {
    const edit = w.edits[s.id];
    const applied = d.recs.filter((r) => r.add?.section === s.id && w.applied.includes(r.id));
    const adds = applied.filter((r) => !edit?.includes.includes(r.id)); // sentences not yet folded into an edit
    const sources = [...s.sources, ...applied.flatMap((r) => (r.add?.source ? [r.add.source] : []))];
    return { id: s.id, title: s.title, text: edit?.text ?? s.text, sources, edited: !!edit, added: adds.map((r) => ({ recId: r.id, text: r.add?.text(w.inputs[r.id] ?? "") ?? "" })) };
  });
}
export const sectionText = (s: SectionView): string => [s.text, ...s.added.map((a) => a.text)].join(" ");
export const plainText = (sections: SectionView[]): string => sections.map((s) => `${s.title}. ${sectionText(s)}`).join("\n\n");

export interface VersionView { n: number; at: number; by: string; note: string; text: string; current: boolean }
export function versionViews(d: CaseDetail, w: CaseWork): VersionView[] {
  const base = d.draft.map((s) => `${s.title}. ${s.text}`);
  const all = [
    ...d.versions.map((v, i) => ({ ...v, text: base.slice(0, i === d.versions.length - 1 ? base.length : Math.max(1, Math.ceil((base.length * (i + 1)) / d.versions.length))).join("\n\n") })),
    ...w.versions,
  ];
  return all.map((v, i) => ({ ...v, current: i === all.length - 1 })).reverse();
}
