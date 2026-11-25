import { ArrowLeft, ArrowRight, Lock, RotateCw } from "lucide-react";
import { tally, useCurrent } from "./hooks";
import { CLINICS, useStore } from "./store";
import type { ClinicId } from "./types";

/** The thin browser around the EHR: one tab, an address, the Psyflo button that shows or hides the panel, and the demo-only clinic switch. */
export default function BrowserFrame() {
  const panelOpen = useStore((s) => s.panelOpen);
  const togglePanel = useStore((s) => s.togglePanel);
  const clinicId = useStore((s) => s.clinicId);
  const setClinic = useStore((s) => s.setClinic);
  const { page, spec, consumer, scan } = useCurrent();
  const t = scan ? tally(scan.findings, scan.status) : null;
  const title = page.kind === "form" && spec ? spec.title : page.kind === "consumer" ? "Consumer" : "Consumers";
  const url = page.kind === "form" ? `…laurisonline…/consumers/${consumer?.id}/sessions/${page.docId}` : page.kind === "consumer" ? `…laurisonline…/consumers/${consumer?.id}` : "…laurisonline…/consumers";
  return (
    <header className="shell-bar">
      <div className="shell-tabs">
        <div className="shell-dots" aria-hidden="true"><i /><i /><i /></div>
        <div className="shell-tab"><span className="fav" aria-hidden="true">»</span><span>Lauris Online — {title}</span></div>
        <div className="shell-demo">
          <label id="demo-clinic-label">Demo clinic</label>
          <div className="seg" role="group" aria-labelledby="demo-clinic-label">
            {(Object.keys(CLINICS) as ClinicId[]).map((id) => (
              <button key={id} type="button" aria-pressed={clinicId === id} data-clinic={id} onClick={() => clinicId !== id && setClinic(id)}>{CLINICS[id].profile.short}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="shell-nav">
        <span className="shell-btn" aria-hidden="true"><ArrowLeft size={16} /></span>
        <span className="shell-btn" aria-hidden="true"><ArrowRight size={16} /></span>
        <span className="shell-btn" aria-hidden="true"><RotateCw size={15} /></span>
        <div className="shell-url" aria-label="Address"><Lock size={12} aria-hidden="true" /><span>{url}</span></div>
        <button type="button" className="shell-ext" aria-pressed={panelOpen} onClick={() => togglePanel()} title={panelOpen ? "Hide the Psyflo extension" : "Show the Psyflo extension"} data-testid="ext-button">
          <i aria-hidden="true" /><b>psyflo<em>.</em></b>
          {t && t.open > 0 ? <span className={`n${t.severe ? " sev" : ""}`} aria-label={`${t.open} to review`}>{t.open}</span> : null}
          <span className="sr-only">Psyflo extension, {panelOpen ? "open" : "closed"}</span>
        </button>
      </div>
    </header>
  );
}
