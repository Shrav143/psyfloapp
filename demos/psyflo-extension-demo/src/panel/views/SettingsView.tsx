import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useCurrent } from "@/hooks";
import { useStore } from "@/store";
import { CheckBeforeSave, ClinicProfile } from "./ClinicView";
import "../panel-more.css";
import "../panel-nav.css";

function Section({ id, title, open, children }: { id: string; title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="cln-sec" open={open} data-section={id}>
      <summary><span className="ttl" style={{ marginLeft: 4 }}>{title}</span></summary>
      <div className="cln-in">{children}</div>
    </details>
  );
}

/** The person icon: you, how recording starts, what happens on save, and what Psyflo knows about your clinic (read-only). */
export default function SettingsView() {
  const { clinic } = useCurrent();
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const u = clinic.user;
  const initials = u.name.split(/[ ,]+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("");
  return (
    <div className="psy-body" data-testid="settings">
      <h2 className="p-big">Settings</h2>
      <p className="nv-lead">Your account, how Scribe starts, what happens when you save, and your clinic.</p>

      <Section id="you" title="You" open>
        <div className="st-me">
          <span className="av" aria-hidden="true">{initials}</span>
          <div><b>{u.name}</b><div className="p-note">{u.role} · {clinic.profile.short}</div><div className="p-note">Signed in to Lauris as {u.short}</div></div>
        </div>
        <button type="button" className="p-btn sm" style={{ marginTop: 10 }} disabled title="Not part of this demo">Sign out</button>
      </Section>

      <Section id="recording" title="Recording">
        <div className="st-field">
          <label className="p-lbl" htmlFor="st-mic">Microphone</label>
          <select id="st-mic" className="p-input" data-testid="set-mic" value={prefs.mic} onChange={(e) => setPrefs({ mic: e.target.value })}>
            <option>Built-in microphone (simulated)</option>
            <option>Headset microphone (simulated)</option>
          </select>
        </div>
        <div className="st-field">
          <label className="p-lbl" htmlFor="st-lang">Language</label>
          <select id="st-lang" className="p-input" data-testid="set-language" value={prefs.language} onChange={(e) => setPrefs({ language: e.target.value })}>
            <option>English</option>
            <option disabled>Spanish (not in this demo)</option>
          </select>
        </div>
        <div className="st-field">
          <button type="button" role="switch" aria-checked={prefs.telehealth} className="p-switch" data-testid="set-telehealth" onClick={() => setPrefs({ telehealth: !prefs.telehealth })}>
            <i aria-hidden="true" /><span>Start sessions as telehealth with headphones</span>
          </button>
          <p className="p-note">Turn this on if most of your sessions are over a call.</p>
        </div>
        <p className="p-note" style={{ marginTop: 10 }}>Transcripts: {clinic.profile.retention.transcripts}. Set by your admin.</p>
      </Section>

      <CheckBeforeSave />

      <Section id="clinic" title={`Clinic profile · ${clinic.profile.short}`}>
        <p className="p-note" style={{ margin: "0 0 8px" }}><Lock size={12} aria-hidden="true" style={{ verticalAlign: "-1px" }} /> Set by your admin. You can read it, not change it.</p>
        <ClinicProfile />
      </Section>

      <p className="p-note" style={{ marginTop: 14 }}>Psyflo extension demo · sample data, initials only.</p>
    </div>
  );
}
