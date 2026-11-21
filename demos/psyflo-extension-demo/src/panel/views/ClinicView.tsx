import { Building2, ChevronRight, Lock } from "lucide-react";
import { SEV_LABEL } from "@/engine";
import { useCurrent } from "@/hooks";
import { useStore } from "@/store";
import type { Check, DocKind, Severity } from "@/types";
import "../panel-more.css";

const PAUSE: { value: Severity | "never"; label: string }[] = [
  { value: "severe", label: "Severe" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "never", label: "Never" },
];

/** One collapsible section of the profile. */
function Sec({ id, title, n, open, children }: { id: string; title: string; n?: number; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="cln-sec" open={open} data-section={id}>
      <summary>
        <ChevronRight size={15} className="chev" aria-hidden="true" />
        <span className="ttl">{title}</span>
        {n !== undefined ? <span className="p-chip">{n}</span> : null}
      </summary>
      <div className="cln-in">{children}</div>
    </details>
  );
}

/** What Psyflo knows about this clinic, read-only, plus the one live setting: what happens when a document is saved. */
export function ClinicProfile() {
  const { clinic } = useCurrent();
  const p = clinic.profile;
  const docName = (k: DocKind) => clinic.forms[k]?.short ?? k;

  const modules: { name: string; checks: Check[] }[] = [];
  for (const c of clinic.checks) {
    const m = modules.find((x) => x.name === c.module);
    if (m) m.checks.push(c);
    else modules.push({ name: c.module, checks: [c] });
  }

  return (
    <div className="cln-root">
      <div className="cln-head">
        <span className="ico" aria-hidden="true"><Building2 size={18} /></span>
        <div className="p-grow">
          <h2 className="p-big" style={{ marginBottom: 1 }}>{p.name}</h2>
          <p className="p-sub" style={{ margin: 0 }}>{p.sub}</p>
        </div>
      </div>
      <p className="p-note cln-lock"><Lock size={12} aria-hidden="true" /> Set by your admin · you can read it, not change it</p>

      <Sec id="programs" title="Programs and sites" n={p.programs.length}>
        {p.programs.length === 0 ? <p className="p-note">None listed.</p> : (
          <ul className="cln-list">
            {p.programs.map((g) => (
              <li key={g.code + g.name}>
                <div className="p-row sp" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}><b>{g.name}</b><span className="p-chip">{g.code}</span></div>
                <div className="p-note">Sites: {g.sites.join(", ")}</div>
                {g.note ? <div className="p-note">{g.note}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </Sec>

      <Sec id="payers" title="Payers" n={p.payers.length}>
        {p.payers.length === 0 ? <p className="p-note">None listed.</p> : (
          <ul className="cln-list">
            {p.payers.map((y) => (
              <li key={y.id}>
                <div className="p-row sp" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}><b>{y.name}</b><span className="p-chip">{y.channel}</span></div>
                <p className="cln-q">{y.criteria}</p>
              </li>
            ))}
          </ul>
        )}
        {p.payers.length ? <p className="p-note">The criteria are your clinic&apos;s own wording (sample).</p> : null}
      </Sec>

      <Sec id="accreditations" title="Accreditations" n={p.accreditations.length}>
        {p.accreditations.length === 0 ? <p className="p-note">None listed.</p> : <ul className="cln-bul">{p.accreditations.map((a) => <li key={a}>{a}</li>)}</ul>}
      </Sec>

      <Sec id="wording" title="Wording rules" n={p.verbiage.length}>
        {p.verbiage.length === 0 ? <p className="p-note">None listed.</p> : (
          <ul className="cln-list">
            {p.verbiage.map((v) => (
              <li key={v.rule}>
                <div>{v.rule}</div>
                {v.example ? <div className="cln-eg"><span>For example</span> {v.example}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </Sec>

      <Sec id="standards" title="Document standards" n={p.documentRules.length}>
        {p.documentRules.length === 0 ? <p className="p-note">None listed.</p> : (
          <ul className="cln-list">
            {p.documentRules.map((r) => (
              <li key={r.doc}><b>{docName(r.doc)}</b><div>{r.rule}</div></li>
            ))}
          </ul>
        )}
      </Sec>

      <Sec id="checks" title="Checks Psyflo runs" n={clinic.checks.length}>
        {modules.length === 0 ? <p className="p-note">None listed.</p> : modules.map((m) => (
          <section key={m.name} className="cln-mod" aria-label={m.name}>
            <h3 className="p-h">{m.name}</h3>
            <ul className="cln-list">
              {m.checks.map((c) => (
                <li key={c.id} data-check={c.id}>
                  <div className="p-row sp" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                    <b>{c.title}</b>
                    <span className={`p-chip sev-${c.severity}`}>{SEV_LABEL[c.severity]}</span>
                  </div>
                  <div className="p-note">Applies to: {c.docs.map(docName).join(", ")}</div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Sec>

      <Sec id="retention" title="Data retention">
        <dl className="p-kv cln-kv">
          <dt>Transcripts</dt><dd>{p.retention.transcripts || "Not set"}</dd>
          <dt>Documents</dt><dd>{p.retention.documents || "Not set"}</dd>
        </dl>
      </Sec>


      <p className="cln-end">This panel looks the same at every clinic. Only this profile and the checks change.</p>
      <p className="p-note cln-demo-note">Demo: switch the clinic in the browser bar.</p>
    </div>
  );
}

/** What happens when a document is saved in Lauris. Live in the demo so the pause can be seen. */
export function CheckBeforeSave() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const pauseHint = !settings.onSave
    ? "Off. Lauris saves straight away and Psyflo does not check first."
    : settings.pauseAt === "never"
      ? "Psyflo checks the document, but never pauses the save."
      : settings.pauseAt === "severe"
        ? "Psyflo pauses the save when a severe alert is open."
        : settings.pauseAt === "medium"
          ? "Psyflo pauses the save when a medium or severe alert is open."
          : "Psyflo pauses the save when any alert is open.";

  return (
    <div className="cln-root">
      <Sec id="onsave" title="Check before save" open>
        <p className="p-note cln-demo">Demo control: change these to see how saving in Lauris behaves.</p>
        <div className="cln-set">
          <button type="button" role="switch" aria-checked={settings.onSave} className="p-switch" data-testid="set-onsave" onClick={() => setSettings({ onSave: !settings.onSave })}>
            <i aria-hidden="true" /><span>Check the document when I press Save</span>
          </button>
        </div>
        <div className="cln-set">
          <label className="p-lbl" htmlFor="set-pauseat">Pause saving at:</label>
          <select id="set-pauseat" className="p-input" data-testid="set-pauseat" value={settings.pauseAt} onChange={(e) => setSettings({ pauseAt: e.target.value as Severity | "never" })}>
            {PAUSE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <p className="p-note" data-testid="set-hint">{pauseHint}</p>
      </Sec>
    </div>
  );
}

export default ClinicProfile;
