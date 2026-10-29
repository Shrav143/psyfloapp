import type { DenialMeta } from "@/data/denials";
import { FRAMEWORKS, frameworkFor, type DxTrack, type FrameworkDef } from "@/data/frameworks";
import { DX, MH_DX, QUEUE_ITEMS, dxKeyFor, dxTrackOf, type QueueItem } from "@/data/queue";
import { isCoreProgram, type PsyRequest } from "@/data/types";

const SUD = /use disorder|alcohol|opioid|stimulant|cannabis|cocaine|methamphetamine|substance|withdrawal/i;
const MH = /depress|anxiety|ptsd|posttraumatic|trauma|bipolar|psychos|schizo|mood|panic|obsess|eating/i;

/** The diagnosis group a diagnosis line belongs to: any substance use is "sud" (or "cooccurring" with a mental health condition); none is "mental_health". */
export function trackOfDx(dx: string): DxTrack {
  if (!SUD.test(dx)) return "mental_health";
  return MH.test(dx) ? "cooccurring" : "sud";
}

/** The queue row of the denial's case, when the case is in the Authorizations queue: it carries the case's diagnosis. */
const queueItemOf = (r: PsyRequest): QueueItem | undefined => QUEUE_ITEMS.find((i) => i.id === r.caseId) ?? QUEUE_ITEMS.find((i) => i.id === r.id);

/** The working diagnosis of a denial: the one recorded with it, otherwise the diagnosis of its case in the queue, otherwise the one the demo assigns to the case. */
export function dxOfDenial(r: PsyRequest, meta: DenialMeta | undefined): string {
  if (meta?.dx) return meta.dx;
  const item = queueItemOf(r);
  if (item) return item.mh ? MH_DX[item.mh].name : DX[item.dxKey].name;
  /* A denial of a Virginia service has no demo diagnosis to fall back on. */
  return isCoreProgram(r.program) ? DX[dxKeyFor(r.caseId, r.program)].name : "Diagnosis not recorded";
}

/** The level-of-care framework the denial is read against: ASAM Criteria for substance use and co-occurring conditions, LOCUS or CALOCUS-CASII for mental health alone.
    A denial recorded with its diagnosis reads it; one made from a queue case follows that case, so the denial and its case always name the same framework. */
export function frameworkOfDenial(r: PsyRequest, meta: DenialMeta | undefined): FrameworkDef {
  const item = meta?.dx ? undefined : queueItemOf(r);
  const track = item ? dxTrackOf(item) : trackOfDx(dxOfDenial(r, meta));
  return FRAMEWORKS[frameworkFor({ program: r.program, track, age: r.patient.age })];
}
