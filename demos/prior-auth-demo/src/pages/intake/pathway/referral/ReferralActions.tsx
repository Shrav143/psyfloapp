import { useState } from "react";
import { CalendarCheck, CheckCheck, ClipboardCheck, MailPlus, RotateCcw, Send, Sparkles, Undo2 } from "lucide-react";
import { Button, Field, Pill, TextArea, TextInput } from "@/components/ui";
import { CHANNEL_LABEL } from "@/data/intake/destinations";
import { REFERRAL_OUT_LABEL, type IntakeRecord, type ReferralOut, type ReferralOutStatus } from "@/data/intake/types";
import { DAY, longDate } from "@/lib/time";
import { useStore } from "@/store";
import { fromIso, isoOf } from "../../cans/cansModel";
import { draftFollowUp, preparePacket } from "./referralAgents";
import { isOverdue, readyProblems, REPLIES, WAITING } from "./referralModel";
import { SendReferralModal } from "./SendReferralModal";

/** What a person can do with a referral at its current status, the follow-up, and the labeled demo control for the receiving organization's replies. */
export function ReferralActions({ record, ro, onRedirect }: { record: IntakeRecord; ro: ReferralOut; onRedirect: () => void }) {
  const setStatus = useStore((s) => s.setReferralStatus);
  const update = useStore((s) => s.updateReferralOut);
  const clock = useStore((s) => s.clock);
  const [sending, setSending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [appt, setAppt] = useState({ date: isoOf(clock + 7 * DAY), time: "10:00" });
  const [disp, setDisp] = useState("");
  const busy = record.tasks.some((t) => t.role === "coordination" && t.source === ro.id && (t.status === "queued" || t.status === "running"));
  const problems = readyProblems(ro);
  const channel = CHANNEL_LABEL[ro.destination.channel].toLowerCase();

  return (
    <div className="space-y-3">
      {ro.status === "draft" ? (
        <div className="space-y-2">
          {problems.length ? <ul className="list-disc pl-5 text-[13px] text-risk-ink" aria-label="Before it is ready">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" icon={ClipboardCheck} disabled={!!problems.length} onClick={() => setStatus(record.id, ro.id, "ready", { action: "Marked ready to send", detail: "Consent on file; required documents attached" })}>Mark ready to send</Button>
            <Button size="sm" icon={Sparkles} loading={busy} onClick={() => preparePacket(record.id, ro.id)}>Referral Coordination Agent: prepare packet</Button>
          </div>
        </div>
      ) : null}
      {ro.status === "ready" ? (
        <div className="flex flex-wrap gap-2">
          {!ro.packet ? <Button size="sm" variant="primary" icon={Sparkles} loading={busy} onClick={() => preparePacket(record.id, ro.id)}>Referral Coordination Agent: prepare packet</Button> : null}
          <Button size="sm" variant={ro.packet ? "primary" : "outline"} icon={Send} disabled={!ro.packet} onClick={() => setSending(true)}>Approve and send (simulated)</Button>
          <Button size="sm" icon={Undo2} onClick={() => setStatus(record.id, ro.id, "draft", { action: "Moved back to draft" })}>Back to draft</Button>
          {!ro.packet ? <span className="self-center text-[12px] text-muted">The agent prepares the packet first; a person approves it.</span> : null}
        </div>
      ) : null}

      {WAITING.includes(ro.status) ? (
        <div className="space-y-2 rounded-xl border border-line px-3.5 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Follow-up date" className="w-[180px]">
              <TextInput type="date" value={ro.followUpAt !== undefined ? isoOf(ro.followUpAt) : ""} onChange={(e) => { const at = fromIso(e.target.value); if (at !== null) update(record.id, ro.id, { followUpAt: at }, { action: `Set the follow-up date to ${longDate(at)}` }); }} />
            </Field>
            {isOverdue(ro, clock) ? <Pill tone="risk">Follow-up overdue</Pill> : ro.followUpAt !== undefined ? <Pill tone="neutral">Follow up by {longDate(ro.followUpAt)}</Pill> : null}
            <Button size="sm" icon={Sparkles} loading={busy} onClick={() => draftFollowUp(record.id, ro.id)}>Referral Coordination Agent: draft a follow-up</Button>
          </div>
          {ro.followUpDraft ? <FollowUpDraft record={record} ro={ro} channel={channel} /> : null}
        </div>
      ) : null}

      {ro.status === "needs_info" ? (
        <div className="space-y-2 rounded-xl border border-mid-edge bg-mid-bg/50 px-3.5 py-3">
          <p className="text-[13px] text-ink"><b>{ro.destination.org} asks:</b> {ro.infoRequest ?? "More information"}</p>
          <Field label="Your answer"><TextArea rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} /></Field>
          <Button size="sm" variant="primary" icon={Send} disabled={!answer.trim()} onClick={() => { setStatus(record.id, ro.id, "under_review", { action: `Answered the information request by ${channel} (simulated)`, detail: answer.trim(), patch: { infoRequest: undefined } }); setAnswer(""); }}>Send answer (simulated)</Button>
        </div>
      ) : null}
      {ro.status === "accepted" ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Appointment date" className="w-[180px]"><TextInput type="date" value={appt.date} onChange={(e) => setAppt((a) => ({ ...a, date: e.target.value }))} /></Field>
          <Field label="Time" className="w-[130px]"><TextInput type="time" value={appt.time} onChange={(e) => setAppt((a) => ({ ...a, time: e.target.value }))} /></Field>
          <Button size="sm" variant="primary" icon={CalendarCheck} disabled={fromIso(appt.date) === null} onClick={() => {
            const d = fromIso(appt.date);
            if (d === null) return;
            const [h, m] = appt.time.split(":").map(Number);
            const at = d + (h || 0) * 60 + (m || 0);
            setStatus(record.id, ro.id, "scheduled", { action: `Recorded the appointment: ${longDate(at)} at ${appt.time}`, patch: { appointmentAt: at } });
          }}>Record appointment</Button>
        </div>
      ) : null}
      {ro.status === "scheduled" ? (
        <div className="space-y-2">
          <Field label="Final disposition" hint="For example: attended the first appointment; care continues there."><TextInput value={disp} onChange={(e) => setDisp(e.target.value)} /></Field>
          <Button size="sm" variant="primary" icon={CheckCheck} disabled={!disp.trim()} onClick={() => setStatus(record.id, ro.id, "completed", { action: "Marked the referral completed", detail: disp.trim(), patch: { disposition: disp.trim() } })}>Mark completed</Button>
        </div>
      ) : null}
      {ro.status === "declined" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-[13px] text-ink">Declined: {ro.reason ?? "No reason given"}</p>
          <Button size="sm" icon={RotateCcw} onClick={onRedirect}>Redirect: new referral</Button>
        </div>
      ) : null}
      {ro.status === "completed" && ro.disposition ? <p className="text-[13px] text-ink">Final disposition: {ro.disposition}</p> : null}

      {REPLIES[ro.status] ? <DemoReplies record={record} ro={ro} options={REPLIES[ro.status] ?? []} /> : null}
      {sending ? <SendReferralModal record={record} ro={ro} onClose={() => setSending(false)} /> : null}
    </div>
  );
}

