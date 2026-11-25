import { usDate } from "@/engine";
import { useStore } from "@/store";
import { Go, avatarOf, docTitle, payerName, unitsText } from "./util";

export const CONSUMER_TABS = ["Demographics", "Documents", "Authorizations", "Contacts", "Medications", "Billing"];

/** One consumer in Lauris: the header, the (inert) tabs, and the Documents tab, which lists the documents this consumer has in the demo. */
export default function ConsumerPage({ consumerId }: { consumerId: string }) {
  const clinic = useStore((s) => s.clinic);
  const docs = useStore((s) => s.docs);
  const goConsumers = useStore((s) => s.goConsumers);
  const openDoc = useStore((s) => s.openDoc);
  const c = clinic.consumers.find((x) => x.id === consumerId);

  if (!c) {
    return (
      <div className="l-page">
        <h2>Consumer not found</h2>
        <div className="card"><p>Lauris has no consumer {consumerId}.</p><Go href="#/consumers" className="lb" onGo={goConsumers}>Back to Consumers</Go></div>
      </div>
    );
  }

  const u = unitsText(c);
  const seeds = c.docs.map((id) => clinic.docs.find((d) => d.id === id)).filter((d) => d !== undefined);
  return (
    <div className="l-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Go href="#/consumers" onGo={goConsumers}>Consumers</Go><span aria-hidden="true"> › </span><span aria-current="page">{c.ini}</span>
      </nav>

      <div className="hdr" data-testid="consumer-header">
        <div className="av" aria-hidden="true">{avatarOf(c.ini)}</div>
        <div className="who">
          <div className="nm">{c.ini} · {c.age} · {c.site}</div>
          <div className="sub">Consumer # {c.id} · {c.program} · {payerName(clinic, c.payer)}</div>
          <div className="sub">Clinician: {c.clinician}{c.dx ? <> · Diagnosis: {c.dx}</> : null}</div>
        </div>
        <div className="units">{u.none ? <span className="st r">{u.text}</span> : <span>{u.text}</span>}</div>
      </div>

      <div className="tabs" role="tablist" aria-label="Consumer record">
        {CONSUMER_TABS.map((t) => {
          const on = t === "Documents";
          return <button key={t} type="button" role="tab" aria-selected={on} aria-disabled={on ? undefined : true} tabIndex={on ? 0 : -1} title={on ? undefined : "Not part of this demo"} className={`tab${on ? " on" : ""}`}>{t}</button>;
        })}
      </div>

      <h2>Documents</h2>
      {seeds.length === 0 ? (
        <div className="card" data-testid="no-documents"><p className="muted" style={{ margin: 0 }}>No documents in this demo. Nothing to scribe or scan here.</p></div>
      ) : (
        <div className="tscroll" tabIndex={0} role="region" aria-label="Documents, scrolls sideways on a narrow window">
          <table className="list docs" data-testid="documents-table">
            <thead>
              <tr><th scope="col">Document</th><th scope="col">Status</th><th scope="col">Author</th><th scope="col">Date</th></tr>
            </thead>
            <tbody>
              {seeds.map((d) => {
                const st = docs[d.id];
                const saved = st?.status === "saved";
                return (
                  <tr key={d.id}>
                    <td><Go href={`#/consumers/${c.id}/documents/${d.id}`} data-doc={d.id} onGo={() => openDoc(d.id)}>{docTitle(clinic, d)}</Go></td>
                    <td><span className={`st ${saved ? "g" : "n"}`}>{saved ? "Saved" : "Draft"}</span></td>
                    <td>{d.author ?? (st?.savedAt ? clinic.user.name : "—")}</td>
                    <td>{usDate(d.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
