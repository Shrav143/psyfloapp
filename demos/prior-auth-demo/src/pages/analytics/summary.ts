import { OUTCOME_LABEL, DX_LABEL, KIND_LABEL, POPULATION_LABEL, dateOfDay, type Decision } from "@/data/decisions";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import type { Figure } from "./board";
import { filterWords, periodInfo, type Filters } from "./filters";
import type { PayerView } from "./payerView";
import { fmt, pctOf, statsOf } from "./stats";

/* The text "Copy summary" puts on the clipboard. Plain lines, initials and age only, always marked as demo data. */

const DEMO = "Demo data: this is sample data.";

export const amountText = (d: Decision): string => (d.outcome === "denied" ? `0 of ${d.requested} ${d.unit} approved` : d.outcome === "partial" ? `${d.approvedAmt} of ${d.requested} ${d.unit} approved` : `${d.requested} ${d.unit} approved as requested`);
export const daysToDecision = (d: Decision): string => `${(d.hours / 24).toFixed(1)} days`;

export function caseSummary(d: Decision): string {
  const lines = [
    `Case ${d.id} (${d.initials}, ${d.age})`,
    `Payer: ${payerById(d.payerId).name}. Program: ${PROGRAM_LABEL[d.program]}. Request: ${KIND_LABEL[d.kind]}.`,
    `Diagnosis group: ${DX_LABEL[d.dx]}. Population: ${POPULATION_LABEL[d.population]}. Site ${d.site}.`,
    `Decided ${dateOfDay(d.day)} after ${daysToDecision(d)}${d.expedited ? " (expedited)" : ""}${d.pastCms ? ", past the CMS decision time" : ""}.`,
    `Outcome: ${OUTCOME_LABEL[d.outcome]}, ${amountText(d)}.`,
  ];
  if (d.reason) lines.push(`Reason: ${d.reason} (${d.preventable ? "preventable: the team could have fixed it before sending" : "not preventable"}).`);
  if (d.p2p !== "none") lines.push(`Peer-to-peer: ${d.p2p === "scheduled" ? "call booked, not held yet" : d.p2p === "changed" ? "the reviewer changed the decision" : "the decision stood"}.`);
  if (d.appeal !== "none") lines.push(`Appeal: ${d.appeal === "pending" ? "filed, no ruling yet" : d.appeal === "upheld" ? "the denial was upheld" : d.appeal === "partly" ? "partly restored" : "overturned"}.`);
  if (d.accepted) lines.push("The clinic accepted this denial.");
  lines.push(DEMO);
  return lines.join("\n");
}

export function caseListSummary(title: string, rows: readonly Decision[], f: Filters, siteLabel: string): string {
  const s = statsOf(rows);
  const reasons = new Map<string, number>();
  for (const d of rows) if (d.reason) reasons.set(d.reason, (reasons.get(d.reason) ?? 0) + 1);
  const top = [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const words = filterWords(f);
  return [
    `${title}: ${fmt(rows.length)} ${rows.length === 1 ? "case" : "cases"}`,
    `${periodInfo(f.period).label}${words ? `, ${words}` : ""}. ${siteLabel}.`,
    `${fmt(s.approved)} approved as requested, ${fmt(s.partial)} approved in part, ${fmt(s.denied)} denied.`,
    ...(top.length ? [`Top reasons: ${top.map(([r, n]) => `${r} (${n})`).join("; ")}.`] : []),
    DEMO,
  ].join("\n");
}

export function payerSummary(v: PayerView, f: Filters, siteLabel: string, figures: Figure[]): string {
  const words = filterWords({ ...f, payer: "all" });
  return [
    `${v.name} (${v.plan})`,
    `${periodInfo(f.period).label}${words ? `, ${words}` : ""}. ${siteLabel}. ${fmt(v.s.n)} decisions.`,
    ...figures.map((x) => `${x.label}: ${x.value}${x.change ? ` (${x.change.text})` : ""}`),
    "What this payer tends to do:",
    ...v.insights.map((l) => `- ${l}`),
    ...(v.reasons.length ? [`Top denial reasons: ${v.reasons.slice(0, 3).map((r) => `${r.label} (${r.count})`).join("; ")}.`] : []),
    `Approval rate across the clinic's payers: ${pctOf(v.clinic.approved, v.clinic.n) ?? "-"}%.`,
    DEMO,
  ].join("\n");
}
