import { useCurrent } from "@/hooks";
import { useStore } from "@/store";
import Legend from "./Legend";
import "../panel-nav.css";

/** The question-mark icon: how to do the three things, then what the colors, chips and icons mean. */
export default function HelpView() {
  const { clinic } = useCurrent();
  const setTab = useStore((s) => s.setTab);
  const kinds = Object.values(clinic.forms).map((f) => f?.short).filter(Boolean).join(", ");
  return (
    <div className="psy-body" data-testid="help">
      <h2 className="p-big">Help</h2>
      <p className="nv-lead">Psyflo works on the page you have open in Lauris. It does two jobs on {kinds || "your documents"}.</p>

      <section className="p-card" aria-labelledby="hp-1">
        <h3 className="p-title" id="hp-1">Write a document from a visit</h3>
        <ol className="hp-steps">
          <li>Open the patient and the document in Lauris.</li>
          <li>Press the <b>microphone</b>, choose Live session or Dictation, and start.</li>
          <li>When you finish, read every card Psyflo drafts. Untick anything you do not want.</li>
          <li>Press <b>Type into Lauris</b>. The fields turn yellow. Check them, then press <b>Save</b> in Lauris.</li>
        </ol>
        <button type="button" className="p-btn sm" style={{ marginTop: 8 }} onClick={() => setTab("scribe")}>Go to Scribe</button>
      </section>

      <section className="p-card" aria-labelledby="hp-2">
        <h3 className="p-title" id="hp-2">Check a document that is already written</h3>
        <ol className="hp-steps">
          <li>Open the document in Lauris.</li>
          <li>Press the <b>Scan &amp; Enhance</b> icon, then <b>Scan this document</b>.</li>
          <li>Psyflo lists what is missing, from Severe to Low. Chips appear beside the fields in Lauris.</li>
          <li>For each one, press <b>Type into Lauris</b>, or <b>Dismiss</b>. Where only you can decide, Psyflo says so.</li>
        </ol>
        <button type="button" className="p-btn sm" style={{ marginTop: 8 }} onClick={() => setTab("scan")}>Go to Scan &amp; Enhance</button>
      </section>

      <section className="p-card" aria-labelledby="hp-3">
        <h3 className="p-title" id="hp-3">Save it</h3>
        <p className="p-sub" style={{ margin: 0 }}>Psyflo never presses Save. You do, in Lauris. If something serious is still open, Lauris pauses and tells you. Press Save again to save anyway; Psyflo records it in History.</p>
      </section>

      <h3 className="p-h">What the colors and icons mean</h3>
      <Legend />
    </div>
  );
}
