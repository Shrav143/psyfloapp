import { Building2, CircleHelp, Clock, FileText, Mic, ScanSearch, MessagesSquare, Users, X } from "lucide-react";
import { useState } from "react";
import { useCurrent, tally } from "@/hooks";
import { useStore, type PanelTab } from "@/store";
import AskView from "./views/AskView";
import ClinicView from "./views/ClinicView";
import HistoryView from "./views/HistoryView";
import HomeView from "./views/HomeView";
import Legend from "./views/Legend";
import ScanView from "./views/ScanView";
import ScribeView from "./views/ScribeView";

const TABS: { id: Exclude<PanelTab, "home">; label: string; icon: typeof Mic }[] = [
  { id: "scribe", label: "Scribe", icon: Mic },
  { id: "scan", label: "Scan & Enhance", icon: ScanSearch },
  { id: "history", label: "History", icon: Clock },
  { id: "ask", label: "Ask", icon: MessagesSquare },
  { id: "clinic", label: "Clinic", icon: Building2 },
];

/** The Psyflo extension, docked in the browser. Header, "what am I reading" strip, five labelled tabs, then the view. */
export default function Panel() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const togglePanel = useStore((s) => s.togglePanel);
  const scribe = useStore((s) => s.scribe);
  const [legend, setLegend] = useState(false);
  const { clinic, page, spec, seed, consumer, doc, scan } = useCurrent();
  const open = scan ? tally(scan.findings, scan.status).open : 0;
  const severe = scan ? tally(scan.findings, scan.status).severe : 0;
  const fields = spec ? spec.sections.flatMap((s) => s.fields) : [];
  const locked = fields.filter((f) => f.lock).length;

  return (
    <div className="psy" data-testid="panel">
      <header className="psy-head">
        <button type="button" className="psy-mark" style={{ background: "none", border: 0, color: "#fff", padding: 0 }} onClick={() => setTab("home")} title="Home" aria-label="Psyflo home">
          psyflo<em>.</em>
        </button>
        <div className="ttl">
          <b>Psyflo</b>
          <span><i aria-hidden="true" />Lauris connected · {clinic.profile.short}</span>
        </div>
        <button type="button" className="psy-ibtn" aria-pressed={legend} onClick={() => setLegend((v) => !v)} title="What do the colors and buttons mean?" aria-label="Legend: what do the colors and buttons mean?">
          <CircleHelp size={17} />
        </button>
        <button type="button" className="psy-ibtn" onClick={() => togglePanel(false)} title="Close the panel" aria-label="Close the panel"><X size={17} /></button>
      </header>

      <div className="psy-ctx" data-testid="context">
        <span className="ico" aria-hidden="true">{page.kind === "form" ? <FileText size={15} /> : <Users size={15} />}</span>
        <div className="tx">
          {page.kind === "form" && spec && consumer ? (
            <>
              <div><span className="sub">Reading this page · </span><b>{spec.short}</b> · {consumer.ini}, {consumer.age}</div>
              <div className="sub">{fields.length} fields · Psyflo can type in {fields.length - locked}{locked ? ` · ${locked} are clinician-only` : ""}{doc?.status === "saved" ? " · saved" : ""}</div>
            </>
          ) : page.kind === "consumer" && consumer ? (
            <>
              <div><span className="sub">Reading this page · </span><b>Consumer record</b> · {consumer.ini}, {consumer.age}</div>
              <div className="sub">{consumer.docs.length} document{consumer.docs.length === 1 ? "" : "s"} Psyflo can work on</div>
            </>
          ) : (
            <>
              <div><span className="sub">Reading this page · </span><b>Consumers</b></div>
              <div className="sub">Open a consumer, then a document, to scribe or scan it</div>
            </>
          )}
        </div>
        {seed ? <span className="p-chip neutral">{doc?.status === "saved" ? "Saved" : "Draft"}</span> : null}
      </div>

      <nav className="psy-tabs" role="tablist" aria-label="Psyflo">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} className="psy-tab" onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`} style={{ lineHeight: 1.1 }}>
              <Icon size={17} aria-hidden="true" />
              <span style={{ textAlign: "center" }}>{t.id === "scan" ? <>Scan &amp;<br />Enhance</> : t.label}</span>
              {t.id === "scan" && open > 0 ? <span className={`n${severe ? " sev" : ""}`} aria-label={`${open} to review`}>{open}</span> : null}
              {t.id === "scribe" && ["capturing", "recover", "generating", "review"].includes(scribe.stage) ? <span className="n" aria-label="Session in progress">•</span> : null}
            </button>
          );
        })}
      </nav>

      {legend ? <div className="psy-body" role="region" aria-label="Legend"><Legend /><button type="button" className="p-btn block" onClick={() => setLegend(false)}>Close the legend</button></div> : (
        <div className="psy-view" role="tabpanel" aria-labelledby={tab === "home" ? undefined : `tab-${tab}`} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {tab === "home" ? <HomeView /> : tab === "scribe" ? <ScribeView /> : tab === "scan" ? <ScanView /> : tab === "history" ? <HistoryView /> : tab === "ask" ? <AskView /> : <ClinicView />}
        </div>
      )}
    </div>
  );
}
