import type { CaseDetail, FocusId, Rec } from "./caseDetail";
import { CONTEXT_PTS_MAX, gainOf, type CaseWork } from "./caseModel";

/* "Refine recommendations": the person picks what matters most. The cards that move that part of the number come first,
   and one more card that fits the focus is added. No randomness: the same focus on the same request always gives the same order and card. */

export const FOCUS_IDS: FocusId[] = ["necessity", "criteria", "denial"];
/** `rows` are the rows of "Why this number" the focus cares about. A card ranks by the points it adds to them. */
export const FOCUS: Record<FocusId, { label: string; sub: string; rows: string[] }> = {
  necessity: { label: "Strengthen medical necessity", sub: "Cards that show how severe things are and what a lower level of care would risk come first.", rows: ["severity", "lower", "home"] },
  criteria: { label: "Meet payer criteria", sub: "Cards that close a requirement the payer asks for come first.", rows: ["criteria", "trace"] },
  denial: { label: "Reduce denial risk", sub: "Cards that prevent a short approval or an information request come first.", rows: ["short", "trace"] },
};

type Sources = CaseDetail["summary"]["sources"];
const EXTRA: Record<FocusId, (src: Sources, gain: number) => Rec> = {
  necessity: (src, gain) => ({
    id: "focus-necessity", focus: "necessity", title: "Add a plain statement of the risk at a lower level of care", agent: "scribe", moves: { severity: gain },
    bullets: ["Scribe adds one plain sentence on the risk the chart shows at a lower level of care", "It uses only what is already in the chart"],
    why: "Reviewers look first for a plain statement of the risk. Approved requests usually had one near the top.",
    add: { section: "lower", text: () => "Taken together, the chart shows that outpatient visits alone would not contain the risk of relapse, which is why this level of care is asked for.", source: src.trajectory },
  }),
  criteria: (src, gain) => ({
    id: "focus-criteria", focus: "criteria", title: "List each payer requirement next to its chart page", agent: "criteria", moves: { criteria: gain },
    bullets: ["Criteria lists every requirement the payer asks for, with the page that backs it", "Packet attaches the list as an exhibit"],
    why: "Reviewers tick requirements off one by one. A list that matches theirs makes the review shorter.",
    add: { section: "plan", text: () => "Exhibit C lists each of the payer's requirements with the chart page that backs it.", source: src.readiness },
  }),
  denial: (src, gain) => ({
    id: "focus-denial", focus: "denial", title: "Prepare a short note for a peer-to-peer call", agent: "advocate", moves: { short: gain },
    bullets: ["Advocate writes a half-page note on the points a reviewer is most likely to question", "It is ready before the payer asks, so a call can happen the same day"],
    why: "Requests that had a note ready were settled in one call more often than those without one.",
    add: { section: "plan", text: () => "A short note on the likely reviewer questions is ready if the payer asks for a peer-to-peer call.", source: src.readiness },
  }),
};

/** The card a focus adds, worth up to 2 points, or null when the request is already so strong that there is no room under 99%. */
function extraCard(d: CaseDetail, focus: FocusId): Rec | null {
  const room = 99 - CONTEXT_PTS_MAX - (d.baseChance + d.recs.reduce((a, r) => a + gainOf(r), 0));
  const gain = Math.min(2, room);
  return gain < 1 ? null : EXTRA[focus](d.summary.sources, gain);
}

/** The case as the page shows it once a focus is set. Calling it again on its own result gives the same result. */
export function withFocus(d: CaseDetail, w: Pick<CaseWork, "focus" | "applied" | "dismissed">): CaseDetail {
  const base = d.recs.filter((r) => !r.focus);
  const root = base.length === d.recs.length ? d : { ...d, recs: base };
  // An added card stays once it has been applied or dismissed, so clearing the focus never changes the numbers already earned.
  const kept = FOCUS_IDS.flatMap((f) => {
    const card = extraCard(root, f);
    return card && (f === w.focus || w.applied.includes(card.id) || w.dismissed.some((x) => x.id === card.id)) ? [card] : [];
  });
  if (!w.focus && kept.length === 0) return root;
  const rows = w.focus ? FOCUS[w.focus].rows : [];
  const weight = (r: Rec): number => rows.reduce((a, row) => a + (r.moves[row] ?? 0), 0);
  return { ...root, recs: [...kept, ...[...base].sort((a, b) => weight(b) - weight(a))] };
}