function FollowUpDraft({ record, ro, channel }: { record: IntakeRecord; ro: ReferralOut; channel: string }) {
  const update = useStore((s) => s.updateReferralOut);
  const clock = useStore((s) => s.clock);
  const [text, setText] = useState(ro.followUpDraft?.text ?? "");
  return (
    <div data-followup-draft className="space-y-2 rounded-lg bg-mid-bg/50 px-3 py-2.5">
      <Pill tone="mid">AI-generated draft · sending needs a person</Pill>
      <TextArea rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label="Follow-up message" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="primary" icon={MailPlus} disabled={!text.trim()} onClick={() => update(record.id, ro.id, { followUpDraft: undefined, followUpAt: clock + 2 * DAY }, { action: `Sent a follow-up by ${channel} (simulated)`, detail: text.trim(), resolve: "A person sent the follow-up (simulated)" })}>Send follow-up (simulated)</Button>
        <Button size="sm" onClick={() => update(record.id, ro.id, { followUpDraft: undefined }, { action: "Discarded the follow-up draft", resolve: "A person discarded the draft" })}>Discard</Button>
      </div>
    </div>
  );
}

const REPLY_ACTION: Partial<Record<ReferralOutStatus, string>> = {
  received: "Confirmed receipt (demo reply)", under_review: "Started its review (demo reply)", accepted: "Accepted the referral (demo reply)",
  needs_info: "Asked for more information (demo reply)", declined: "Declined the referral (demo reply)",
};

/** A labeled demo control: stands in for the receiving organization's replies, which would arrive by the referral channel. */
function DemoReplies({ record, ro, options }: { record: IntakeRecord; ro: ReferralOut; options: ReferralOutStatus[] }) {
  const setStatus = useStore((s) => s.setReferralStatus);
  const [mode, setMode] = useState<"needs_info" | "declined" | null>(null);
  const [text, setText] = useState("");
  const reply = (st: ReferralOutStatus, detail?: string) => {
    setStatus(record.id, ro.id, st, {
      actor: "destination", action: REPLY_ACTION[st] ?? `${REFERRAL_OUT_LABEL[st]} (demo reply)`, detail,
      patch: st === "needs_info" ? { infoRequest: detail } : st === "declined" ? { reason: detail, disposition: "Declined by the receiving organization" } : undefined,
    });
    setMode(null);
    setText("");
  };
  return (
    <div data-demo-replies className="rounded-xl border border-dashed border-field px-3.5 py-3">
      <p className="text-[12px] font-semibold text-muted">Destination reply (demo control) · stands in for {ro.destination.org}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((st) => (
          <Button key={st} size="sm" onClick={() => (st === "needs_info" || st === "declined" ? setMode(st) : reply(st))}>{REFERRAL_OUT_LABEL[st]}</Button>
        ))}
      </div>
      {mode ? (
        <div className="mt-2 space-y-2">
          <Field label={mode === "needs_info" ? "What they ask for" : "Their reason"}>
            <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === "needs_info" ? "For example: the most recent psychiatry note" : "For example: no openings this month"} />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={!text.trim()} onClick={() => reply(mode, text.trim())}>Record reply</Button>
            <Button size="sm" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
