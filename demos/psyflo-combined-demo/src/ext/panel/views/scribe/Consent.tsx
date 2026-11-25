import { MicOff } from "lucide-react";
import { useStore } from "@/ext/store";
import { StageHeading, type ScribeCtx } from "./shared";

/** Live sessions only: the clinician reads the consent script, then says whether the person agreed. Declined means nothing is recorded. */
export default function Consent({ ctx }: { ctx: ScribeCtx }) {
  const consent = useStore((s) => s.scribe.consent);
  const scribeConsent = useStore((s) => s.scribeConsent);
  const scribeCancel = useStore((s) => s.scribeCancel);
  const script = ctx.scenario.consentScript ?? "Tell everyone you would like to record, and ask if that is all right.";

  if (consent === "declined") {
    return (
      <div className="psy-body">
        <section className="p-card">
          <StageHeading>Consent declined</StageHeading>
          <p className="scr-off" role="status"><MicOff size={16} aria-hidden="true" /><span>Recording is off. Nothing was recorded.</span></p>
          <button type="button" className="p-btn block" data-testid="consent-back" onClick={scribeCancel}>Back</button>
        </section>
      </div>
    );
  }
  return (
    <div className="psy-body">
      <section className="p-card">
        <StageHeading>Ask for consent first</StageHeading>
        <p className="p-sub">Read this out loud before you record.</p>
        <blockquote className="scr-quote">{script}</blockquote>
        <div className="p-col">
          <button type="button" className="p-btn pri block" data-testid="consent-yes" onClick={() => scribeConsent("yes")}>Patient consented — start recording</button>
          <button type="button" className="p-btn block" data-testid="consent-no" onClick={() => scribeConsent("declined")}>Declined</button>
        </div>
      </section>
    </div>
  );
}
