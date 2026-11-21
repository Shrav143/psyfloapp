import { ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { usDate } from "@/engine";
import { tally, useCurrent } from "@/hooks";
import { useStore } from "@/store";
import type { Consumer } from "@/types";
import "../panel-nav.css";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The third icon: the patient roster. Search it, open a patient to see their documents, their recent sessions and the chart records Psyflo reads. */
export default function PatientsView() {
  const { clinic } = useCurrent();
  const [q, setQ] = useState("");
  const [withDocs, setWithDocs] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  const list = useMemo(() => {
    const nq = norm(q);
    return clinic.consumers
      .filter((c) => (!withDocs || c.docs.length > 0) && (!nq || norm(`${c.ini} ${c.id} ${c.program} ${c.site}`).includes(nq)))
      .sort((a, b) => b.docs.length - a.docs.length);
  }, [clinic, q, withDocs]);

  const patient = sel ? clinic.consumers.find((c) => c.id === sel) : undefined;
  if (patient) return <Detail patient={patient} onBack={() => setSel(null)} />;

  const payerName = (id: string) => clinic.profile.payers.find((p) => p.id === id)?.name ?? id;
  return (
    <div className="psy-body" data-testid="patients">
      <h2 className="p-big">Patients</h2>
      <p className="nv-lead">Your roster, from Lauris. Open a patient to see their documents.</p>
      <div className="nv-search">
        <Search size={15} aria-hidden="true" />
        <label className="sr-only" htmlFor="pat-q">Search patients</label>
        <input id="pat-q" className="p-input" type="search" data-testid="pat-search" value={q} placeholder="Search by initials or number…" autoComplete="off" onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="p-row" style={{ marginBottom: 10 }}>
        <button type="button" className="p-chip btn" aria-pressed={!withDocs} onClick={() => setWithDocs(false)} style={!withDocs ? { background: "var(--navy)", color: "#fff" } : undefined}>All {clinic.consumers.length}</button>
        <button type="button" className="p-chip btn" data-testid="pat-with-docs" aria-pressed={withDocs} onClick={() => setWithDocs(true)} style={withDocs ? { background: "var(--navy)", color: "#fff" } : undefined}>With documents</button>
      </div>
      {list.length === 0 ? <div className="p-empty"><b>No patients match “{q.trim()}”</b>Check the initials or number.</div> : (
        <ul className="pt-list">
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" className="pt-card" data-testid="pat-row" data-patient={c.id} onClick={() => setSel(c.id)}>
                <span className="pt-av" aria-hidden="true">{c.ini.replace(/\./g, "")}</span>
                <span className="pt-tx"><b>{c.ini}, {c.age} <span style={{ display: "inline", color: "var(--ink-3)", fontWeight: 400 }}>· {c.id}</span></b><span>{c.program} · {c.site}</span><span>{payerName(c.payer)}</span></span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span className={`p-chip ${c.units ? "ok" : "neutral"}`}>{c.units ? `${c.units.left} units left` : "No authorization"}</span>
                  {c.docs.length ? <span className="p-chip teal">{c.docs.length} document{c.docs.length === 1 ? "" : "s"}</span> : <span className="p-note">No documents here</span>}
                </span>
                <ChevronRight size={16} aria-hidden="true" style={{ color: "var(--ink-3)", alignSelf: "center" }} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="p-note" style={{ marginTop: 10 }}>Sample roster, initials only.</p>
    </div>
  );
}

function Detail({ patient: c, onBack }: { patient: Consumer; onBack: () => void }) {
  const { clinic } = useCurrent();
  const docs = useStore((s) => s.docs);
  const scans = useStore((s) => s.scans);
  const history = useStore((s) => s.history);
  const openDoc = useStore((s) => s.openDoc);
  const openConsumer = useStore((s) => s.openConsumer);
  const scribeOpen = useStore((s) => s.scribeOpen);
  const setTab = useStore((s) => s.setTab);
  const [open, setOpen] = useState<string | null>(null);
  const payer = clinic.profile.payers.find((p) => p.id === c.payer)?.name ?? c.payer;
  const sessions = history.filter((h) => h.type === "session" && h.consumerId === c.id).slice(0, 3);

  return (
    <div className="psy-body" data-testid="pat-detail" data-patient={c.id}>
      <button type="button" className="p-btn ghost sm pt-back" data-testid="pat-back" onClick={onBack}><ChevronLeft size={15} aria-hidden="true" />All patients</button>
      <div className="pt-head">
        <span className="pt-av" style={{ width: 46, height: 46, fontSize: 13 }} aria-hidden="true">{c.ini.replace(/\./g, "")}</span>
        <div>
          <h2 className="p-big" style={{ margin: 0 }}>{c.ini}, {c.age}</h2>
          <div className="p-note">{c.id} · {c.program} · {c.site}</div>
          <div className="p-note">{payer}{c.units ? ` · ${c.units.left} units left until ${c.units.ends}` : " · no authorization on file"}</div>
        </div>
      </div>
      <button type="button" className="p-btn sm" onClick={() => openConsumer(c.id)}>Open patient in Lauris</button>

      <h3 className="p-h">Documents</h3>
      {c.docs.length === 0 ? <p className="p-note">No documents for this patient in the demo.</p> : c.docs.map((id) => {
        const seed = clinic.docs.find((d) => d.id === id);
        const spec = seed ? clinic.forms[seed.kind] : undefined;
        if (!seed || !spec) return null;
        const d = docs[id];
        const yellow = d ? Object.keys(d.typed).length : 0;
        const sc = scans[id];
        const t = sc ? tally(sc.findings, sc.status) : null;
        const canScribe = clinic.scribe.some((s) => s.docId === id);
        return (
          <div key={id} className="pt-doc" data-testid="pat-doc" data-doc-id={id}>
            <div className="p-row sp"><b>{spec.short}</b><span className="p-note">{usDate(seed.date)}</span></div>
            <div className="p-row" style={{ margin: "6px 0 8px" }}>
              <span className="p-chip neutral">{d?.status === "saved" ? "Saved" : "Draft"}</span>
              {yellow ? <span className="p-chip typed">{yellow} yellow, not saved</span> : null}
              {t && t.open ? <span className={`p-chip ${t.severe ? "sev-severe" : "sev-medium"}`}>{t.open} to review</span> : null}
            </div>
            <div className="p-row">
              <button type="button" className="p-btn sm" onClick={() => openDoc(id)}>Open in Lauris</button>
              {canScribe ? <button type="button" className="p-btn sm" data-testid="pat-scribe" onClick={() => { openDoc(id); scribeOpen(id); }}>Scribe</button> : null}
              <button type="button" className="p-btn sm" data-testid="pat-scan" onClick={() => { openDoc(id); setTab("scan"); }}>Scan</button>
            </div>
          </div>
        );
      })}

      <h3 className="p-h">Recent sessions</h3>
      {sessions.length === 0 ? <p className="p-note">No sessions yet.</p> : (
        <ul className="hs-list">
          {sessions.map((h) => (
            <li key={h.id} className="hs-item">
              <div className="hs-top"><b>{h.length ?? "1m"} {h.mode === "dictation" ? "Dictation" : "Session"}</b><span className="when">{usDate(h.date)}{h.time ? ` ${h.time}` : ""}</span></div>
              <div className="hs-sub">{clinic.forms[h.doc]?.short ?? h.doc} · {h.status}</div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="p-h">Chart summary: what Psyflo reads</h3>
      {c.chart.length === 0 ? <p className="p-note">No stored records in the demo.</p> : (
        <ul className="pt-rec">
          {c.chart.map((r) => (
            <li key={r.id}>
              <button type="button" className="p-link" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)} style={{ textAlign: "left", textDecoration: "none" }}>
                <FileText size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> <b>{r.label}</b> <span className="p-note">· {usDate(r.date)}</span>
              </button>
              {open === r.id ? <p>{r.text}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
