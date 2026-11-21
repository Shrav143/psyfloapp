import { useEffect, useRef } from "react";
import { usDate } from "@/engine";
import { useStore } from "@/store";
import ConsumerPage from "./ConsumerPage";
import ConsumersPage from "./ConsumersPage";
import FormPage from "./FormPage";
import { Go } from "./util";
import "./lauris.css";

/** A menu item that is part of the mock Lauris but not of this demo: it is there, it does nothing. */
function Inert({ label, badge }: { label: string; badge?: number }) {
  return (
    <span className="lnav inert" role="link" aria-disabled="true" title="Not part of this demo">
      {label}
      {badge ? <span className="b">{badge}</span> : null}
    </span>
  );
}

/** The mock Lauris Online EHR: top bar, left menu, and the page the store says is open. No browser frame and no extension panel in here. It fills whatever box it is given. */
export default function LaurisApp() {
  const clinic = useStore((s) => s.clinic);
  const page = useStore((s) => s.page);
  const goConsumers = useStore((s) => s.goConsumers);
  const main = useRef<HTMLElement>(null);
  const where = page.kind === "consumers" ? "consumers" : page.kind === "consumer" ? `consumer:${page.consumerId}` : `form:${page.docId}`;

  // a new page opens at its top
  useEffect(() => { main.current?.scrollTo({ top: 0 }); }, [where]);

  return (
    <div className="lauris">
      <div className="l-top">
        <span className="ar" aria-hidden="true">»</span> Lauris Online
        <span className="cap">mock for the Psyflo demo · synthetic data</span>
        <span className="r">
          <span className="clk" title="Today in the demo">{usDate(clinic.today)}</span>
          <span>{clinic.user.name}</span>
          <span className="dead" role="link" aria-disabled="true" title="Not part of this demo">Sign Out</span>
        </span>
      </div>
      <div className="l-wrap">
        <nav className="l-side" aria-label="Lauris menu">
          <Go href="#/consumers" className="lnav on" aria-current={page.kind === "consumers" ? "page" : "true"} onGo={goConsumers}>Consumers</Go>
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
        <main className="l-main" id="lauris-main" ref={main} data-lauris-page={page.kind}>
          {page.kind === "consumers" ? <ConsumersPage /> : page.kind === "consumer" ? <ConsumerPage consumerId={page.consumerId} /> : <FormPage />}
        </main>
      </div>
    </div>
  );
}
