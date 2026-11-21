import { FileText, Mic, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useCurrent } from "@/hooks";
import { useStore } from "@/store";
import type { HistoryItem } from "@/types";
import "../panel-more.css";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-29" → "Thursday, Oct 29", built from the date's own parts so no time zone can move it to another day. The year is added when it is not this year. */
function dayLabel(iso: string, today: string): string {
  const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso);
  if (!m) return iso;
  const dow = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return `${DAYS[dow]}, ${MONTHS[+m[2] - 1]} ${+m[3]}${m[1] === today.slice(0, 4) ? "" : `, ${m[1]}`}`;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** What happened, newest first: documents Psyflo worked on, and Scribe sessions. Search is by consumer initials. */
export default function HistoryView() {
  const { clinic } = useCurrent();
  const history = useStore((s) => s.history);
  const openDoc = useStore((s) => s.openDoc);
  const [type, setType] = useState<HistoryItem["type"]>("document");
  const [q, setQ] = useState("");

  const iniOf = (id: string) => clinic.consumers.find((c) => c.id === id)?.ini ?? "—";
  const counts = { document: history.filter((h) => h.type === "document").length, session: history.filter((h) => h.type === "session").length };

  const days = useMemo(() => {
    const nq = norm(q);
    const items = history
      .filter((h) => h.type === type && (!nq || norm(clinic.consumers.find((c) => c.id === h.consumerId)?.ini ?? "").includes(nq)))
      .map((h, i) => ({ h, i }))
      .sort((a, b) => (a.h.date < b.h.date ? 1 : a.h.date > b.h.date ? -1 : a.i - b.i))
      .map((x) => x.h);
    const out: { date: string; items: HistoryItem[] }[] = [];
    for (const h of items) {
      const g = out[out.length - 1];
      if (g && g.date === h.date) g.items.push(h);
      else out.push({ date: h.date, items: [h] });
    }
    return out;
  }, [history, type, q, clinic]);
  const shown = days.reduce((n, d) => n + d.items.length, 0);
  const what = type === "document" ? "documents" : "sessions";

  return (
    <div className="psy-body his-root">
      <h2 className="p-big">History</h2>
      <p className="p-sub">What you and Psyflo did, newest first.</p>

      <div className="p-seg" role="group" aria-label="Show">
        <button type="button" data-testid="hist-tab-documents" aria-pressed={type === "document"} onClick={() => setType("document")}><FileText size={15} aria-hidden="true" />Documents <span className="his-n">{counts.document}</span></button>
        <button type="button" data-testid="hist-tab-sessions" aria-pressed={type === "session"} onClick={() => setType("session")}><Mic size={15} aria-hidden="true" />Sessions <span className="his-n">{counts.session}</span></button>
      </div>

      <label className="p-lbl his-search-l" htmlFor="hist-q">Search by consumer initials</label>
      <div className="his-search">
        <Search size={15} aria-hidden="true" />
        <input id="hist-q" className="p-input" type="search" data-testid="hist-search" value={q} placeholder="For example A.B." autoComplete="off" onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="sr-only" role="status">{shown} {shown === 1 ? what.slice(0, -1) : what} shown</p>

      {days.length === 0 ? (
        <div className="p-empty" data-testid="hist-empty">
          <b>{q.trim() ? `No ${what} for “${q.trim()}”` : `No ${what} yet`}</b>
          {q.trim() ? <>Check the initials, or <button type="button" className="p-link" onClick={() => setQ("")}>clear the search</button>.</> : type === "document" ? "Documents Psyflo scans or you save show up here." : "Scribe sessions show up here."}
        </div>
      ) : days.map((d) => (
        <section key={d.date} aria-label={dayLabel(d.date, clinic.today)}>
          <h3 className="p-h">{dayLabel(d.date, clinic.today)}</h3>
          <ul className="his-list">
            {d.items.map((h) => {
              const short = clinic.forms[h.doc]?.short ?? h.doc;
              const ini = iniOf(h.consumerId);
              const canOpen = !!h.docId && clinic.docs.some((x) => x.id === h.docId);
              return (
                <li key={h.id} className="p-card his-item" data-testid="hist-item" data-type={h.type} data-doc-id={h.docId}>
                  <span className="ico" aria-hidden="true">{h.type === "session" ? <Mic size={15} /> : <FileText size={15} />}</span>
                  <div className="tx">
                    <div className="his-t"><b>{short}</b> · <span>{ini}</span></div>
                    <div className="his-s">{h.status}</div>
                    <div className="p-note">By {h.by}</div>
                  </div>
                  {canOpen ? (
                    <button type="button" className="p-btn sm" data-testid="hist-open" aria-label={`Open in Lauris: ${short}, ${ini}`} onClick={() => openDoc(h.docId!)}>Open in Lauris</button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
