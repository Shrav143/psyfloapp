import type { AgentKey, PayerId, Program, PsyRequest, RequestType, Tone } from "./types";
import { QUEUE_ITEMS, type Phase, type QueueItem, type Score } from "./queue";
import { R1042_DETAIL } from "./caseDetailR1042";
import { buildFromSeed, seedFromItem, seedFromRequest } from "./caseDetailTemplate";

/* Everything the case page shows for one request. R-1042 is written by hand; every other request is
   generated from a template plus its queue row or Dashboard request (see caseDetailTemplate.ts). */

export interface Evidence { label: string; quote: string }

/** What "Refine recommendations" can put first (see caseDetailFocus.ts). */
export type FocusId = "necessity" | "criteria" | "denial";

/** One recommendation. `moves` says how many points it adds to which row of "Why this number". Its gain is their sum. */
export interface Rec {
  id: string;
  title: string;
  agent: AgentKey;
  bullets: string[];
  why: string;
  input?: { label: string; placeholder: string };
  moves: Record<string, number>;
  link?: { label: string; to: string };
  add?: { section: string; text: (answer: string) => string; source?: Evidence };
  focus?: FocusId; // set on the one card that "Refine recommendations" adds for that focus
}
export interface DriverRow { id: string; label: string; base: number } // base = points already earned before any action
export interface Criterion { id: string; text: string; evidence: string; source: Evidence; note: string; metNow: boolean; fixRec?: string }
export interface AsamDim { n: number; name: string; level: 0 | 1 | 2 | 3 | 4; sentence: string }
export interface OpenItem { id: string; kind: "conflict" | "missing" | "risk"; text: string; fixRec: string }
export interface DraftSection { id: string; title: string; text: string; sources: Evidence[] }
export interface CheckDef { id: string; label: string; okNote: string; warnNote: string; blockedBy: string[] }
export interface Comparable { who: "Yours" | "Network"; what: string; outcome: string; tone: Tone; match: string }
export interface TrendSeries { name: string; color: string; data: number[] }
export interface KeyScore { label: string; value: string; of: string; note?: string; tone: Tone }

export interface CaseDetail {
  id: string;
  requestId: string; // id of the Dashboard request to keep in step
  fromQueue: boolean; // its chance is fixed seed data, so applied actions can be written back to the Dashboard without counting twice
  denialId?: string;
  initials: string;
  age: number;
  payerId: PayerId;
  program: Program;
  levelLabel: string;
  type: RequestType;
  days: number;
  dx: string;
  scores: Score[];
  dueAt?: number;
  dueVerb: string;
  chip?: { text: string; tone: Tone }; // shown instead of the notice-due chip when the request has no clock
  atStake: number;
  phase: Phase;
  agent: AgentKey;
  statusLine: string;
  baseChance: number;
  spread: [number, number];
  similar: { own: number; network: number; benchmark: number };
  recs: Rec[];
  start: number;
  rows: DriverRow[];
  summary: { diagnosis: string; status: { text: string; tone: Tone }; trajectory: string; readiness: string; sources: Record<"diagnosis" | "status" | "trajectory" | "readiness", Evidence> };
  asam: AsamDim[];
  trendLabels: string[];
  trend: TrendSeries[];
  keyScores: KeyScore[];
  standsOut: string[];
  engagement: { pct: number; checks: string[] };
  open: OpenItem[];
  policy: string;
  criteria: Criterion[];
  keepHigh: string;
  tool: string;
  biggest: { title: string; text: string; seen: string };
  common: string[];
  comparable: Comparable[];
  calibration: { said: string; actual: number; n: number };
  draft: DraftSection[];
  versions: { n: number; at: number; by: string; note: string }[];
  checks: CheckDef[];
}

/** Find what the case page needs for an id: the queue row, a Dashboard request (by id or by the case it belongs to), or nothing. */
export function resolveCase(id: string, requests: PsyRequest[]): CaseDetail | null {
  if (id === R1042_DETAIL.id) return R1042_DETAIL;
  const req = requests.find((r) => r.id === id) ?? requests.find((r) => r.caseId === id);
  const item: QueueItem | undefined = QUEUE_ITEMS.find((i) => i.id === id) ?? QUEUE_ITEMS.find((i) => i.id === req?.id);
  if (item) return buildFromSeed({ ...seedFromItem(item), id, requestId: req?.id ?? item.id, denialId: req?.track === "denial" ? req.id : undefined });
  if (req) return buildFromSeed({ ...seedFromRequest(req), id, requestId: req.id, denialId: req.track === "denial" ? req.id : undefined });
  return null;
}
