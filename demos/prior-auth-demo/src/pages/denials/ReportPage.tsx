import { useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, FileDown, Printer, RefreshCw, SearchX } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Crumbs, EmptyState, Page } from "@/components/ui";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { blockedInHosted } from "@/lib/hosted";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { buildReport } from "./lib/report";
import { reportToText } from "./lib/reportText";
import { useCopy } from "./lib/useCopy";
import { useDenialView } from "./lib/useDenialView";
import { useOutOfSite } from "./lib/useOutOfSite";
import { ReportGenerating } from "./ReportGenerating";
import { ReportView } from "./ReportView";

/* On paper only the report is printed: the sidebar, top bar and buttons are hidden, each major section starts a sheet, and a heading never ends a page. */
const PRINT_CSS = `@media print {
  aside, .sticky { display: none !important; }
  body { background: #fff; }
  #psy-main { padding: 0 !important; max-width: none !important; }
  .psy-report { border: 0 !important; border-radius: 0 !important; padding: 0 !important; max-width: none !important; font-size: 10.5pt; }
  .psy-report h2 { break-after: avoid; }
  .psy-report [data-break="page"] { break-before: page; }
  .psy-report p, .psy-report li { orphans: 3; widows: 3; }
  @page { margin: 0.7in; }
}`;

/** The appeal analysis report for any denial: generated on first open, then copied, saved as a PDF or printed. */
export default function ReportPage() {
  const { id } = useParams();
  const view = useDenialView(id);
  const outside = useOutOfSite(id);
  const reportAt = useStore((s) => (id ? s.denialReportAt[id] : undefined));
  const markReport = useStore((s) => s.markReport);
  const clearReport = useStore((s) => s.clearReport);
  const toast = useStore((s) => s.toast);
  const { state, copy } = useCopy();
  const [saving, setSaving] = useState(false);
  const doc = useMemo(() => (view ? buildReport(view, reportAt) : undefined), [view, reportAt]);

  if (outside) return <Page><OutOfSite id={outside.caseId} what="report" /></Page>;
  if (!view || !doc || !id)
    return (
      <Page>
        <Crumbs items={[{ label: "Denial Intelligence", to: paths.denials() }, { label: "Appeal analysis report" }]} />
        <Card><EmptyState icon={SearchX} title="We could not find that denial" action={<Link to={paths.denials()} className="font-semibold text-forest hover:underline">Back to Denial Intelligence</Link>}>It may have been closed or the address is wrong.</EmptyState></Card>
      </Page>
    );

  const crumbs = [{ label: "Denial Intelligence", to: paths.denials() }, { label: view.req.id, to: paths.denials(id) }, { label: "Appeal analysis report" }];
  if (reportAt === undefined)
    return (
      <Page>
        <div className="print:hidden"><Crumbs items={crumbs} /></div>
        <ReportGenerating key={id} view={view} onDone={() => markReport(id)} />
      </Page>
    );

  const copyReport = async () => {
    await copy(reportToText(doc));
  };
  const download = async () => {
    if (blockedInHosted("Download PDF")) return;
    setSaving(true);
    try {
      const { downloadAppealReport } = await import("@/lib/pdf/appeal-report");
      await downloadAppealReport(doc);
      toast({ title: "PDF downloaded", body: `${doc.fileName} has the whole report.`, tone: "good" });
    } catch {
      toast({ title: "Could not make the PDF", body: "Copy the report instead and paste it into a document.", tone: "mid" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <style>{PRINT_CSS}</style>
      <div className="print:hidden"><Crumbs items={crumbs} /></div>
      <div className="mx-auto flex w-full max-w-[860px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={paths.denials(id)} className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline"><ArrowLeft size={16} className="ico" />Back to the denial</Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <span aria-live="polite"><Button icon={state === "copied" ? Check : Copy} onClick={copyReport}>{state === "copied" ? "Copied" : "Copy report"}</Button></span>
          <Button icon={FileDown} variant="primary" loading={saving} onClick={download}>Download PDF</Button>
          <Button icon={Printer} onClick={() => { if (!blockedInHosted("Print")) window.print(); }}>Print</Button>
          <Button icon={RefreshCw} onClick={() => clearReport(id)}>Regenerate</Button>
        </div>
      </div>
      {state === "failed" ? <p role="status" className="mx-auto w-full max-w-[860px] text-[13.5px] text-mid-ink print:hidden">Select the text and press Ctrl or Cmd C</p> : null}
      <ReportView doc={doc} />
    </Page>
  );
}
