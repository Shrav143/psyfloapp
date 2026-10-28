import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Trash2 } from "lucide-react";
import { Button, Dropdown, Pill } from "@/components/ui";
import { INTAKE_STAFF, staffOf } from "@/data/intake/seed";
import { riskFindings, type DuplicateHit } from "@/data/intake/referralFacts";
import { TRIAGE_LABEL, type IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { isReferralDraftId } from "@/store/intakeReferral";
import { AcceptDialog } from "./AcceptDialog";
import { ConfirmFields } from "./ConfirmFields";
import { STATUS_TONE_REF } from "./labels";
import { conflictsOf, referralGaps } from "./missing";
import { DeclineDialog, RedirectDialog } from "./RedirectDeclineDialogs";
import { RequestInfoDialog } from "./RequestInfoDialog";

type Dialog = "accept" | "redirect" | "decline" | "request" | null;

/** What stops a referral being accepted, in words. Empty means it is ready. */
export function acceptBlockers(r: IntakeRecord, dupPending: boolean): string[] {
  return [
    ...referralGaps(r).filter((g) => g.blocking).map((g) => g.ask),
    ...conflictsOf(r).map((c) => `Confirm the conflict on ${c.key === "plan" ? "the plan" : c.key}`),
    ...(dupPending ? ["Decide about the possible duplicate"] : []),
  ];
}

/** The decision for a referral that is still a referral (New or Needs information): confirm values, assign, ask for what is missing, accept, redirect or
    decline. A draft becomes the record the moment a person decides. Redirect and decline wait while risk information has no clinician review. */
export function DecisionBar({ record, dups = [], dupChosen = false, hideRequest = false }: { record: IntakeRecord; dups?: DuplicateHit[]; dupChosen?: boolean; hideRequest?: boolean }) {
  const nav = useNavigate();
  const me = useStore((s) => meOf(s));
  const assign = useStore((s) => s.assignIntakeReferral);
  const save = useStore((s) => s.saveIntakeDraft);
  const discard = useStore((s) => s.discardIntakeDraft);
  const toast = useStore((s) => s.toast);
  const [dialog, setDialog] = useState<Dialog>(null);
  const draft = isReferralDraftId(record.id);
  const dupPending = draft && dups.length > 0 && !dupChosen;
  const blockers = acceptBlockers(record, dupPending);
  const staff = staffOf(me);
  const canAct = staff?.role !== "Billing";
  const risk = record.safety ? record.safety.status === "open" : riskFindings(record).length > 0;
  const gaps = referralGaps(record).length;
  const close = () => setDialog(null);
  const toRecord = (id: string) => {
    close();
    nav(paths.intakeRecord(id, "referral"));
  };
  const afterAccept = (id: string) => {
    close();
    nav(paths.configure(id));
  };

  return (
    <div data-decision-bar className={cn("rounded-[20px] border border-edge bg-white px-5 py-4 @min-[900px]:sticky @min-[900px]:top-[76px] @min-[900px]:z-20")}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={STATUS_TONE_REF[record.triage]}>{TRIAGE_LABEL[record.triage]}</Pill>
            {draft ? <Pill>Draft, not saved</Pill> : null}
            {risk ? <Pill tone="risk">Risk information: a clinician reviews</Pill> : null}
          </div>
          <p className="mt-1.5 text-[13px] text-ink2" data-readiness>
            {blockers.length ? <>To accept: {blockers.join("; ")}.</> : "Ready to accept for assessment."}
            {risk ? " Declining or redirecting waits for a clinician." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConfirmFields record={record} disabled={!canAct} />
          <Dropdown<string>
            variant="field" ariaLabel="Assign clinician" className="w-[210px]" value={record.assignedTo} menuWidth={300}
            options={INTAKE_STAFF.map((x) => ({ value: x.id, label: x.name, hint: x.role }))}
            onChange={(v) => { assign(record.id, v); toast({ title: `Assigned to ${staffOf(v)?.name ?? v}`, tone: "neutral" }); }}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!hideRequest ? <Button onClick={() => setDialog("request")} disabled={!canAct} data-request-info-bar>Request missing information{gaps ? ` (${gaps})` : ""}</Button> : null}
        <Button onClick={() => setDialog("redirect")} disabled={!canAct || risk || dupPending} data-redirect>Redirect</Button>
        <Button variant="danger" onClick={() => setDialog("decline")} disabled={!canAct || risk || dupPending} data-decline>Decline</Button>
        <Button variant="primary" onClick={() => setDialog("accept")} disabled={!canAct || blockers.length > 0} data-accept className="ml-auto">Accept for assessment</Button>
      </div>
      {draft ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Button size="sm" icon={Save} disabled={dupPending} onClick={() => { const id = save(record.id); if (id) { toast({ title: `${id} saved as a referral`, body: "Status New. Decide when you are ready.", tone: "good" }); nav(paths.intakeRecord(id, "referral")); } }} data-save-referral>Save as a referral</Button>
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => { discard(record.id); nav(paths.createReferral()); }} data-discard-draft>Discard this draft</Button>
          <span className="text-[12px] text-muted">The draft is kept here until you save, decide or discard it.</span>
        </div>
      ) : null}
      {!canAct ? <p className="mt-2 text-[12px] text-muted">You are viewing as {staff?.name} ({staff?.role}). Coordinators and clinicians decide referrals.</p> : null}
      {dialog === "accept" ? <AcceptDialog record={record} onClose={close} onDone={afterAccept} /> : null}
      {dialog === "redirect" ? <RedirectDialog record={record} onClose={close} onDone={toRecord} /> : null}
      {dialog === "decline" ? <DeclineDialog record={record} onClose={close} onDone={toRecord} /> : null}
      {dialog === "request" ? <RequestInfoDialog record={record} onClose={close} onDone={(id) => (draft ? toRecord(id) : close())} /> : null}
    </div>
  );
}
