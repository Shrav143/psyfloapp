import type { Option } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { STAGES, STAGE_LABEL, type PsyRequest, type StageKey } from "@/data/types";
import { denialDeadlines, inSpan, type DueItem } from "@/lib/floFacts";
import { plural } from "@/lib/format";
import { DAY } from "@/lib/time";
import { lateness, minutesInStage, stageCounts } from "@/store/selectors";
import { draftNeeds } from "./preparing-drafts";

/* The Dashboard is one daily work list. Three groupings that no single stage can say sit in the Stage menu beside the six stages,
   and four figures above the list are shortcuts to them. Every count is worked out from the requests, the queue's due times and the clock. */

/** A grouping of the list. Waiting on payers is Received and Under review together; the other two follow the people and the due times. */
export type ViewKey = "needs_you" | "due_24h" | "waiting";
export const VIEWS: ViewKey[] = ["needs_you", "due_24h", "waiting"];
export const VIEW_LABEL: Record<ViewKey, string> = { needs_you: "Needs you", due_24h: "Due within 24 hours", waiting: "Waiting on payers" };
/** What the Stage menu holds: no stage, one of the three groupings, or one of the six stages. */
export type StageMenuValue = StageKey | ViewKey | "all";

const isWaiting = (r: PsyRequest): boolean => r.stage === "received" || r.stage === "under_review";
/** Something is due on it within a day, or already was. */
const isDueSoon = (r: PsyRequest, dues: Map<string, DueItem>, clock: number): boolean => {
  const d = dues.get(r.id);
  return d !== undefined && d.dueAt - clock <= DAY;
};

export function applyView(rows: PsyRequest[], view: ViewKey, dues: Map<string, DueItem>, clock: number): PsyRequest[] {
  if (view === "needs_you") return rows.filter((r) => r.needsYou);
  if (view === "due_24h") return rows.filter((r) => isDueSoon(r, dues, clock));
  return rows.filter(isWaiting);
}

/** The ones waiting on a person first, then the nearest clock: the due time the Authorizations queue ranks by, or a denial's deadline. Rows with no due time keep the longest wait first. */
export function workListOrder(rows: PsyRequest[], dues: Map<string, DueItem>, clock: number): PsyRequest[] {
  const due = (r: PsyRequest): number => dues.get(r.id)?.dueAt ?? Infinity;
  return [...rows].sort((a, b) => Number(!!b.needsYou) - Number(!!a.needsYou) || due(a) - due(b) || minutesInStage(b, clock) - minutesInStage(a, clock));
}

/* ------------------------------------------------------------------ the four figures */

export type FigureId = ViewKey | "denials";
export interface Figure {
  id: FigureId;
  label: string;
  value: number;
  note: string;
  /** Colour is for urgency only: ochre when someone is waiting on you, terracotta when something is already due. */
  tone: "ink" | "mid" | "risk";
  /** The words for a screen reader and the tooltip: what the number counts. */
  means: string;
}

/**
 * Needs you, Due within 24 hours, Waiting on payers, Denials to act on. They follow Payer, Program and Request type but not Stage.
 * `more` are cases saved in New case that have no row yet; the ones waiting on a person count under Needs you.
 */
export function keyFigures(base: PsyRequest[], dues: Map<string, DueItem>, clock: number, more: CaseDraft[]): Figure[] {
  const needs = base.filter((r) => r.needsYou);
  const need = draftNeeds(more);
  const needDrafts = need.needYou + need.ready;
  const info = needs.filter((r) => r.stage === "info_requested").length;
  const prep = needs.length - info + needDrafts;
  const needsNote = [info ? `${plural(info, "payer question")}` : "", prep ? plural(prep, "draft") : ""].filter(Boolean).join(", ") || "nothing is waiting on you";

  const soon = base.filter((r) => isDueSoon(r, dues, clock)).sort((a, b) => (dues.get(a.id)?.dueAt ?? 0) - (dues.get(b.id)?.dueAt ?? 0));
  const overdue = soon.filter((r) => (dues.get(r.id)?.dueAt ?? 0) <= clock).length;
  const next = soon.find((r) => (dues.get(r.id)?.dueAt ?? 0) > clock);
  const soonNote = overdue ? `${overdue} already due` : next ? `next: ${next.id} in ${inSpan((dues.get(next.id)?.dueAt ?? clock) - clock)}` : "nothing due in the next day";

  const waiting = base.filter(isWaiting);
  const late = waiting.filter((r) => lateness(r, clock) !== "ok").length;

  const denials = stageCounts(base).appeal;
  const week = denialDeadlines(base, clock).soon.length;

  return [
    { id: "needs_you", label: VIEW_LABEL.needs_you, value: needs.length + needDrafts, note: needsNote, tone: needs.length + needDrafts > 0 ? "mid" : "ink", means: "Requests waiting on a person: a payer's question, a draft with a question for you, or one ready to sign." },
    { id: "due_24h", label: VIEW_LABEL.due_24h, value: soon.length, note: soonNote, tone: overdue ? "risk" : "ink", means: "Requests with a deadline or an expected answer in the next 24 hours, or already past it. The times are the ones Authorizations ranks by." },
    { id: "waiting", label: VIEW_LABEL.waiting, value: waiting.length, note: late ? `${late} running late` : "none running late", tone: "ink", means: "Requests the payer has: Received and Under review." },
    { id: "denials", label: "Denials to act on", value: denials, note: `${plural(week, "deadline")} this week`, tone: "ink", means: "Open denials: a call, an appeal, an external review or a resubmission." },
  ];
}

export const isStage = (v: StageMenuValue): v is StageKey | "all" => v === "all" || (STAGES as string[]).includes(v);

/** How many requests sit in each stage, with the cases saved in New case that have no row yet added to Preparing. */
export function stageTotals(base: PsyRequest[], more: number): Record<StageKey, number> {
  const c = stageCounts(base);
  return { ...c, preparing: c.preparing + more };
}

/** The Stage menu: no stage, the three groupings, then the six stages. Each shows how many requests it holds. */
export function stageOptions(totals: Record<StageKey, number>, figures: Figure[]): Option<StageMenuValue>[] {
  return [
    { value: "all", label: "All stages" },
    ...VIEWS.map((v) => ({ value: v, label: VIEW_LABEL[v], hint: String(figures.find((f) => f.id === v)?.value ?? 0) })),
    ...STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s], hint: String(totals[s]) })),
  ];
}

/** Each stage name next to the status the rest of Psyflo uses for it. The names stay; this is help text. */
export const STAGE_STATUS: Record<StageKey, string> = {
  preparing: "Draft while it is being prepared, Ready for review once a person can sign it.",
  received: "Submitted once it is signed and sent, Acknowledged when the payer has it.",
  under_review: "Under review.",
  info_requested: "Info requested. The payer asked for more information.",
  decided: "Approved or Denied today. Completed once nothing is left to do.",
  appeal: "Denied, with its route: a call, an appeal, an external review or a resubmission.",
};
