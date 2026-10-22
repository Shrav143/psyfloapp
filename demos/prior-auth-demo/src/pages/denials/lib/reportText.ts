import { REPORT_FOOTER, REPORT_HEADINGS as H, REPORT_TITLE, type ReportDoc } from "@/lib/pdf/report-doc";

const list = (items: string[]): string[] => [...items.map((c) => `- ${c}`), ""];

/** The whole report as plain text for Copy report: headings in capitals, numbered findings and recommendations. */
export function reportToText(d: ReportDoc): string {
  const sec = (title: string, body: string[]): string[] => [title.toUpperCase(), ...body, ""];
  return [
    REPORT_TITLE.toUpperCase(),
    `${d.id}${d.workedExample ? " (worked example)" : ""} · ${d.facts[1][1]} · ${d.payerName}`,
    REPORT_FOOTER,
    "",
    ...d.facts.map(([k, v]) => `${k}: ${v}`),
    `Our read: ${d.verdict.word}. ${d.verdict.line}`,
    ...d.chances.map(([k, v]) => `${k}: ${v}`),
    ...(d.chanceNote ? [d.chanceNote] : []),
    "",
    ...sec(H.reasoning, [`"${d.reasoning.quote}"`, `Where it parts from the chart: ${d.reasoning.gap}`]),
    ...sec(H.synthesis, d.synthesis.flatMap((p) => [p, ""]).slice(0, -1)),
    ...sec(H.weak, d.findings.flatMap((f) => [`${f.n}. [${f.sev}] ${f.title}`, f.text, `Source: ${f.source}. ${f.excerpt}`, `Suggested fix: ${f.fix} (${f.added ? "added to the evidence" : "not added yet"})`, ""]).slice(0, -1)),
    ...(d.dims.length ? sec(H.dims, [...(d.dimsSub ? [d.dimsSub, ""] : []), ...d.dims.flatMap((x) => [`${x.name} (${x.toneWord})`, x.text, ""]).slice(0, -1)]) : []),
    ...sec(H.todo, d.recommendations.flatMap((r, i) => [`${i + 1}. ${r.title}`, r.text, ""]).slice(0, -1)),
    ...sec(H.options, d.options.flatMap((o) => [`${o.title}${o.recommended ? " (recommended)" : ""}`, `  Chance: ${o.chance}`, `  Time: ${o.time}`, `  Gets back: ${o.gain}`, `  Needs: ${o.needs.join("; ")}`])),
    ...sec(H.criteria, list(d.criteria).slice(0, -1)),
    ...sec(H.documents, [...list(d.documents), "Fixes from the findings:", ...d.fixes.map((x) => `- [${x.added ? "x" : " "}] ${x.text} (${x.source})`)]),
    ...sec(H.pushback, d.pushback.flatMap(([q, a]) => [q, `  ${a}`])),
    ...sec(H.ask, [d.ask]),
    ...sec(H.outlook, [d.outlook]),
    ...sec(H.timeline, d.timeline.map(([k, v]) => `${k}: ${v}`)),
    ...sec(H.method, [...d.agents.map((a) => `${a.name}: ${a.text}`), ...d.method]),
  ].join("\n").trimEnd();
}
