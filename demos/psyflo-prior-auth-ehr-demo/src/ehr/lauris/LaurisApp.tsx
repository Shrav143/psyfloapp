import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui";
import { PsyfloPanel } from "@/ehr/panel/PsyfloPanel";
import type { LaurisPage } from "@/ehr/model";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import AuthorizationsPage from "./AuthorizationsPage";
import BrowserFrame from "./BrowserFrame";
import ConsumersPage from "./ConsumersPage";
import FormPage from "./FormPage";
import { laurisStamp } from "./rows";
import "./lauris.css";

function pageOf(pathname: string): LaurisPage {
  const m = pathname.match(/^\/lauris\/case\/([^/]+)/);
  if (m) return { kind: "form", caseId: decodeURIComponent(m[1]) };
  if (/^\/lauris\/authorizations/.test(pathname)) return { kind: "authorizations" };
  return { kind: "consumers" };
}

/** A menu item that is part of the mock Lauris but not of this demo: it is there, it does nothing. */
function Inert({ label, badge }: { label: string; badge?: number }) {
  return (
    <span className="lnav inert" role="link" aria-disabled="true" title="Not part of this demo">
      {label}
      {badge ? <span className="b">{badge}</span> : null}
    </span>
  );
}

/** The mock Lauris EHR, as a page in its own browser tab (route /lauris/*, outside the Psyflo shell), with the Psyflo extension docked on its right. */
export default function LaurisApp() {
  const { pathname } = useLocation();
  const page = pageOf(pathname);
  const panelOpen = useStore((s) => s.ehr.panelOpen);
  const clock = useStore((s) => s.clock);
  const { viewer } = useScope();
  const live = (to: string, label: string, on: boolean) => (
    <NavLink to={to} end className={`lnav${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>{label}</NavLink>
  );

  return (
    <div className="lauris">
      <BrowserFrame page={page} />
      <div className="lb-body">
        <div className="lb-app">
          <div className="l-top">
            <span className="ar" aria-hidden="true">»</span> Lauris Online
            <span className="cap">mock for the Psyflo demo · synthetic data</span>
            <span className="clk" title="The demo clock: Psyflo and this mock Lauris read the same one">{laurisStamp(clock)}</span>
            <span className="r">
              {viewer.name} ·
              <span className="dead" title="Not part of this demo">Switch to Classic</span> ·
              <span className="dead" title="Not part of this demo">Sign Out</span>
            </span>
          </div>
          <div className="l-wrap">
            <nav className="l-side" aria-label="Lauris menu">
              {live(paths.lauris(), "Consumers", page.kind === "consumers")}
              {live(paths.lauris({ page: "authorizations" }), "Authorizations", page.kind === "authorizations" || page.kind === "form")}
              <Inert label="Approvals" />
              <Inert label="Add Session" />
              <Inert label="Saved Session" badge={2} />
              <Inert label="Reports" />
              <Inert label="User Information" />
              <div className="l-sep" />
              <Inert label="Forms to Approve" badge={6} />
              <Inert label="Rejected Forms" badge={1} />
              <Inert label="Consumers w/o Authorizations" badge={9} />
            </nav>
            <main className="l-main" id="lauris-main" data-lauris-page={page.kind}>
              <Routes>
                <Route index element={<ConsumersPage />} />
                <Route path="authorizations" element={<AuthorizationsPage />} />
                <Route path="case/:id" element={<FormPage />} />
                <Route path="*" element={<Navigate to={paths.lauris()} replace />} />
              </Routes>
            </main>
          </div>
        </div>
        {panelOpen ? (
          <aside className="lb-panel" aria-label="Psyflo extension">
            <PsyfloPanel page={page} />
          </aside>
        ) : null}
      </div>
      <Toaster />
    </div>
  );
}
