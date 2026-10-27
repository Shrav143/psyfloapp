import { isCoreProgram, type AgentKey, type PayerId, type CoreProgram, type PsyRequest, type RequestType, type Tone } from "./types";
import type { CaseScreener } from "./caseScreeners";
import type { FrameworkId } from "./frameworks";
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
/** `metNow` false is "Partial" (covered in the draft, not backed by the chart yet) unless `notMet` says the chart has nothing for it. */
export interface Criterion { id: string; text: string; evidence: string; source: Evidence; note: string; metNow: boolean; notMet?: boolean; fixRec?: string }
/** One of the six dimensions of the case's framework, rated on that framework's scale (ASAM 0 to 4, LOCUS 1 to 5). */
export interface DimRating { n: number; name: string; rating: number; sentence: string; source: Evidence }
export interface Med { name: string; dose: string }
export interface OpenItem { id: string; kind: "conflict" | "missing" | "risk"; text: string; fixRec: string }
export interface DraftSection { id: string; title: string; text: string; sources: Evidence[] }
export interface CheckDef { id: string; label: string; okNote: string; warnNote: string; blockedBy: string[] }
export interface Comparable { who: "Yours" | "Network"; what: string; outcome: string; tone: Tone; match: string }

export interface CaseDetail {
  id: string;
  requestId: string; // id of the Dashboard request to keep in step
  fromQueue: boolean; // its chance is fixed seed data, so applied actions can be written back to the Dashboard without counting twice
  denialId?: string;
  initials: string;
  age: number;
  payerId: PayerId;
  program: CoreProgram;
  levelLabel: string;
  type: RequestType;
  days: number;
  dx: string;
  scores: Score[];
  dueAt?: number;
  dueVerb: string;
  chip?: { text: string; tone: Tone }; // shown instead of the notice-due chip when the request has no clock
  phase: Phase;
  agent: AgentKey;
  needsInput: boolean; // a question waits for a person: on a request with the payer, the answer to its question
  baseChance: number;
  spread: [number, number];
  similar: { own: number; network: number; benchmark: number };
  recs: Rec[];
  start: number;
  rows: DriverRow[];
  summary: { diagnosis: string; status: { text: string; tone: Tone }; trajectory: string; readiness: string; sources: Record<"diagnosis" | "status" | "trajectory" | "readiness", Evidence> };
  /** The level-of-care framework the case is assessed with (frameworkFor), and its six dimensions. */
  framework: FrameworkId;
  dims: DimRating[];
  screeners: CaseScreener[];
  meds: Med[];
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

/** The case page's data for a queue row, built once per row: the queue shows each request's next action from it. */
const QUEUE_DETAILS = new Map<string, CaseDetail>();
export function detailForQueueItem(item: QueueItem): CaseDetail {
  if (item.id === R1042_DETAIL.id) return R1042_DETAIL;
  let d = QUEUE_DETAILS.get(item.id);
  if (!d) {
    d = buildFromSeed({ ...seedFromItem(item), id: item.id, requestId: item.id });
    QUEUE_DETAILS.set(item.id, d);
  }
  return d;
}

/** The case an id belongs to. A denial (D-3284) belongs to the case it came from, and that case decides which site it is at. */
export const caseIdOf = (id: string, requests: PsyRequest[]): string => (requests.find((r) => r.id === id) ?? requests.find((r) => r.caseId === id))?.caseId ?? id;

/** Find what the case page needs for an id: the queue row, a Dashboard request (by id or by the case it belongs to), or nothing. */
export function resolveCase(id: string, requests: PsyRequest[]): CaseDetail | null {
  if (id === R1042_DETAIL.id) return R1042_DETAIL;
  const req = requests.find((r) => r.id === id) ?? requests.find((r) => r.caseId === id);
  const item: QueueItem | undefined = QUEUE_ITEMS.find((i) => i.id === id) ?? QUEUE_ITEMS.find((i) => i.id === req?.id);
  if (item) return buildFromSeed({ ...seedFromItem(item), id, requestId: req?.id ?? item.id, denialId: req?.track === "denial" ? req.id : undefined });
  /* The case model (chart, criteria, approval chance) covers the four core levels of care. A request for another Virginia service has no case detail:
     its page is the service summary (pages/authorizations/ServiceCasePage.tsx). */
  if (req && isCoreProgram(req.program)) return buildFromSeed({ ...seedFromRequest(req, req.program), id, requestId: req.id, denialId: req.track === "denial" ? req.id : undefined });
  return null;
}
