import { useCurrent } from "@/ext/hooks";
import { useStore } from "@/ext/store";
import type { Severity } from "@/ext/types";
import "../panel-nav.css";

const PAUSE: { value: Severity | "never"; label: string }[] = [
  { value: "severe", label: "Severe" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "never", label: "Never" },
];

/** The person icon: two things only. How recording starts, and what happens when you press Save in the EHR. */
export default function SettingsView() {
  useCurrent();
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  const hint = !settings.onSave
    ? "Off. The EHR saves straight away and Psyflo does not check first."
    : settings.pauseAt === "never"
      ? "Psyflo checks the document, but never pauses the save."
      : settings.pauseAt === "severe"
        ? "Psyflo pauses the save when a severe alert is open."
        : settings.pauseAt === "medium"
          ? "Psyflo pauses the save when a medium or severe alert is open."
          : "Psyflo pauses the save when any alert is open.";

  return (
    <div className="psy-body" data-testid="settings">
      <h2 className="p-big">Settings</h2>

      <section className="p-card" aria-labelledby="st-rec">
        <h3 className="p-title" id="st-rec">Recording</h3>
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
        </div>
      </section>

      <section className="p-card" aria-labelledby="st-save">
        <h3 className="p-title" id="st-save">Check before save</h3>
        <div className="st-field">
          <button type="button" role="switch" aria-checked={settings.onSave} className="p-switch" data-testid="set-onsave" onClick={() => setSettings({ onSave: !settings.onSave })}>
            <i aria-hidden="true" /><span>Check the document when I press Save</span>
          </button>
        </div>
        <div className="st-field">
          <label className="p-lbl" htmlFor="set-pauseat">Pause saving at</label>
          <select id="set-pauseat" className="p-input" data-testid="set-pauseat" value={settings.pauseAt} onChange={(e) => setSettings({ pauseAt: e.target.value as Severity | "never" })}>
            {PAUSE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <p className="p-note" data-testid="set-hint" style={{ marginTop: 8 }}>{hint}</p>
      </section>
    </div>
  );
}
