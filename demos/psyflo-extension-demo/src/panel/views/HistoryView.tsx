import { FileText, Mic, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { usDate } from "@/engine";
import { useCurrent } from "@/hooks";
import { useStore } from "@/store";
import type { HistoryItem } from "@/types";
import "../panel-more.css";
import "../panel-nav.css";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const utc = (iso: string) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : 0; };

/** Today, earlier this week (since Monday), older. Built from the date's own parts so no time zone can move a row to another day. */
function groupOf(iso: string, today: string): "Today" | "Earlier this week" | "Older" {
  if (iso === today) return "Today";
  const t = utc(today);
  const mondayBack = (new Date(t).getUTCDay() + 6) % 7;
  return utc(iso) >= t - mondayBack * 86400000 && utc(iso) < t ? "Earlier this week" : "Older";
}

/** Documents | Sessions, as in the lists it was studied from: who (mine, everyone, one clinician), search by patient, grouped by how recent. */
export default function HistoryView() {
  const { clinic } = useCurrent();
  const history = useStore((s) => s.history);
  const openDoc = useStore((s) => s.openDoc);
  const [type, setType] = useState<HistoryItem["type"]>("session");
  const [who, setWho] = useState("me");
  const [q, setQ] = useState("");

  const me = clinic.user.short;
  const names = useMemo(() => [...new Set(history.map((h) => h.by))].filter((n) => n !== me).sort(), [history, me]);
  const patient = (id: string) => clinic.consumers.find((c) => c.id === id);
  const counts = { document: history.filter((h) => h.type === "document").length, session: history.filter((h) => h.type === "session").length };

  const groups = useMemo(() => {
    const nq = norm(q);
    const items = history
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => h.type === type && (who === "all" || (who === "me" ? h.by === me : h.by === who)))
      .filter(({ h }) => { if (!nq) return true; const p = patient(h.consumerId); return !!p && norm(`${p.ini} ${p.id}`).includes(nq); })
      .sort((a, b) => (a.h.date < b.h.date ? 1 : a.h.date > b.h.date ? -1 : a.i - b.i))
      .map((x) => x.h);
    const out: { name: string; items: HistoryItem[] }[] = [];
    for (const h of items) {
      const name = groupOf(h.date, clinic.today);
      const g = out.find((x) => x.name === name);
      if (g) g.items.push(h); else out.push({ name, items: [h] });
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, type, who, q, clinic, me]);
  const shown = groups.reduce((n, g) => n + g.items.length, 0);
  const what = type === "document" ? "documents" : "sessions";

  return (
    <div className="psy-body his-root">
      <h2 className="p-big">{type === "document" ? "Documents" : "Sessions"}</h2>
      <p className="nv-lead">{type === "document" ? "Documents Psyflo scanned or you saved." : "Recordings and dictations you made with Scribe."}</p>

      <div className="p-seg" role="group" aria-label="Show">
        <button type="button" data-testid="hist-tab-documents" aria-pressed={type === "document"} onClick={() => setType("document")}><FileText size={15} aria-hidden="true" />Documents <span className="his-n">{counts.document}</span></button>
        <button type="button" data-testid="hist-tab-sessions" aria-pressed={type === "session"} onClick={() => setType("session")}><Mic size={15} aria-hidden="true" />Sessions <span className="his-n">{counts.session}</span></button>
      </div>

      <div className="nv-row" style={{ marginTop: 10 }}>
        <label className="sr-only" htmlFor="hist-who">Whose {what}</label>
        <select id="hist-who" className="p-input" data-testid="hist-who" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="me">{type === "document" ? "My documents" : "My sessions"}</option>
          <option value="all">All clinicians</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="nv-search">
        <Search size={15} aria-hidden="true" />
        <label className="sr-only" htmlFor="hist-q">Search by patient</label>
        <input id="hist-q" className="p-input" type="search" data-testid="hist-search" value={q} placeholder="Search by patient…" autoComplete="off" onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="sr-only" role="status">{shown} {shown === 1 ? what.slice(0, -1) : what} shown</p>

      {groups.length === 0 ? (
        <div className="p-empty" data-testid="hist-empty">
          <b>{q.trim() ? `No ${what} for “${q.trim()}”` : `No ${what} here yet`}</b>
          {q.trim() ? <>Check the initials or number, or <button type="button" className="p-link" onClick={() => setQ("")}>clear the search</button>.</> : who === "me" ? <>Try <button type="button" className="p-link" onClick={() => setWho("all")}>All clinicians</button>.</> : "Nothing matches."}
        </div>
      ) : groups.map((g) => (
        <section key={g.name} aria-label={g.name}>
          <h3 className="nv-grp">{g.name}</h3>
          <ul className="hs-list">
            {g.items.map((h) => {
              const p = patient(h.consumerId);
              const short = clinic.forms[h.doc]?.short ?? h.doc;
              const canOpen = !!h.docId && clinic.docs.some((x) => x.id === h.docId);
              const title = h.type === "session" ? `${h.length ?? "1m"} ${h.mode === "dictation" ? "Dictation" : "Session"}` : short;
              return (
                <li key={h.id} className="hs-item" data-testid="hist-item" data-type={h.type} data-doc-id={h.docId}>
                  <div className="hs-top"><b>{title}</b><span className="when">{usDate(h.date)}{h.time ? ` ${h.time}` : ""}</span></div>
                  <div className={`hs-pat${p ? "" : " none"}`}>{p ? `${p.ini} (${p.id})` : "No patient assigned"}{h.type === "session" ? <span className="p-note"> · {short}</span> : null}</div>
                  <div className="hs-sub">{h.status}{who !== "me" ? ` · ${h.by}` : ""}</div>
                  {canOpen ? <div className="hs-act"><button type="button" className="p-btn sm" data-testid="hist-open" aria-label={`Open in Lauris: ${short}, ${p?.ini ?? ""}`} onClick={() => openDoc(h.docId!)}>Open in Lauris</button></div> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
