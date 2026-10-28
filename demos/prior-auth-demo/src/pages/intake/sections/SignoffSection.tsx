import { useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, PenLine, RotateCcw, Settings2 } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { canSign } from "@/data/assess/roles";
import { staffOf } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { SignOffDialog } from "../shared/SignOff";
import { signOffAssessment } from "../workspace/actions";
import { workspaceHref } from "../workspace/nav";
import { AmendDialog } from "../workspace/signoff/AmendDialog";
import { SignoffRows } from "../workspace/signoff/SignoffRows";
import { OVERALL_MODULE, type SignoffRow, type SignoffState } from "../workspace/signoff";
import { useModel } from "../workspace/useWorkspaceModel";

const STATE: Record<SignoffState, { word: string; tone: "good" | "mid" | "neutral" }> = {
  signed: { word: "Signed", tone: "good" }, ready: { word: "Ready for sign-off", tone: "mid" }, blocked: { word: "Cannot be signed yet", tone: "neutral" }, stale: { word: "Changed since sign-off", tone: "mid" },
};
const ATTESTATION = "I reviewed every required module of this assessment and the evidence behind it. AI-drafted content was reviewed by me. This sign-off is not a finding of medical necessity and does not select a level of care.";

/** Review & sign-off: every required module with its signature, what stands between the person and the overall sign-off, and the sign-off itself. Only a
    qualified clinician signs; no sign-off while evidence waits for a decision or a required module is unsigned. */
export function SignoffSection({ record, onConfigure }: { record: IntakeRecord; onConfigure: () => void }) {
  const { signoff: so, plan } = useModel();
  const me = useStore((s) => meOf(s));
  const [signing, setSigning] = useState(false);
  const [amending, setAmending] = useState<SignoffRow | "overall" | null>(null);
  const viewer = staffOf(me);
  const clinician = canSign(me);
  const st = STATE[so.state];
  const signer = so.overall ? staffOf(so.overall.by) : undefined;

  const amend = (reason: string) => {
    const s = useStore.getState();
    if (amending === "overall") s.amendInstrument(record.id, OVERALL_MODULE, reason);
    else if (amending?.kind === "assessment") s.amendAssessment(record.id, reason);
    else if (amending?.moduleId) s.amendInstrument(record.id, amending.moduleId, reason);
  };
  return (
    <div className="@container flex min-w-0 flex-col gap-4" data-section-view="signoff" data-signoff-state={so.state}>
      <Card>
        <CardHeader title="Review & sign-off" subtitle={`${so.signed} of ${so.total} required items signed`} right={<Pill tone={st.tone}>{st.word}</Pill>} />
        <CardBody className="flex flex-col gap-3">
          {plan ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] @xl:grid-cols-2">
              <div><dt className="inline text-muted">Who signs: </dt><dd className="inline font-medium">{plan.credentials}</dd></div>
              <div><dt className="inline text-muted">Sign-off rule: </dt><dd className="inline font-medium">{plan.signoff}</dd></div>
            </dl>
          ) : null}
          {!clinician ? <p className="rounded-xl bg-mid-bg px-3 py-2 text-[13px] text-mid-ink">You are viewing as {viewer?.name ?? "a non-clinician"}. A qualified clinician signs. The sign-off dialog offers to send it, or to play the site's clinician in the demo.</p> : null}
          {so.state === "signed" && so.overall ? (
            <Banner tone="good" title={`Signed off by ${signer?.name ?? so.overall.by}${signer?.credentials ? `, ${signer.credentials}` : ""}`} action={<Button size="sm" icon={RotateCcw} disabled={!clinician} onClick={() => setAmending("overall")}>Amend</Button>}>
              {stamp(so.overall.at)} · version {so.overall.version}{so.overall.rolePlay ? " (demo role-play)" : ""}. Amending keeps this version and starts a new one.
            </Banner>
          ) : null}
          {so.state === "stale" && so.overall ? (
            <Banner tone="mid" title="Something changed after the sign-off" action={<Button size="sm" icon={RotateCcw} disabled={!clinician} onClick={() => setAmending("overall")}>Amend the sign-off</Button>}>
              Signed by {signer?.name ?? so.overall.by}, {stamp(so.overall.at)}, version {so.overall.version}. Resolve the items below, then sign the new version.
            </Banner>
          ) : null}
        </CardBody>
        <SignoffRows recordId={record.id} rows={so.rows} canAmend={clinician} onAmend={(row) => setAmending(row)} />
      </Card>

      {so.state !== "signed" ? (
        <Card data-card="signoff-action">
          <CardHeader title={so.state === "ready" ? "Sign off the assessment" : "Before the sign-off"} />
          <CardBody className="flex flex-col gap-3">
            {so.blockers.length ? (
              <ul className="flex flex-col gap-2" id="signoff-blockers" data-blockers>
                {so.blockers.map((b) => (
                  <li key={b.id} className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5">
                    <CircleAlert size={16} className="ico mt-0.5 text-mid" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-[13px]">{b.text}</span>
                    {b.configure ? <button type="button" onClick={onConfigure} className="shrink-0 text-[12px] font-semibold text-forest hover:underline">Configure</button> : b.to ? <Link to={workspaceHref(record.id, b.to)} className="shrink-0 text-[12px] font-semibold text-forest hover:underline">Go to it</Link> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-good-ink">Every required module is signed and no evidence waits for a decision.</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={PenLine} disabled={so.blockers.length > 0} aria-describedby={so.blockers.length ? "signoff-blockers" : undefined} onClick={() => setSigning(true)} data-signoff-button>Sign off the assessment</Button>
              {!record.config ? <Button icon={Settings2} onClick={onConfigure}>Configure intake</Button> : null}
              {so.blockers.length ? <span className="text-[12px] text-muted">{so.blockers.length} {so.blockers.length === 1 ? "thing blocks" : "things block"} the sign-off</span> : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <SignOffDialog open={signing} onClose={() => setSigning(false)} record={record} title="Sign off the assessment" attestation={ATTESTATION} signLabel="Sign off" onSign={(who, rolePlay) => signOffAssessment(record.id, who.id, rolePlay)} />
      {amending ? <AmendDialog title={amending === "overall" ? "Amend the sign-off" : `Amend ${amending.label}`} onClose={() => setAmending(null)} onConfirm={amend} /> : null}
    </div>
  );
}
