import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PHASE_CHIP, STAFF, useLaurisRows } from "./rows";
import { longDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";

const FIRST = 20;

/** Lauris's Consumers page: the active consumers, searchable by initials or number. A name opens that consumer's authorization form. */
export default function ConsumersPage() {
  const rows = useLaurisRows();
  const clock = useStore((s) => s.clock);
  const [draft, setDraft] = useState({ q: "", record: "", staff: "", group: "" });
  const [applied, setApplied] = useState(draft);
  const [all, setAll] = useState(false);

  const found = useMemo(() => {
    const q = applied.q.trim().toLowerCase();
    const rec = applied.record.trim();
    const grp = applied.group.trim().toLowerCase();
    return rows.filter((r) => (!q || r.item.initials.toLowerCase().includes(q) || r.no.includes(q)) && (!rec || r.no.includes(rec)) && (!applied.staff || r.staff === applied.staff) && (!grp || r.group.toLowerCase().includes(grp)));
  }, [rows, applied]);
  const shown = all ? found : found.slice(0, FIRST);
  const submit = (e: FormEvent) => { e.preventDefault(); setApplied(draft); setAll(false); };

  return (
    <>
      <div className="ltabs" role="tablist" aria-label="Consumers">
        <button type="button" role="tab" aria-selected="true" className="tab on">Active Consumers</button>
        <button type="button" role="tab" aria-selected="false" aria-disabled="true" className="tab" title="Not part of this demo">Discharged Consumers</button>
      </div>
      <form className="filters" onSubmit={submit} aria-label="Search consumers">
        <div><label className="lbl" htmlFor="lc-q">Consumer</label><input id="lc-q" className="in" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="Initials or ID" /></div>
        <div><label className="lbl" htmlFor="lc-rec">Record #</label><input id="lc-rec" className="in" value={draft.record} onChange={(e) => setDraft({ ...draft, record: e.target.value })} inputMode="numeric" /></div>
        <div>
          <label className="lbl" htmlFor="lc-staff">Assigned staff</label>
          <select id="lc-staff" className="in" value={draft.staff} onChange={(e) => setDraft({ ...draft, staff: e.target.value })}>
            <option value="">All staff</option>
            {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="lbl" htmlFor="lc-grp">Caseload group</label><input id="lc-grp" className="in" value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} placeholder="e.g. IOP" /></div>
        <button type="submit" className="lb pri">Search Consumers</button>
      </form>
      <div className="tscroll">
        <table className="list">
          <thead>
            <tr><th scope="col">Unique ID</th><th scope="col">Name</th><th scope="col">Staff</th><th scope="col">Group</th><th scope="col">Last updated</th><th scope="col">Authorization</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const chip = PHASE_CHIP[r.item.phase];
              return (
                <tr key={r.caseId}>
                  <td>{r.no}</td>
                  <td><Link to={paths.lauris({ case: r.caseId })} aria-label={`Open the authorization form for ${r.item.initials}, consumer ${r.no}`}>{r.item.initials}</Link></td>
                  <td>{r.staff}</td>
                  <td>{r.group}</td>
                  <td>{longDate(clock)}</td>
                  <td><span className={`st ${chip.tone}`}>{chip.text}</span> <span className="muted small">{r.item.type}</span></td>
                </tr>
              );
            })}
            {shown.length === 0 ? <tr><td colSpan={6} className="muted">No consumers match.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="small muted more" aria-live="polite">
        {shown.length} of {found.length} consumers
        {!all && found.length > FIRST ? <> · <button type="button" className="lb" onClick={() => setAll(true)}>Show all {found.length} consumers</button></> : null}
      </div>
    </>
  );
}
