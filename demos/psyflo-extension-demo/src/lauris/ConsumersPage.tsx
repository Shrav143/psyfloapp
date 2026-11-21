import { useMemo, useState } from "react";
import { useStore } from "@/store";
import { Go, payerName, unitsText, updatedOf } from "./util";

/** Lauris's Consumers page: the active consumers, filtered by program, payer or initials. A name opens that consumer. */
export default function ConsumersPage() {
  const clinic = useStore((s) => s.clinic);
  const openConsumer = useStore((s) => s.openConsumer);
  const [q, setQ] = useState("");
  const [program, setProgram] = useState("");
  const [payer, setPayer] = useState("");

  const programs = useMemo(() => [...new Set(clinic.consumers.map((c) => c.program))], [clinic]);
  const found = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/[.\s]/g, "");
    return clinic.consumers.filter(
      (c) =>
        (!needle || c.ini.toLowerCase().replace(/[.\s]/g, "").includes(needle) || c.id.includes(needle)) &&
        (!program || c.program === program) &&
        (!payer || c.payer === payer),
    );
  }, [clinic, q, program, payer]);
  const filtered = q.trim() !== "" || program !== "" || payer !== "";

  return (
    <div className="l-page">
      <div className="ltabs" role="tablist" aria-label="Consumers">
        <button type="button" role="tab" aria-selected="true" className="tab on">Active Consumers</button>
        <button type="button" role="tab" aria-selected="false" aria-disabled="true" tabIndex={-1} className="tab" title="Not part of this demo">Discharged Consumers</button>
      </div>

      <form className="filters" role="search" aria-label="Filter consumers" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="lbl" htmlFor="lc-program">Program</label>
          <select id="lc-program" className="in" value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="">All programs</option>
            {programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl" htmlFor="lc-payer">Payer</label>
          <select id="lc-payer" className="in" value={payer} onChange={(e) => setPayer(e.target.value)}>
            <option value="">All payers</option>
            {clinic.profile.payers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="lbl" htmlFor="lc-q">Consumer initials</label>
          <input id="lc-q" type="search" className="in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Initials or #" autoComplete="off" />
        </div>
        <button type="button" className="lb" disabled={!filtered} onClick={() => { setQ(""); setProgram(""); setPayer(""); }}>Clear</button>
      </form>

      <div className="tscroll" tabIndex={0} role="region" aria-label="Active consumers, scrolls sideways on a narrow window">
        <table className="list" data-testid="consumers-table">
          <thead>
            <tr>
              <th scope="col">Consumer #</th>
              <th scope="col">Name</th>
              <th scope="col">Age</th>
              <th scope="col">Program</th>
              <th scope="col">Site</th>
              <th scope="col">Payer</th>
              <th scope="col">Clinician</th>
              <th scope="col">Units available</th>
              <th scope="col">Updated</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {found.map((c) => {
              const u = unitsText(c);
              return (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td><Go href={`#/consumers/${c.id}`} data-consumer={c.id} onGo={() => openConsumer(c.id)} aria-label={`Open consumer ${c.ini}, number ${c.id}`}>{c.ini}</Go></td>
                  <td>{c.age}</td>
                  <td>{c.program}</td>
                  <td>{c.site}</td>
                  <td>{payerName(clinic, c.payer)}</td>
                  <td>{c.clinician}</td>
                  <td>{u.none ? <span className="st r">{u.text}</span> : u.text}</td>
                  <td>{updatedOf(clinic, c)}</td>
                  <td className="nt">{c.note ?? ""}</td>
                </tr>
              );
            })}
            {found.length === 0 ? <tr><td colSpan={10} className="muted">No consumers match.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="small muted more" aria-live="polite">{found.length} of {clinic.consumers.length} consumers</div>
    </div>
  );
}
