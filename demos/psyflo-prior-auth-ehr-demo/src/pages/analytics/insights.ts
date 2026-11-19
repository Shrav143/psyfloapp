import { DX_LABEL, KIND_LABEL, cmsApplies, type Decision, type DxId } from "@/data/decisions";
import type { RequestKind } from "@/data/queue";
import { PROGRAM_LABEL, type BuiltInPayerId, type Program } from "@/data/types";
import { avgDays, pctOf, statsOf, sum } from "./stats";

/* "What this payer tends to do": three plain-language lines, worked out from the payer's own decisions and compared with the clinic's other
   payers. Nothing here is typed in: change the records and the sentences change. */

interface Candidate {
  type: string;
  score: number;
  text: string;
}

const lower = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
const KIND_PHRASE: Record<RequestKind, string> = { initial: "first-request", concurrent: "continued-stay", reauth: "recertification", modify: "modification", retro: "retro-authorization" };
const oneDecimal = (n: number): string => (Math.round(n * 10) / 10).toString();

/** The most common reason among a set of denials, as a clause. */
function leadReason(rows: readonly Decision[]): string {
  const denials = rows.filter((d) => d.outcome !== "approved" && d.reason);
  if (denials.length < 3) return "";
  const counts = new Map<string, number>();
  for (const d of denials) counts.set(d.reason as string, (counts.get(d.reason as string) ?? 0) + 1);
  const [label, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
  return ` Most often: ${lower(label)} (${n} of ${denials.length} denials).`;
}

/** Up to three lines. `payerRows` are the payer's decisions in the period, `clinicRows` every payer's in view for the same period. */
export function insightsFor(payer: BuiltInPayerId, payerRows: readonly Decision[], clinicRows: readonly Decision[]): string[] {
  const s = statsOf(payerRows);
  const c = statsOf(clinicRows);
  if (s.n < 20) return ["Not enough decisions in this view to say what this payer tends to do."];
  const rate = pctOf(s.approved, s.n) ?? 0;
  const clinicRate = pctOf(c.approved, c.n) ?? 0;
  const out: Candidate[] = [];

  // where the payer approves least, by diagnosis group, request type and program
  const dims: { type: string; name: (d: Decision) => string; label: (k: string) => string; keys: string[] }[] = [
    { type: "weak-dx", name: (d) => d.dx, label: (k) => DX_LABEL[k as DxId], keys: Object.keys(DX_LABEL) },
    { type: "weak-kind", name: (d) => d.kind, label: (k) => `${lower(KIND_LABEL[k as RequestKind])} requests`, keys: Object.keys(KIND_LABEL) },
    { type: "weak-program", name: (d) => d.program, label: (k) => `${PROGRAM_LABEL[k as Program]} requests`, keys: Object.keys(PROGRAM_LABEL) },
  ];
  for (const dim of dims) {
    const cells = dim.keys.map((k) => {
      const rows = payerRows.filter((d) => dim.name(d) === k);
      return { k, rows, n: rows.length, rate: pctOf(rows.filter((d) => d.outcome === "approved").length, rows.length) };
    }).filter((x) => x.n >= 10 && x.rate !== null);
    const worst = [...cells].sort((a, b) => (a.rate as number) - (b.rate as number))[0];
    if (worst && rate - (worst.rate as number) >= 8) out.push({ type: dim.type, score: (rate - (worst.rate as number)) * Math.sqrt(worst.n), text: `Approves ${dim.label(worst.k)} least often: ${worst.rate}% as requested against ${rate}% overall (${worst.n} decisions).${leadReason(worst.rows)}` });
    const best = [...cells].sort((a, b) => (b.rate as number) - (a.rate as number))[0];
    if (best && (best.rate as number) - rate >= 10) out.push({ type: "strong", score: ((best.rate as number) - rate) * Math.sqrt(best.n) * 0.5, text: `Approves ${dim.label(best.k)} reliably: ${best.rate}% as requested (${best.n} decisions).` });
  }

  // days or units cut, by diagnosis group and request type
  const cuts = new Map<string, Decision[]>();
  for (const d of payerRows) if (d.outcome === "partial") cuts.set(`${d.dx}|${d.kind}|${d.unit}`, [...(cuts.get(`${d.dx}|${d.kind}|${d.unit}`) ?? []), d]);
  let bestCut: { rows: Decision[]; score: number } | null = null;
  for (const rows of cuts.values()) {
    if (rows.length < 5) continue;
    const ratio = sum(rows.map((d) => d.approvedAmt)) / sum(rows.map((d) => d.requested));
    const score = rows.length * (1 - ratio) * 8;
    if (!bestCut || score > bestCut.score) bestCut = { rows, score };
  }
  if (bestCut) {
    const rows = bestCut.rows;
    const first = rows[0];
    const asked = sum(rows.map((d) => d.requested)) / rows.length;
    const got = sum(rows.map((d) => d.approvedAmt)) / rows.length;
    out.push({ type: "cuts", score: bestCut.score + 40, text: `Cuts ${KIND_PHRASE[first.kind]} ${first.unit} for ${lower(DX_LABEL[first.dx])}: approved ${oneDecimal(got)} of ${oneDecimal(asked)} requested on average (${rows.length} cases).` });
  }

  // speed, against the clinic's other payers
  const days = avgDays(s);
  const clinicDays = avgDays(c);
  if (days !== null && clinicDays !== null && clinicDays > 0) {
    const ratio = days / clinicDays;
    const cms = cmsApplies(payer) && s.cmsN >= 20 ? ` ${pctOf(s.pastCms, s.cmsN)}% of its decisions went past the CMS decision time (${s.pastCms} of ${s.cmsN}).` : "";
    if (ratio >= 1.2) out.push({ type: "speed", score: 40 + 60 * (ratio - 1), text: `Slower than the clinic's payers on average: ${days.toFixed(1)} days to decide against ${clinicDays.toFixed(1)}.${cms}` });
    else if (ratio <= 0.8) out.push({ type: "speed", score: 30 + 40 * (1 - ratio), text: `Decides faster than the clinic's payers on average: ${days.toFixed(1)} days against ${clinicDays.toFixed(1)}.` });
  }

  // how many of its denials the team could have prevented
  const denials = payerRows.filter((d) => d.outcome !== "approved");
  const prevShare = pctOf(denials.filter((d) => d.preventable).length, denials.length);
  if (denials.length >= 10 && prevShare !== null && prevShare >= 60) out.push({ type: "prevent", score: 35 + (prevShare - 60) / 2, text: `${prevShare}% of its denials were preventable, which means the documentation or the timing could have been fixed before sending.${leadReason(denials.filter((d) => d.preventable))}` });

  // asking for more information
  const infoRate = pctOf(s.infoRequests, s.n) ?? 0;
  const clinicInfo = pctOf(c.infoRequests, c.n) ?? 0;
  if (infoRate >= 14 && infoRate - clinicInfo >= 5) out.push({ type: "info", score: 45 + infoRate - clinicInfo, text: `Asks for more information on ${infoRate}% of requests (${clinicInfo}% across the clinic's payers), so fewer are approved on the first look.` });

  // whether appeals work
  const overturn = pctOf(s.overturned, s.rulings);
  if (s.rulings >= 8 && overturn !== null && (overturn >= 55 || overturn <= 40)) out.push({ type: "appeals", score: 50, text: overturn >= 55 ? `Appeals are worth filing: ${overturn}% of ${s.rulings} rulings were overturned or partly restored.` : `Appeals rarely succeed: ${overturn}% of ${s.rulings} rulings were overturned or partly restored.` });

  const picked: Candidate[] = [];
  for (const cand of out.sort((a, b) => b.score - a.score)) if (picked.length < 3 && !picked.some((p) => p.type === cand.type)) picked.push(cand);
  const lines = picked.map((p) => p.text);
  const gap = rate - clinicRate;
  const cutShare = pctOf(s.partial, s.notApproved);
  const fallbacks = [
    `Approves ${rate}% as requested, ${gap === 0 ? "level with" : `${Math.abs(gap)} ${Math.abs(gap) === 1 ? "point" : "points"} ${gap > 0 ? "above" : "below"}`} the clinic's payers (${clinicRate}%).`,
    days !== null && clinicDays !== null ? `Takes ${days.toFixed(1)} days to decide on average; the clinic's payers average ${clinicDays.toFixed(1)}.` : "",
    s.notApproved > 0 && cutShare !== null ? `${s.partial} of its ${s.notApproved} denials (${cutShare}%) were approvals in part, with days or units cut; the rest were denied outright.` : "",
    `Asks for more information on ${infoRate}% of requests (${clinicInfo}% across the clinic's payers).`,
  ].filter(Boolean);
  for (const f of fallbacks) if (lines.length < 3) lines.push(f);
  return lines.slice(0, 3);
}
