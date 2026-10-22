import { DX_GROUPS, DX_LABEL, MONTHS } from "@/data/decisions";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import type { Board } from "./board";
import { NOT_ENOUGH, CMS_NOTE } from "./copy";
import { fmt, pctOf, ptsText } from "./stats";

/* The monthly report: the same figures, charts-as-tables and lists the page shows, written out as one document, as Markdown, and as one flat CSV.
   It is built from the Board, so a number in the report is the number on the page. */

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const pct = (v: number | null): string => (v === null ? NOT_ENOUGH : `${v}%`);

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
export interface ReportInput {
  board: Board;
  /** "Both sites", "Site A" or "Site B". */
  siteLabel: string;
  /** "both", "a" or "b": for the file name. */
  siteKey: string;
  dismissed: { reason: string; count: number }[] | null;
  workload: { handled: number; open: number };
}

const scopeWords = (b: Board): { payer: string; program: string; dx: string } => ({
  payer: b.filters.payer === "all" ? "All payers" : payerById(b.filters.payer).name,
  program: b.filters.program === "all" ? "All programs" : PROGRAM_LABEL[b.filters.program],
  dx: b.filters.dx === "all" ? "All diagnosis groups" : DX_LABEL[b.filters.dx],
});

export function reportDoc(r: ReportInput): ReportDoc {
  const b = r.board;
  const w = scopeWords(b);
  const [approval, denial, firstPass, time, prevent, appeals] = b.figures;
  const change = (f: (typeof b.figures)[number]): string => (f.change ? ` ${f.change.text}.` : "");
  const s = b.s;
  const flo = b.flo;
  const sections: ReportSection[] = [
    {
      title: "Headline figures",
      bullets: [
        `Approval rate: ${approval.raw === null ? NOT_ENOUGH : `${approval.value} approved as requested (${approval.sub}).${change(approval)}`}`,
        `Denial rate: ${denial.raw === null ? NOT_ENOUGH : `${denial.value} (${fmt(s.notApproved)} denials of ${fmt(s.n)} decisions, ${fmt(s.accepted)} accepted).${change(denial)}`}`,
        `First-pass approval: ${firstPass.raw === null ? NOT_ENOUGH : `${firstPass.value} approved as requested with no information request (${fmt(s.firstPass)} of ${fmt(s.n)}).${change(firstPass)}`}`,
        `Average decision time: ${time.raw === null ? NOT_ENOUGH : `${time.value} from sent to decision (demo values). ${time.sub}.${change(time)}`}`,
        `Preventable denials: ${prevent.raw === null ? NOT_ENOUGH : `${prevent.value}, ${prevent.sub} (fixable before sending).${change(prevent)}`}`,
        `Appeals overturned: ${appeals.raw === null ? NOT_ENOUGH : `${appeals.value} (${fmt(s.overturned)} of ${fmt(s.rulings)} rulings, partly restored counts as overturned). ${fmt(s.accepted)} denials accepted.${change(appeals)}`}`,
        `Top denial cause: ${b.topCause ? `${b.topCause.share}% of denials, ${b.topCause.label} at ${payerById(b.topCause.payer).shortName} (${fmt(b.topCause.count)} denials)` : NOT_ENOUGH}`,
        `Advice taken works: ${pct(flo.advice.pct)} approved in full or in part when applied (${fmt(flo.advice.n)} requests)`,
        `Sent without edits: ${pct(flo.noEdits)} of agent drafts (${fmt(flo.drafts.n)} drafts)`,
      ],
    },
    {
      title: "Approvals and denials by month",
      table: {
        head: ["Month", "Decisions", "Approved as requested", "Approved in part", "Denied", "Approval rate", "Denial rate"],
        rows: b.months.map((m) => [m.month.range, fmt(m.s.n), fmt(m.s.approved), fmt(m.s.partial), fmt(m.s.denied), m.s.n ? `${pctOf(m.s.approved, m.s.n)}%` : "-", m.s.n ? `${pctOf(m.s.notApproved, m.s.n)}%` : "-"]),
      },
    },
    {
      title: "Payer scorecard",
      table: {
        head: ["Payer", "Decisions", "Approval rate", "Denial rate", "Approved in part", "Average days", "Past CMS time", "Information requests", "Appeals overturned", "Trend"],
        rows: b.score.map((p) => [p.name, fmt(p.s.n), p.approval === null ? "-" : `${p.approval}%`, p.denial === null ? "-" : `${p.denial}%`, fmt(p.partial), p.days === null ? "-" : p.days.toFixed(1), p.cms ? (p.pastCms === null ? "-" : `${p.pastCms}%`) : "n/a", fmt(p.info), p.overturn === null ? "-" : `${p.overturn}% (${p.s.overturned} of ${p.s.rulings})`, ptsText(p.trend)]),
      },
    },
    {
      title: "Payer by diagnosis group (approved as requested)",
      table: {
        head: ["Payer", ...DX_GROUPS.map((d) => d.label), "All cases"],
        rows: b.matrices.dx.rows.map((row) => [row.label, ...[...row.cells, row.total].map((c) => (c.n === 0 ? "none" : `${c.rate}% of ${c.n}`))]),
      },
    },
    b.reasons.total
      ? { title: "Denial reasons", table: { head: ["Reason", "Denials", "Share of denials", "Running share", "Preventable"], rows: b.reasons.rows.map((x) => [x.label, String(x.count), `${x.share}%`, `${x.cum}%`, x.preventable ? "Yes" : "No"]) } }
      : { title: "Denial reasons", bullets: [NOT_ENOUGH] },
    {
      title: "Length of stay and units",
      table: {
        head: ["Payer", "Approvals", "Cut", "Requested (average)", "Approved (average)", "Share of requested approved"],
        rows: b.los.filter((l) => l.program === "all" && l.n > 0).map((l) => [payerById(l.payer).name, fmt(l.n), fmt(l.cuts), l.requested === null ? "-" : String(l.requested), l.approved === null ? "-" : String(l.approved), l.pct === null ? "-" : `${l.pct}%`]),
      },
    },
    {
      title: "Process health",
      bullets: [
        `Retro-authorizations: ${fmt(b.process.retro.n)} of ${fmt(s.n)} decisions (${pctOf(b.process.retro.n, s.n) ?? "-"}%) ${b.period.phrase}. By month: ${b.process.retroCount.map((n, i) => `${MONTHS[i].label} ${n}`).join(", ")}.`,
        `Referral to authorization, average days by month: ${b.process.referral.map((x, i) => `${MONTHS[i].label} ${x.avg ?? "-"}`).join(", ")}.`,
        `Peer-to-peer calls: ${b.process.calls.changed} changed the decision, ${b.process.calls.stood} did not, ${b.process.calls.scheduled} booked and not held yet.`,
        `Appeals: ${b.process.appeals.overturned} overturned, ${b.process.appeals.partly} partly restored, ${b.process.appeals.upheld} upheld, ${b.process.appeals.pending} with no ruling yet.`,
        `Workload on the Dashboard right now: ${r.workload.handled} handled, ${r.workload.open} still open (live; it does not follow the period).`,
      ],
    },
    ...(b.sites
      ? [
          {
            title: "Site A and Site B",
            table: {
              head: ["Figure", "Site A", "Site B", "Both sites"],
              rows: (
                [
                  ["Decisions", (x: typeof s) => fmt(x.n)],
                  ["Approved as requested", (x: typeof s) => `${pctOf(x.approved, x.n) ?? "-"}% (${fmt(x.approved)})`],
                  ["Denied or cut back", (x: typeof s) => `${pctOf(x.notApproved, x.n) ?? "-"}% (${fmt(x.notApproved)})`],
                  ["First-pass approval", (x: typeof s) => `${pctOf(x.firstPass, x.n) ?? "-"}% (${fmt(x.firstPass)})`],
                  ["Average decision time, days", (x: typeof s) => (x.n ? (x.hours / x.n / 24).toFixed(1) : "-")],
                  ["Preventable denials", (x: typeof s) => fmt(x.preventable)],
                  ["Appeals overturned", (x: typeof s) => (x.rulings ? `${pctOf(x.overturned, x.rulings)}% (${x.overturned} of ${x.rulings})` : "-")],
                ] as [string, (x: typeof s) => string][]
              ).map(([label, f]) => [label, f(b.sites?.A as typeof s), f(b.sites?.B as typeof s), f(b.sites?.all as typeof s)]),
            },
          } as ReportSection,
        ]
      : []),
    { title: "How people edit agent drafts", bullets: flo.drafts.n >= 20 ? [`Sent as written: ${pctOf(flo.drafts.written, flo.drafts.n)}% of drafts, approved ${flo.drafts.approvedBy[0] ?? "-"}% of the time`, `Light edits: ${pctOf(flo.drafts.light, flo.drafts.n)}%, approved ${flo.drafts.approvedBy[1] ?? "-"}%`, `Rewritten: ${pctOf(flo.drafts.rewritten, flo.drafts.n)}%, approved ${flo.drafts.approvedBy[2] ?? "-"}%`, `Drafts counted: ${fmt(flo.drafts.n)}`] : [NOT_ENOUGH] },
    { title: "Denial outcomes", bullets: [`Appeals overturned: ${pct(s.rulings >= 20 ? pctOf(s.overturned, s.rulings) : null)} (${fmt(s.overturned)} of ${fmt(s.rulings)} rulings, partly restored counts as overturned)`, `Denials accepted: ${fmt(s.accepted)}`] },
    flo.helps.length ? { title: "What helps most", numbered: flo.helps.slice(0, 4).map((h) => `${h.label}. Applied ${fmt(h.applied)} times, ${h.pct}% approved.`) } : { title: "What helps most", bullets: [NOT_ENOUGH] },
  ];
  if (r.dismissed) sections.push({ title: "Why recommendations were dismissed", bullets: r.dismissed.map((d) => `${d.reason}: ${d.count} ${d.count === 1 ? "time" : "times"}`) });
  return {
    title: "Psyflo monthly report",
    meta: [`Period: ${b.period.label}`, `Site view: ${r.siteLabel}`, `Payer: ${w.payer}`, `Program: ${w.program}`, `Diagnosis group: ${w.dx}`, `Built by Analyst from demo data. Demo values: this is sample data. A figure based on fewer than 20 decisions is left out. ${CMS_NOTE}`],
    sections,
  };
}

