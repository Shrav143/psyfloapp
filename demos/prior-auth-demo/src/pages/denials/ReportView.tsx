import type { ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { REPORT_FOOTER, REPORT_HEADINGS as H, REPORT_TITLE, type ReportDoc, type ReportTone } from "@/lib/pdf/report-doc";

const DOT: Record<ReportTone, string> = { good: "bg-good", mid: "bg-mid", risk: "bg-risk", neutral: "bg-faint" };
const READ: Record<ReportTone, string> = { good: "bg-good-bg text-good-ink", mid: "bg-mid-bg text-mid-ink", risk: "bg-risk-bg text-risk-ink", neutral: "bg-neutral-bg text-neutral-ink" };

/** `page` starts the section on a new sheet when the report is printed: the plan of action begins on a fresh page. */
function Section({ title, page, children }: { title: string; page?: boolean; children: ReactNode }) {
  return (
    <section data-break={page ? "page" : undefined} className="mt-10 first:mt-0">
      <h2 className="mb-4 border-b border-line pb-2 font-serif text-[23px] font-semibold leading-tight">{title}</h2>
      {children}
    </section>
  );
}

const Num = ({ n }: { n: number }) => <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-bg text-[13px] font-semibold" aria-hidden="true">{n}</span>;
const Facts = ({ rows, cols = 1, labelW = 150 }: { rows: [string, string][]; cols?: 1 | 2; labelW?: number }) => (
  <dl className={cn("grid gap-x-8 gap-y-2.5", cols === 2 ? "grid-cols-2" : "grid-cols-1")}>
    {rows.map(([k, v]) => (
      <div key={k} style={{ gridTemplateColumns: `${labelW}px 1fr` }} className="grid gap-3 print:break-inside-avoid">
        <dt className="text-muted">{k}</dt>
        <dd className="font-medium">{v}</dd>
      </div>
    ))}
  </dl>
);

function Title({ doc }: { doc: ReportDoc }) {
  return (
    <header>
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <div className="text-[11.5px] font-medium tracking-[0.1em] text-muted uppercase">Psyflo · Denial Intelligence</div>
          <h1 className="mt-1 font-serif text-[34px] leading-[1.1] font-semibold tracking-tight">
            {REPORT_TITLE}
            {doc.workedExample ? <Pill className="ml-3 align-middle font-sans tracking-normal">Worked example</Pill> : null}
          </h1>
          <p className="mt-1.5 text-[15px] text-muted">{doc.id} · {doc.facts[1][1]} · {doc.payerName}</p>
        </div>
        <div className={cn("flex w-[250px] shrink-0 flex-col gap-0.5 rounded-2xl px-[18px] py-3.5", READ[doc.verdict.tone])}>
          <span className="text-[11.5px] font-semibold tracking-[0.1em] uppercase">Our read</span>
          <b className="font-serif text-[21px] leading-tight">{doc.verdict.word}</b>
          <span className="text-sm">{doc.verdict.line}</span>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-tile-edge bg-tile px-6 py-5">
        <Facts rows={doc.facts} cols={2} labelW={104} />
        <div className="mt-4 border-t border-tile-edge pt-4">
          <Facts rows={doc.chances} labelW={230} />
          {doc.chanceNote ? <p className="mt-2.5 text-[13.5px] text-mid-ink">{doc.chanceNote}</p> : null}
        </div>
      </div>
    </header>
  );
}

function Findings({ doc }: { doc: ReportDoc }) {
  return (
    <div className="flex flex-col gap-4">
      {doc.findings.map((f) => (
        <div key={f.n} className="rounded-2xl border border-tile-edge bg-tile px-5 py-4 print:break-inside-avoid">
          <div className="flex items-start gap-3">
            <Num n={f.n} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5"><Pill tone={f.sev === "Critical" ? "risk" : "mid"}>{f.sev}</Pill><b className="leading-snug">{f.title}</b></div>
              <p className="mt-2 leading-[1.7]">{f.text}</p>
              <div className="mt-3 text-[13px] font-semibold text-neutral-ink">Source: {f.source}</div>
              <blockquote className="mt-1 rounded-r-xl border-l-[3px] border-field bg-white px-4 py-2.5 font-serif text-[14.5px] leading-[1.6] text-ink2 italic">{f.excerpt}</blockquote>
              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[13.5px]">
                <span><b>Suggested fix:</b> {f.fix}</span>
                <Pill tone={f.added ? "good" : "neutral"}>{f.added ? "Added to the evidence" : "Not added yet"}</Pill>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Options({ doc }: { doc: ReportDoc }) {
  const th = "border-b border-line px-3 py-2.5 text-left text-[11.5px] font-medium tracking-[0.09em] text-muted uppercase";
  const td = "border-b border-line px-3 py-3 align-top";
  return (
    <table className="w-full border-collapse text-[13.5px]">
      <thead>
        <tr><th scope="col" className={th}>Option</th><th scope="col" className={th}>Chance</th><th scope="col" className={th}>Time</th><th scope="col" className={th}>Gets back</th><th scope="col" className={th}>Needs</th></tr>
      </thead>
      <tbody>
        {doc.options.map((o) => (
          <tr key={o.title} className="print:break-inside-avoid">
            <th scope="row" className={cn(td, "text-left font-semibold")}>{o.title}{o.recommended ? <div className="mt-1"><Pill tone="good">Recommended</Pill></div> : null}</th>
            <td className={td}>{o.chance}</td>
            <td className={td}>{o.time}</td>
            <td className={td}>{o.gain}</td>
            <td className={td}><ul className="list-disc pl-4">{o.needs.map((n) => <li key={n}>{n}</li>)}</ul></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The report as a page: the same words as Copy report and the PDF, laid out for the screen and, with the print rules on the page, for paper. */
export function ReportView({ doc }: { doc: ReportDoc }) {
  return (
    <article className="psy-report mx-auto w-full max-w-[860px] rounded-[20px] border border-edge bg-white px-11 py-10 text-[15px]">
      <Title doc={doc} />
      <div className="mt-10">
        <Section title={H.reasoning}>
          <blockquote className="rounded-r-xl border-l-[3px] border-risk bg-risk-bg px-5 py-3.5 text-risk-ink">{doc.reasoning.quote}</blockquote>
          <p className="mt-3 leading-[1.7]"><b>Where it parts from the chart:</b> {doc.reasoning.gap}</p>
        </Section>
        <Section title={H.synthesis}>
          {doc.synthesis.map((p) => <p key={p} className="mb-3 leading-[1.7] last:mb-0">{p}</p>)}
        </Section>
        <Section title={H.weak}>
          <Findings doc={doc} />
        </Section>
        {doc.dims.length ? (
          <Section title={H.dims}>
            {doc.dimsSub ? <p className="-mt-2 mb-4 text-[13.5px] text-muted">{doc.dimsSub}</p> : null}
            <div className="flex flex-col gap-4">
              {doc.dims.map((d) => (
                <div key={d.name} className="print:break-inside-avoid">
                  <div className="flex items-center gap-2.5"><span className={cn("h-[10px] w-[10px] rounded-full", DOT[d.tone])} aria-hidden="true" /><b>{d.name}</b><span className="text-[13px] text-muted">{d.toneWord}</span></div>
                  <p className="mt-1 leading-[1.7]">{d.text}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}
        <Section title={H.todo} page>
          <ol className="flex flex-col gap-4">
            {doc.recommendations.map((r, i) => (
              <li key={r.title} className="flex gap-3.5 print:break-inside-avoid">
                <Num n={i + 1} />
                <div className="min-w-0 flex-1"><b className="leading-snug">{r.title}</b><p className="mt-1 leading-[1.7]">{r.text}</p></div>
              </li>
            ))}
          </ol>
        </Section>
        <Section title={H.options}><Options doc={doc} /></Section>
        <Section title={H.criteria}><ul className="list-disc pl-5 leading-[1.7]">{doc.criteria.map((c) => <li key={c}>{c}</li>)}</ul></Section>
        <Section title={H.documents}>
          <ul className="list-disc pl-5 leading-[1.7]">{doc.documents.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="mt-4 text-[13px] font-semibold text-neutral-ink">Fixes from the findings</div>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {doc.fixes.map((x) => (
              <li key={x.text} className="flex items-start gap-2 print:break-inside-avoid">
                {x.added ? <CheckCircle2 size={17} className="ico mt-[3px] text-good" aria-hidden="true" /> : <Circle size={17} className="ico mt-[3px] text-faint" aria-hidden="true" />}
                <span>{x.text} <span className="text-muted">({x.source})</span> <span className="sr-only">{x.added ? "Added to the evidence" : "Not added yet"}</span></span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title={H.pushback}>
          <div className="flex flex-col gap-3.5">{doc.pushback.map(([q, a]) => <div key={q} className="print:break-inside-avoid"><div className="font-semibold">{q}</div><p className="mt-0.5 leading-[1.7] text-ink2">{a}</p></div>)}</div>
        </Section>
        <Section title={H.ask}><p className="rounded-2xl bg-good-bg px-5 py-3.5 leading-[1.7] text-good-ink">{doc.ask}</p></Section>
        <Section title={H.outlook}><p className="leading-[1.7]">{doc.outlook}</p></Section>
        <Section title={H.timeline}><Facts rows={doc.timeline} labelW={190} /></Section>
        <Section title={H.method}>
          <ul className="flex flex-col gap-2">{doc.agents.map((a) => <li key={a.name}><b>{a.name}</b> {a.text.charAt(0).toLowerCase() + a.text.slice(1)}</li>)}</ul>
          <ul className="mt-3 list-disc pl-5 leading-[1.7]">{doc.method.map((m) => <li key={m}>{m}</li>)}</ul>
        </Section>
      </div>
      <footer className="mt-10 border-t border-line pt-4 text-[12.5px] text-muted">{REPORT_FOOTER}. Generated {doc.generatedOn}.</footer>
    </article>
  );
}
