import { CircleHelp, FileText, List, Mic, Pin, PinOff, ScanSearch, User, Users, X } from "lucide-react";
import { useCurrent, tally } from "@/hooks";
import { useStore, type PanelTab } from "@/store";
import HelpView from "./views/HelpView";
import HistoryView from "./views/HistoryView";
import PatientsView from "./views/PatientsView";
import ScanView from "./views/ScanView";
import ScribeView from "./views/ScribeView";
import SettingsView from "./views/SettingsView";
import "./panel-nav.css";

/** The six icons under the title, in this order. Icons only, as in the tool this was studied from, but each has a name on hover and focus and its screen starts with a title. */
const ICONS: { id: PanelTab; label: string; tip: string; icon: typeof Mic; accent?: boolean }[] = [
  { id: "scribe", label: "Scribe", tip: "Scribe: record a visit or dictate a note", icon: Mic },
  { id: "history", label: "History", tip: "History: your documents and sessions", icon: List },
  { id: "patients", label: "Patients", tip: "Patients: your roster", icon: Users },
  { id: "scan", label: "Scan & Enhance", tip: "Scan & Enhance: check a saved document and get fixes", icon: ScanSearch, accent: true },
  { id: "help", label: "Help", tip: "Help: chat with Psyflo, FAQs, training videos", icon: CircleHelp },
  { id: "settings", label: "Settings", tip: "Settings: recording and check before save", icon: User },
];

/** The Psyflo extension, docked in the browser: title, pin and close; a row of six icons; "what am I reading"; then the screen the icon opens. */
export default function Panel() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const togglePanel = useStore((s) => s.togglePanel);
  const pinned = useStore((s) => s.pinned);
  const setPinned = useStore((s) => s.setPinned);
  const scribe = useStore((s) => s.scribe);
  const { clinic, page, spec, seed, consumer, doc, scan } = useCurrent();
  const t = scan ? tally(scan.findings, scan.status) : null;
  const fields = spec ? spec.sections.flatMap((s) => s.fields) : [];
  const locked = fields.filter((f) => f.lock).length;
  const recording = ["capturing", "recover", "generating", "review"].includes(scribe.stage);

  return (
    <div className="psy" data-testid="panel">
      <header className="psy-head">
        <span className="psy-mark" aria-hidden="true">psyflo<em>.</em></span>
        <div className="ttl">
          <b>Psyflo</b>
          <span><i aria-hidden="true" />Lauris connected · {clinic.profile.short}</span>
        </div>
        <button type="button" className="psy-ibtn" aria-pressed={pinned} data-tip={pinned ? "Pinned: the panel stays open as you move between pages" : "Not pinned"} aria-label={pinned ? "Unpin the panel" : "Pin the panel"} data-testid="pin" onClick={() => setPinned(!pinned)}>
          {pinned ? <Pin size={16} /> : <PinOff size={16} />}
        </button>
        <button type="button" className="psy-ibtn" data-tip="Close the panel" aria-label="Close the panel" onClick={() => togglePanel(false)}><X size={17} /></button>
      </header>

      <nav className="psy-icons" role="tablist" aria-label="Psyflo screens">
        {ICONS.map((i) => {
          const Icon = i.icon;
          return (
            <button key={i.id} type="button" role="tab" id={`tab-${i.id}`} aria-selected={tab === i.id} aria-label={i.label} data-tip={i.tip} className={`psy-ic${i.accent ? " accent" : ""}`} data-testid={`tab-${i.id}`} onClick={() => setTab(i.id)}>
              <Icon size={19} aria-hidden="true" />
              {i.id === "scan" && t && t.open > 0 ? <span className={`n${t.severe ? " sev" : ""}`} aria-label={`${t.open} to review`}>{t.open}</span> : null}
              {i.id === "scribe" && recording ? <span className="n dot" aria-label="Session in progress" /> : null}
            </button>
          );
        })}
        <button type="button" className="psy-ic end" data-tip="Close this screen and go back to Scribe" aria-label="Close this screen" data-testid="close-screen" onClick={() => setTab("scribe")}><X size={19} aria-hidden="true" /></button>
      </nav>

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
              <div><span className="sub">Reading this page · </span><b>Patient record</b> · {consumer.ini}, {consumer.age}</div>
              <div className="sub">{consumer.docs.length} document{consumer.docs.length === 1 ? "" : "s"} Psyflo can work on</div>
            </>
          ) : (
            <>
              <div><span className="sub">Reading this page · </span><b>Patient list</b></div>
              <div className="sub">Open a patient, then a document, to scribe or scan it</div>
            </>
          )}
        </div>
        {seed ? <span className="p-chip neutral">{doc?.status === "saved" ? "Saved" : "Draft"}</span> : null}
      </div>

      <div className="psy-view" role="tabpanel" aria-labelledby={`tab-${tab}`} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {tab === "scribe" ? <ScribeView /> : tab === "history" ? <HistoryView /> : tab === "patients" ? <PatientsView /> : tab === "scan" ? <ScanView /> : tab === "help" ? <HelpView /> : <SettingsView />}
      </div>
    </div>
  );
}
