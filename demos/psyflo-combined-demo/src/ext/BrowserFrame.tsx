import { ArrowLeft, ArrowRight, Lock, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEhrCase } from "@/ehr/model";
import { paths } from "@/routes";
import { useStore as usePlatform } from "@/store";
import { tally, useCurrent } from "./hooks";
import { ViewToggle } from "@/components/ViewToggle";
import { useStore } from "./store";

/** The thin browser around the EHR. Two tabs: Psyflo platform (the web app, opened in its own tab) and Lauris Online (the clinic's EHR, with the extension docked in it). The Psyflo button shows or hides the extension panel.
    The demo-only switch picks which sample clinic Lauris shows: the platform's own consumers, or the Harvest and CCCSN content of the extension demo. */
export default function BrowserFrame() {
  const navigate = useNavigate();
  const returnTo = usePlatform((s) => s.ehr.returnTo);
  const panelOpen = useStore((s) => s.panelOpen);
  const togglePanel = useStore((s) => s.togglePanel);
  const { page, spec, consumer, scan } = useCurrent();
  const authCase = useEhrCase(page.kind === "auth" ? page.caseId : undefined);
  const t = scan ? tally(scan.findings, scan.status) : null;
  const waiting = authCase ? authCase.openCount : t ? t.open : 0;
  const severe = !!t?.severe;
  const title = page.kind === "form" && spec ? spec.title : page.kind === "auth" ? "Authorization form" : page.kind === "consumer" ? "Consumer" : "Consumers";
  const url = page.kind === "form" ? `…laurisonline…/consumers/${consumer?.id}/sessions/${page.docId}` : page.kind === "auth" ? `…laurisonline…/consumers/${consumer?.id}/authorizations/${page.caseId}` : page.kind === "consumer" ? `…laurisonline…/consumers/${consumer?.id}` : "…laurisonline…/consumers";
  return (
    <header className="shell-bar">
      <div className="shell-tabs" role="tablist" aria-label="Browser tabs">
        <div className="shell-dots" aria-hidden="true"><i /><i /><i /></div>
        <button type="button" role="tab" aria-selected="false" className="shell-tab other" data-testid="open-platform" onClick={() => navigate(returnTo ?? paths.dashboard())} title="Open the Psyflo platform in its own tab">
          <span className="fav ps" aria-hidden="true">p</span><span>Psyflo platform</span><span className="go" aria-hidden="true">↗</span>
        </button>
        <div role="tab" aria-selected="true" aria-current="page" className="shell-tab" data-testid="tab-lauris"><span className="fav" aria-hidden="true">»</span><span>Lauris Online — {title}</span></div>
        <div className="shell-demo"><ViewToggle on="extension" /></div>
      </div>
      <div className="shell-nav">
        <span className="shell-btn" aria-hidden="true"><ArrowLeft size={16} /></span>
        <span className="shell-btn" aria-hidden="true"><ArrowRight size={16} /></span>
        <span className="shell-btn" aria-hidden="true"><RotateCw size={15} /></span>
        <div className="shell-url" aria-label="Address"><Lock size={12} aria-hidden="true" /><span>{url}</span></div>
        <button type="button" className="shell-ext" aria-pressed={panelOpen} onClick={() => togglePanel()} title={panelOpen ? "Hide the Psyflo extension" : "Show the Psyflo extension"} data-testid="ext-button">
          <i aria-hidden="true" /><b>psyflo<em>.</em></b>
          {waiting > 0 ? <span className={`n${severe ? " sev" : ""}`} aria-label={`${waiting} to review`}>{waiting}</span> : null}
          <span className="sr-only">Psyflo extension, {panelOpen ? "open" : "closed"}</span>
        </button>
      </div>
    </header>
  );
}