/** The monthly report as Markdown, built from exactly the figures on screen. */
export function reportMarkdown(r: ReportInput): string {
  const doc = reportDoc(r);
  const lines: string[] = [`# ${doc.title}`, "", ...doc.meta, ""];
  for (const s of doc.sections) {
    lines.push(`## ${s.title}`, "");
    if (s.bullets) lines.push(...s.bullets.map((x) => `- ${x}`));
    if (s.table) lines.push(`| ${s.table.head.join(" | ")} |`, `|${s.table.head.map(() => "---").join("|")}|`, ...s.table.rows.map((row) => `| ${row.join(" | ")} |`));
    if (s.numbered) lines.push(...s.numbered.map((n, i) => `${i + 1}. ${n}`));
    lines.push("");
  }
  return lines.join("\n");
}

/** The same figures as one flat table: period, site view, payer, program, diagnosis, section, label, value, count, unit. */
export function reportCsv(r: ReportInput): string {
  const b = r.board;
  const w = scopeWords(b);
  const out: (string | number)[][] = [["period", "site_view", "payer", "program", "diagnosis", "section", "label", "value", "count", "unit"]];
  const row = (section: string, label: string, value: number | string, count: number | string, unit: string) => out.push([b.period.label, r.siteLabel, w.payer, w.program, w.dx, section, label, value, count, unit]);
  const add = (section: string, label: string, value: number | null, count: number, unit = "percent") => row(section, label, value === null ? NOT_ENOUGH : value, count, unit);
  const s = b.s;
  const [approval, denial, firstPass, time, prevent, appeals] = b.figures;
  add("headline", "Approval rate (approved as requested)", approval.raw, s.n);
  add("headline", "Denial rate", denial.raw, s.n);
  row("headline", "Denials", s.notApproved, s.notApproved, "count");
  add("headline", "First-pass approval", firstPass.raw, s.n);
  row("headline", "Average decision time, days (demo values)", time.raw === null ? NOT_ENOUGH : time.raw.toFixed(1), s.n, "days");
  add("headline", "Past the CMS decision time (Medicaid managed care plans)", s.cmsN >= 20 ? pctOf(s.pastCms, s.cmsN) : null, s.cmsN);
  add("headline", "Preventable denials (share of denials)", prevent.raw === null ? null : pctOf(s.preventable, s.notApproved), s.preventable);
  add("headline", "Appeals overturned", appeals.raw, s.rulings);
  row("headline", "Denials accepted", s.accepted, s.accepted, "count");
  add("headline", `Top denial cause: ${b.topCause?.label ?? "none"}`, b.topCause?.share ?? null, b.topCause?.count ?? 0);
  add("headline", "Advice taken works", b.flo.advice.pct, b.flo.advice.n);
  add("headline", "Sent without edits", b.flo.noEdits, b.flo.drafts.n);
  for (const m of b.months) {
    add("trend", `${m.month.range}: approval rate`, m.s.n ? pctOf(m.s.approved, m.s.n) : null, m.s.n);
    add("trend", `${m.month.range}: denial rate`, m.s.n ? pctOf(m.s.notApproved, m.s.n) : null, m.s.n);
  }
  for (const p of b.score) {
    add("payer scorecard", `${p.name}: approval rate`, p.approval, p.s.n);
    add("payer scorecard", `${p.name}: denial rate`, p.denial, p.s.n);
    row("payer scorecard", `${p.name}: approved in part`, p.partial, p.partial, "count");
    row("payer scorecard", `${p.name}: average days`, p.days === null ? NOT_ENOUGH : p.days.toFixed(1), p.s.n, "days");
    add("payer scorecard", `${p.name}: past the CMS time`, p.cms ? p.pastCms : null, p.s.cmsN);
    row("payer scorecard", `${p.name}: information requests`, p.info, p.info, "count");
    add("payer scorecard", `${p.name}: appeals overturned`, p.overturn, p.s.rulings);
  }
  for (const mx of ["dx", "program", "kind", "population"] as const) {
    const m = b.matrices[mx];
    for (const pr of m.rows) pr.cells.forEach((c, i) => add(`payer by ${m.title.toLowerCase()}`, `${pr.label}: ${m.cols[i].label}`, c.rate, c.n));
  }
  for (const x of b.reasons.rows) add("denial reasons", `${x.label}${x.preventable ? " (preventable)" : ""}`, x.share, x.count);
  for (const l of b.los.filter((x) => x.program === "all" && x.n > 0)) add("length of stay", `${payerById(l.payer).name}: share of requested days or units approved`, l.pct, l.n);
  b.process.months.forEach((m, i) => {
    row("process health", `${m.month.range}: retrospective requests`, b.process.retroCount[i], b.process.retroCount[i], "count");
    row("process health", `${m.month.range}: days from referral to authorization`, b.process.referral[i].avg ?? "", b.process.referral[i].n, "days");
  });
  row("process health", "Workload handled (Dashboard, live)", r.workload.handled, r.workload.handled, "count");
  row("process health", "Workload still open (Dashboard, live)", r.workload.open, r.workload.open, "count");
  if (b.sites) {
    for (const [name, x] of [["Site A", b.sites.A], ["Site B", b.sites.B], ["Both sites", b.sites.all]] as const) {
      row("sites", `${name}: decisions`, x.n, x.n, "count");
      add("sites", `${name}: approval rate`, pctOf(x.approved, x.n), x.n);
      add("sites", `${name}: denial rate`, pctOf(x.notApproved, x.n), x.n);
      add("sites", `${name}: first-pass approval`, pctOf(x.firstPass, x.n), x.n);
      row("sites", `${name}: preventable denials`, x.preventable, x.preventable, "count");
    }
  }
  if (b.flo.drafts.n >= 20) for (const [label, n] of [["Sent as written", b.flo.drafts.written], ["Light edits", b.flo.drafts.light], ["Rewritten", b.flo.drafts.rewritten]] as const) add("draft edits", label, pctOf(n, b.flo.drafts.n), b.flo.drafts.n);
  for (const h of b.flo.helps.slice(0, 4)) add("what helps most", h.label, h.pct, h.applied);
  if (r.dismissed) for (const d of r.dismissed) row("dismissed recommendations", d.reason, "", d.count, "count");
  return out.map((x) => x.map(csvCell).join(",")).join("\n");
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
