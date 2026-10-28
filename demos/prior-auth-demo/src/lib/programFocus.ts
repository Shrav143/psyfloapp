import type { DxTrack } from "@/data/frameworks";
import type { QueueItem } from "@/data/queue";
import { isCoreProgram, type CoreProgram, type Program } from "@/data/types";
import { serviceById, type ProgramFocus, type VaServiceId } from "@/data/va/services";

/* The top bar's Program menu (store.programFocus) narrows the modules that hold data for the chosen service. The authorization data is built on
   four levels of care, so a service maps to its level of care where it has one (ARTS residential to Residential 3.5, ARTS withdrawal management
   to Detox, ARTS and mental health IOP to IOP, ARTS and mental health PHP to PHP). Where the data tells substance use from mental health, the
   service's track narrows it further. Any other Virginia service (CPST, ACT, ABA and the rest) narrows a page only once it holds requests for that
   service, made in New Authorization; until then the page shows everything with a note. "All programs" narrows nothing, so every canonical number holds. */

export interface FocusScope {
  id: VaServiceId;
  /** "ARTS intensive outpatient (ASAM 2.1)" */
  label: string;
  /** "ARTS IOP" */
  short: string;
  /** The program the scope narrows by: the level of care the service maps to; for any other Virginia service its own program, set by
      useProgramScope only on a page that holds requests for it. Null: nothing to narrow by here. */
  program: Program | null;
  /** The service's own program in the authorization data: IOP for ARTS IOP, ACT for Assertive Community Treatment. New Authorization starts on it. */
  own: Program;
  /** ARTS services are substance use (co-occurring included); mental health IOP and PHP are a mental health condition alone. */
  track: "sud" | "mh" | null;
}

/** What the Program menu narrows to, or null for "All programs". */
export function focusScope(focus: ProgramFocus): FocusScope | null {
  if (focus === "all") return null;
  const s = serviceById(focus);
  return { id: s.id, label: s.label, short: s.short, program: isCoreProgram(s.program) ? s.program : null, own: s.program, track: s.track ?? null };
}

/** The level of care of a scope, for a module that only holds the four core levels of care (Analytics, the Payers document lists). */
export const coreOf = (scope: FocusScope | null | undefined): CoreProgram | null => (scope && isCoreProgram(scope.program) ? scope.program : null);

/** True when a record of this program (and, when the data knows it, this diagnosis track) belongs to the scope. A scope with no program keeps everything. */
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
