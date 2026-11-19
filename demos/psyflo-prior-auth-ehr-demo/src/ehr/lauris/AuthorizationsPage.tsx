import { Link } from "react-router-dom";
import { useMemo } from "react";
import { payerById } from "@/data/seed";
import { dueText } from "@/pages/authorizations/queueLogic";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { useLaurisRows } from "./rows";

/** Lauris's Authorizations page: the authorizations still being prepared, soonest due first. Each opens its form. */
export default function AuthorizationsPage() {
  const rows = useLaurisRows();
  const clock = useStore((s) => s.clock);
  const open = useMemo(() => rows.filter((r) => r.item.phase === "preparing").sort((a, b) => a.item.dueAt - b.item.dueAt), [rows]);
  return (
    <>
      <h2>Authorizations</h2>
      <div className="tscroll">
        <table className="list">
          <thead>
            <tr><th scope="col">Consumer</th><th scope="col">Unique ID</th><th scope="col">Level of care</th><th scope="col">Payer</th><th scope="col">Request type</th><th scope="col">Due</th><th scope="col"><span className="sr-only">Form</span></th></tr>
          </thead>
          <tbody>
            {open.map((r) => (
              <tr key={r.caseId}>
                <td><Link to={paths.lauris({ case: r.caseId })}>{r.item.initials}, {r.item.age}</Link></td>
                <td>{r.no}</td>
                <td>{r.item.levelLabel}</td>
                <td>{payerById(r.item.payerId).shortName}</td>
                <td>{r.item.type}</td>
                <td>{dueText(r.item.dueVerb, r.item.dueAt, clock)}</td>
                <td><Link to={paths.lauris({ case: r.caseId })} aria-label={`Open the form for ${r.item.initials}, consumer ${r.no}`}>Open form</Link></td>
              </tr>
            ))}
            {open.length === 0 ? <tr><td colSpan={7} className="muted">No authorizations are being prepared.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="small muted more">{open.length} authorizations being prepared</div>
    </>
  );
}
