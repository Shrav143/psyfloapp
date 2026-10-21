import { fmt, trendLine, type View } from "./model";

const NOT_ENOUGH = "Not enough decisions yet";
const pct = (v: number | null): string => (v === null ? NOT_ENOUGH : `${v}%`);
const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The monthly report as Markdown, built from exactly the figures on screen. */
export function reportMarkdown(v: View, prevLabel: string): string {
  const lines: string[] = [
    "# Psyflo monthly report",
    "",
    `Period: ${v.period.label}`,
    `Scope: ${v.scope}`,
    `Built by Analyst from demo data. A figure based on fewer than 20 decisions is left out.`,
    "",
    "## Headline figures",
    "",
    `- Approved as asked: ${pct(v.approved.value)} (${fmt(v.approved.n)} decisions). ${v.approved.value === null ? "" : trendLine(v.approved.delta, prevLabel)}`.trim(),
    `- Top denial cause: ${v.topCause.value === null ? NOT_ENOUGH : `${v.topCause.value}% of denials, ${v.topCause.label} (${fmt(v.topCause.n)} denials)`}`,
    `- Advice taken works: ${pct(v.advice.value)} approved when applied (${fmt(v.advice.n)} requests)`,
    `- Sent without edits: ${pct(v.noEdits.value)} of agent drafts (${fmt(v.noEdits.n)} drafts)`,
    "",
    "## Approval rate by payer",
    "",
    ...v.bars.map((b) => `- ${b.label}: ${pct(b.value)} (${fmt(b.n)} decisions)`),
    "",
    "## How people edit agent drafts",
    "",
    ...(v.edits ? [...v.edits.parts.map((p) => `- ${p.label}: ${p.share}% of drafts, approved ${p.approved}% of the time`), `- Drafts counted: ${fmt(v.edits.n)}`] : [`- ${NOT_ENOUGH}`]),
    "",
    "## Common denial reasons",
    "",
    ...(v.reasons ? ["| Reason | Payer | Count | Share of denials |", "|---|---|---|---|", ...v.reasons.rows.map((r) => `| ${r.reason} | ${r.payer} | ${r.count} | ${r.share}% |`)] : [`- ${NOT_ENOUGH}`]),
    "",
    "## What helps most",
    "",
    ...(v.helps ? v.helps.map((h, i) => `${i + 1}. ${h.label}. Applied ${fmt(h.applied)} times, ${h.approved}% approved.`) : [`- ${NOT_ENOUGH}`]),
    "",
  ];
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
  if (v.helps) for (const h of v.helps) add("what helps most", h.label, h.approved, h.applied);
  else add("what helps most", "All steps", null, 0);
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
