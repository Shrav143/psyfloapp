import { ArrowLeft, ArrowRight, Lock, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { consumerNo, useEditQueue, useEhrCase, type LaurisPage } from "@/ehr/model";
import { paths } from "@/routes";
import { useStore } from "@/store";

const TITLE: Record<LaurisPage["kind"], string> = { consumers: "Consumers", authorizations: "Authorizations", form: "Authorization form" };

/** The address Lauris would show for a page. */
export function urlOf(page: LaurisPage): string {
  const base = "https://…laurisonline…";
  if (page.kind === "form") return `${base}/consumers/${consumerNo(page.caseId)}/authorizations/${page.caseId}`;
  return `${base}/${page.kind === "authorizations" ? "authorizations" : "consumers"}`;
}

/** How many suggestions wait: on a form, for that case; elsewhere, across the authorizations being prepared. */
function FormCount({ caseId }: { caseId: string }) {
  const n = useEhrCase(caseId)?.openCount ?? 0;
  return n > 0 ? <span className="n" aria-label={`${n} suggestions waiting`}>{n}</span> : null;
}
function HomeCount() {
  const n = useEditQueue().length;
  return n > 0 ? <span className="n" aria-label={`${n} authorizations with suggestions`}>{n}</span> : null;
}

/** The thin browser around Lauris: two tabs (Psyflo, Lauris Online), the address bar, and the Psyflo extension button that shows or hides the panel. */
export default function BrowserFrame({ page }: { page: LaurisPage }) {
  const nav = useNavigate();
  const returnTo = useStore((s) => s.ehr.returnTo);
  const panelOpen = useStore((s) => s.ehr.panelOpen);
  const ehrPanel = useStore((s) => s.ehrPanel);
  return (
    <header className="lb-bar">
      <div className="lb-tabs" role="tablist" aria-label="Browser tabs">
        <div className="lb-dots" aria-hidden="true"><i /><i /><i /></div>
        <button type="button" role="tab" aria-selected="false" className="lb-tab" onClick={() => nav(returnTo ?? paths.dashboard())} title="Back to Psyflo">
          <span className="lb-fav ps" aria-hidden="true">p</span><span>Psyflo · Prior auth</span>
        </button>
        <button type="button" role="tab" aria-selected="true" aria-current="page" className="lb-tab">
          <span className="lb-fav la" aria-hidden="true">»</span><span>Lauris Online — {TITLE[page.kind]}</span>
        </button>
      </div>
      <div className="lb-nav">
        <span className="lb-btn" aria-disabled="true" aria-hidden="true"><ArrowLeft size={16} /></span>
        <span className="lb-btn" aria-disabled="true" aria-hidden="true"><ArrowRight size={16} /></span>
        <span className="lb-btn" aria-disabled="true" aria-hidden="true"><RotateCw size={15} /></span>
        <div className="lb-url" aria-label="Address"><Lock size={12} aria-hidden="true" /><span>{urlOf(page)}</span></div>
        <button type="button" className="lb-ext" aria-pressed={panelOpen} onClick={() => ehrPanel(!panelOpen)} title={panelOpen ? "Hide the Psyflo extension" : "Show the Psyflo extension"}>
          <i aria-hidden="true" />
          <b>psyflo<em>.</em></b>
          {page.kind === "form" ? <FormCount caseId={page.caseId} /> : <HomeCount />}
          <span className="sr-only">Psyflo extension, {panelOpen ? "open" : "closed"}</span>
        </button>
      </div>
    </header>
  );
}
