import type { DxTrack } from "@/data/frameworks";
import type { QueueItem } from "@/data/queue";
import { PROGRAMS, type CoreProgram } from "@/data/types";
import { serviceById, type ProgramFocus, type VaServiceId } from "@/data/va/services";

/* The top bar's Program menu (store.programFocus) narrows the modules that hold data for the chosen service. The authorization data is built on
   four levels of care, so a service maps to its level of care where it has one (ARTS residential to Residential 3.5, ARTS withdrawal management
   to Detox, ARTS and mental health IOP to IOP, ARTS and mental health PHP to PHP) and to nothing otherwise. Where the data tells substance use
   from mental health, the service's track narrows it further. "All programs" narrows nothing, so every canonical number holds. */

export interface FocusScope {
  id: VaServiceId;
  /** "ARTS intensive outpatient (ASAM 2.1)" */
  label: string;
  /** "ARTS IOP" */
  short: string;
  /** The level of care the service maps to, or null when the authorization data has none for it (CPST, ACT, ABA and the rest). */
  program: CoreProgram | null;
  /** ARTS services are substance use (co-occurring included); mental health IOP and PHP are a mental health condition alone. */
  track: "sud" | "mh" | null;
}

const isCore = (p: string): p is CoreProgram => (PROGRAMS as string[]).includes(p);

/** What the Program menu narrows to, or null for "All programs". */
export function focusScope(focus: ProgramFocus): FocusScope | null {
  if (focus === "all") return null;
  const s = serviceById(focus);
  return { id: s.id, label: s.label, short: s.short, program: isCore(s.program) ? s.program : null, track: s.track ?? null };
}

/** True when a record of this level of care (and, when the data knows it, this diagnosis track) belongs to the scope. A scope with no level of care keeps everything. */
export function inScope(scope: FocusScope, program: string | null | undefined, track?: DxTrack): boolean {
  if (!scope.program) return true;
  if (program !== scope.program) return false;
  if (!scope.track || !track) return true;
  return scope.track === "mh" ? track === "mental_health" : track !== "mental_health";
}

/** The diagnosis track of a case, as its case page reads it: a queue item flagged with a mental health condition alone is mental health; everything else in the
    seed data is substance use or co-occurring (data/queue.ts, dxTrackOf). A draft's own diagnosis codes decide for a draft with no queue item. */
export function caseTrack(id: string, queue: readonly QueueItem[], codes?: readonly string[]): DxTrack {
  const q = queue.find((i) => i.id === id);
  if (q) return q.mh ? "mental_health" : "sud";
  if (codes?.length && !codes.some((c) => c.startsWith("F1"))) return "mental_health";
  return "sud";
}

/** The one line a module shows when it has no data for the service: it then shows everything. */
export const noDataNote = (s: FocusScope): string => `No ${s.label} data here yet. Showing all programs.`;
/** The URL parameter that remembers, per page, that a person removed the preset for this service. */
export const FOCUS_OFF = "focusoff";
