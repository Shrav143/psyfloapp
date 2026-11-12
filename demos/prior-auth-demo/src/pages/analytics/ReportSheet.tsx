import { createPortal } from "react-dom";
import type { ReportDoc } from "./report";

/* The report as a plain page for the printer. It sits beside the app, never inside it, and shows only when printing:
   the app (#root) is hidden for the printer, so the person gets the report and not the sidebar and the page behind the window. */
const PRINT_CSS = `
.report-sheet { display: none; }
@media print {
  @page { margin: 16mm; }
  body { background: #fff; }
  #root { display: none !important; }
  .report-sheet { display: block; color: #151b24; font-size: 12.5px; line-height: 1.5; }
  .report-sheet h1 { font-size: 26px; line-height: 1.2; margin: 0 0 6px; }
  .report-sheet h2 { font-size: 16px; margin: 18px 0 6px; break-after: avoid; }
  .report-sheet p { margin: 0; color: #474e5a; }
  .report-sheet section { break-inside: avoid; }
  .report-sheet ul, .report-sheet ol { margin: 0; padding-left: 18px; }
  .report-sheet li { margin: 0 0 3px; }
  .report-sheet table { width: 100%; border-collapse: collapse; }
  .report-sheet th, .report-sheet td { padding: 4px 10px 4px 0; border-bottom: 1px solid #dcdad4; text-align: left; vertical-align: top; }
  .report-sheet th { font-weight: 600; }
}`;

export function ReportSheet({ doc }: { doc: ReportDoc }) {
  return createPortal(
    <>
      <style>{PRINT_CSS}</style>
      <div className="report-sheet">
        <h1 className="font-serif font-semibold">{doc.title}</h1>
        {doc.meta.map((m) => (
          <p key={m}>{m}</p>
        ))}
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-serif font-semibold">{s.title}</h2>
            {s.bullets ? (
              <ul className="list-disc">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
            {s.table ? (
              <table>
                <thead>
                  <tr>
                    {s.table.head.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r) => (
                    <tr key={r.join("|")}>
                      {r.map((c, i) => (
                        <td key={i}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {s.numbered ? (
              <ol className="list-decimal">
                {s.numbered.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}
      </div>
    </>,
    document.body,
  );
}
