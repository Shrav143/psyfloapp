import { Building2, CircleHelp, Clock, MessagesSquare, Mic, ScanSearch, X } from "lucide-react";
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
      <h2 className="p-big">What the colors and buttons mean</h2>
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
        <h3 className="p-h" id="lg-nav">The panel</h3>
        <ul className="lg-nav">
          <Nav mark icon={<>psyflo<em>.</em></>}><b>The Psyflo mark</b> takes you Home: what is waiting for you.</Nav>
          <Nav icon={<CircleHelp size={15} />}><b>?</b> opens this legend.</Nav>
          <Nav icon={<X size={15} />}><b>×</b> closes the panel. The Psyflo button in the browser bar opens it again.</Nav>
          <Nav tab icon={<Mic size={15} />}><b>Scribe</b> listens to a session or a dictation and drafts what was said. You choose what gets typed.</Nav>
          <Nav tab icon={<ScanSearch size={15} />}><b>Scan &amp; Enhance</b> reads a document that is already written, checks it, and offers fixes you can type with one click.</Nav>
          <Nav tab icon={<Clock size={15} />}><b>History</b> lists what Psyflo has scribed, scanned and saved.</Nav>
          <Nav tab icon={<MessagesSquare size={15} />}><b>Ask</b> answers questions from the chart, your clinic's own rules, or a named reference. If it has no source, it says so.</Nav>
          <Nav tab icon={<Building2 size={15} />}><b>Clinic</b> shows what Psyflo knows about your clinic, and holds the Check before save settings.</Nav>
        </ul>
      </section>

      <section className="lg-sec" aria-labelledby="lg-save">
        <h3 className="p-h" id="lg-save">Check before save</h3>
        <p className="p-sub" style={{ margin: 0 }}>
          When you press Save in Lauris, Psyflo checks the document first. If an alert at or above the level set in Clinic is still open, the save pauses and Scan &amp; Enhance shows what is open. Fix it, or press Save anyway. You can turn this off or change the level in Clinic.
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
