import { CircleHelp, List, Mic, Pin, ScanSearch, User, Users, X } from "lucide-react";
import type { ReactNode } from "react";
import "../panel-scan.css";

/** One row of the legend: a sample on the left, what it means on the right. */
const Row = ({ sample, wide, children }: { sample: ReactNode; wide?: boolean; children: ReactNode }) => (
  <li><span className={`k${wide ? " wide" : ""}`}>{sample}</span><span className="tx">{children}</span></li>
);

const Nav = ({ icon, tab, mark, children }: { icon: ReactNode; tab?: boolean; mark?: boolean; children: ReactNode }) => (
  <li><span className={`lg-ico${tab ? " tab" : ""}${mark ? " mark" : ""}`} aria-hidden="true">{icon}</span><span className="tx">{children}</span></li>
);

/** The in-product legend, opened with the "?" in the panel header. It names no clinic, form or clinical term. */
export default function Legend() {
  return (
    <div data-testid="legend">
      <p className="lg-lead">Psyflo reads the page you are on in Lauris. It types, you check, you save.</p>

      <section className="lg-sec" aria-labelledby="lg-colors">
        <h3 className="p-h" id="lg-colors">Colors in Lauris</h3>
        <ul className="lg-list">
          <Row sample={<span className="lg-box g">Saved text</span>}><b>Green</b> is already in Lauris. It was saved, or Lauris filled it in from the record.</Row>
          <Row sample={<span className="lg-box y">Psyflo typed</span>}><b>Yellow</b> is text Psyflo typed. Read it, change it if you need to, then press Save in Lauris. It turns green when you save.</Row>
        </ul>
      </section>

      <section className="lg-sec" aria-labelledby="lg-alerts">
        <h3 className="p-h" id="lg-alerts">Alerts after a scan</h3>
        <ul className="lg-list">
          <Row sample={<span className="p-chip sev-severe">Severe</span>}>A reviewer would likely send this back or deny it. Fix it before you save.</Row>
          <Row sample={<span className="p-chip sev-medium">Medium</span>}>A reviewer would likely ask a question. Worth fixing.</Row>
          <Row sample={<span className="p-chip sev-low">Low</span>}>A small point of wording or completeness. Fix it if you have a minute.</Row>
          <Row sample={<span className="p-chip typed">Typed</span>}>Psyflo typed a fix for an alert. It stays yellow in Lauris until you save.</Row>
          <Row sample={<span className="p-chip">Handled</span>}>An alert you typed a fix for, or dismissed, moves to the Handled list. <b>Restore</b> brings a dismissed one back.</Row>
        </ul>
        <p className="p-note" style={{ marginTop: 9 }}>The small colored chips beside a field in Lauris are these alerts. The color is the severity. Click one to jump to its card in Scan &amp; Enhance.</p>
      </section>

      <section className="lg-sec" aria-labelledby="lg-nav">
        <h3 className="p-h" id="lg-nav">The six icons</h3>
        <ul className="lg-nav">
          <Nav tab icon={<Mic size={15} />}><b>Microphone: Scribe.</b> Record a visit or dictate a note. Psyflo drafts it, you check every field, then it types into Lauris.</Nav>
          <Nav tab icon={<List size={15} />}><b>List: History.</b> Your documents and sessions, grouped by day. Search by patient, or look at another clinician.</Nav>
          <Nav tab icon={<Users size={15} />}><b>People: Patients.</b> Your roster. Open a patient to see their documents, sessions and the chart records Psyflo reads.</Nav>
          <Nav tab icon={<ScanSearch size={15} />}><b>Scan &amp; Enhance.</b> Reads a document already saved in Lauris, such as an intake or a prior authorization, and suggests fixes you can type in with one click. Ask Psyflo is in here too.</Nav>
          <Nav tab icon={<CircleHelp size={15} />}><b>?: Help.</b> This page.</Nav>
          <Nav tab icon={<User size={15} />}><b>Person: Settings.</b> Your account, recording choices, what happens when you save, and your clinic's profile.</Nav>
          <Nav icon={<X size={15} />}><b>× beside the icons</b> closes this screen and takes you back to Scribe. <b>× at the top</b> closes the whole panel. The Psyflo button in the browser bar opens it again.</Nav>
          <Nav icon={<Pin size={15} />}><b>Pin</b> keeps the panel open as you move between pages.</Nav>
        </ul>
      </section>

      <section className="lg-sec" aria-labelledby="lg-save">
        <h3 className="p-h" id="lg-save">Check before save</h3>
        <p className="p-sub" style={{ margin: 0 }}>
          When you press Save in Lauris, Psyflo checks the document first. If an alert at or above the level set in Settings is still open, the save pauses and Scan &amp; Enhance shows what is open. Fix it, or press Save anyway. You can turn this off or change the level in Settings.
        </p>
      </section>

      <section className="lg-sec" aria-labelledby="lg-type">
        <h3 className="p-h" id="lg-type">What Psyflo types</h3>
        <p className="p-sub" style={{ margin: 0 }}>
          Only a sentence already in the chart, your clinic's own wording, or your own words inside a fixed sentence. It never writes a judgement for you. A field nobody spoke about stays empty.
        </p>
      </section>

      <div className="lg-promise" role="note">
        <b>Psyflo never presses Save.</b>
        It types. You check it and press Save in Lauris.
      </div>
    </div>
  );
}
