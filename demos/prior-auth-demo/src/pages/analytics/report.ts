import { money } from "@/lib/format";
import { fmt, trendLine, type View } from "./model";

const NOT_ENOUGH = "Not enough decisions yet";
const pct = (v: number | null): string => (v === null ? NOT_ENOUGH : `${v}%`);
const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The report as plain sections, so the Markdown file and the printed page say exactly the same thing. */
export interface ReportSection {
  title: string;
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
  numbered?: string[];
}
export interface ReportDoc {
  title: string;
  meta: string[];
  sections: ReportSection[];
}

export function reportDoc(v: View, prevLabel: string): ReportDoc {
  const sections: ReportSection[] = [
    {
      title: "Headline figures",
      bullets: [
        `Approved as asked: ${pct(v.approved.value)} (${fmt(v.approved.n)} decisions). ${v.approved.value === null ? "" : trendLine(v.approved.delta, prevLabel)}`.trim(),
        `Top denial cause: ${v.topCause.value === null ? NOT_ENOUGH : `${v.topCause.value}% of denials, ${v.topCause.label} (${fmt(v.topCause.n)} denials)`}`,
        `Advice taken works: ${pct(v.advice.value)} approved when applied (${fmt(v.advice.n)} requests)`,
        `Sent without edits: ${pct(v.noEdits.value)} of agent drafts (${fmt(v.noEdits.n)} drafts)`,
      ],
    },
    { title: "Approval rate by payer", bullets: v.bars.map((b) => `${b.label}: ${pct(b.value)} (${fmt(b.n)} decisions)`) },
    { title: "How people edit agent drafts", bullets: v.edits ? [...v.edits.parts.map((p) => `${p.label}: ${p.share}% of drafts, approved ${p.approved}% of the time`), `Drafts counted: ${fmt(v.edits.n)}`] : [NOT_ENOUGH] },
    v.reasons
      ? { title: "Common denial reasons", table: { head: ["Reason", "Payer", "Count", "Share of denials"], rows: v.reasons.rows.map((r) => [r.reason, r.payer, String(r.count), `${r.share}%`]) } }
      : { title: "Common denial reasons", bullets: [NOT_ENOUGH] },
    {
      title: "Denial outcomes",
      bullets: [
        `Appeals overturned: ${pct(v.appeals.value)} (${fmt(v.appeals.overturned)} of ${fmt(v.appeals.n)} rulings, partly restored counts as overturned)`,
        `Written off after accepted denials: ${money(v.writtenOff.amount)} (${fmt(v.writtenOff.n)} denials)`,
      ],
    },
    v.helps ? { title: "What helps most", numbered: v.helps.map((h) => `${h.label}. Applied ${fmt(h.applied)} times, ${h.approved}% approved.`) } : { title: "What helps most", bullets: [NOT_ENOUGH] },
  ];
  if (v.dismissed) sections.push({ title: "Why recommendations were dismissed", bullets: v.dismissed.map((d) => `${d.reason}: ${d.count} ${d.count === 1 ? "time" : "times"}`) });
  return {
    title: "Psyflo monthly report",
    meta: [`Period: ${v.period.label}`, `Scope: ${v.scope}`, "Built by Analyst from demo data. A figure based on fewer than 20 decisions is left out."],
    sections,
  };
}

/** The monthly report as Markdown, built from exactly the figures on screen. */
export function reportMarkdown(v: View, prevLabel: string): string {
  const doc = reportDoc(v, prevLabel);
  const lines: string[] = [`# ${doc.title}`, "", ...doc.meta, ""];
  for (const s of doc.sections) {
    lines.push(`## ${s.title}`, "");
    if (s.bullets) lines.push(...s.bullets.map((b) => `- ${b}`));
    if (s.table) lines.push(`| ${s.table.head.join(" | ")} |`, `|${s.table.head.map(() => "---").join("|")}|`, ...s.table.rows.map((r) => `| ${r.join(" | ")} |`));
    if (s.numbered) lines.push(...s.numbered.map((n, i) => `${i + 1}. ${n}`));
    lines.push("");
  }
  return lines.join("\n");
}

/** The same figures as one flat table: section, label, value, count. */
export function reportCsv(v: View): string {
  const rows: (string | number)[][] = [["period", "scope", "section", "label", "value_percent", "count"]];
  const add = (section: string, label: string, value: number | null, count: number) => rows.push([v.period.label, v.scope, section, label, value === null ? NOT_ENOUGH : value, count]);
  add("headline", "Approved as asked", v.approved.value, v.approved.n);
  add("headline", `Top denial cause: ${v.topCause.label || "none"}`, v.topCause.value, v.topCause.n);
  add("headline", "Advice taken works", v.advice.value, v.advice.n);
  add("headline", "Sent without edits", v.noEdits.value, v.noEdits.n);
  for (const b of v.bars) add("approval by payer", b.label, b.value, b.n);
  if (v.edits) for (const p of v.edits.parts) add("draft edits", `${p.label} (approved ${p.approved}%)`, p.share, v.edits.n);
  else add("draft edits", "All drafts", null, 0);
  if (v.reasons) for (const r of v.reasons.rows) add("denial reasons", `${r.reason} (${r.payer})`, r.share, r.count);
  else add("denial reasons", "All denial reasons", null, 0);
  add("denial outcomes", `Appeals overturned (${v.appeals.overturned} of ${v.appeals.n} rulings)`, v.appeals.value, v.appeals.n);
  rows.push([v.period.label, v.scope, "denial outcomes", `Written off after accepted denials (${money(v.writtenOff.amount)})`, "", v.writtenOff.n]);
  if (v.helps) for (const h of v.helps) add("what helps most", h.label, h.approved, h.applied);
  else add("what helps most", "All steps", null, 0);
  if (v.dismissed) for (const d of v.dismissed) rows.push([v.period.label, v.scope, "dismissed recommendations", d.reason, "", d.count]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Hands the browser a real file. The object URL is released a moment later. */
export function downloadFile(name: string, mime: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
