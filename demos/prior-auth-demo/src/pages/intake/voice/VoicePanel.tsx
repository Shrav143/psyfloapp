import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines, FastForward, Phone, PhoneForwarded, Save, X } from "lucide-react";
import { Banner, Button, Card, CardBody, Modal, Pill } from "@/components/ui";
import { useEscape } from "@/components/ui/escape";
import type { IntakeRecord } from "@/data/intake/types";
import { VOICE_ROLE } from "@/data/intake/scripts";
import { staffOf } from "@/data/intake/seed";
import type { Tone } from "@/data/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { actorName, SimulatedTag } from "../shared/provenance";
import { Bubble, useBodyLock } from "../scribe/overlay";
import { CALL_SECONDS_PER_TICK, CALL_TICK_MS, callActive, scriptedReply, scriptOf, STATUS_LABEL, VOICE_AGENT } from "./engine";
import { VoiceConversation } from "./VoiceConversation";
import { VoiceSidebar } from "./VoiceSidebar";

const TONE: Partial<Record<string, Tone>> = { saved: "good", escalated: "risk", transferred: "neutral", idle: "neutral", confirm: "mid", summary: "mid" };
const clock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const NEVER = ["claims to be a clinician or a person", "promises coverage or admission", "decides eligibility", "diagnoses", "assigns CANS ratings", "makes an emergency determination"];

/** The Voice Intake Assistant: a simulated call run by an intake coordinator with the caller. Distinct from the scribe: here the
    assistant leads a structured conversation, and hands off to a person whenever it should. */
export function VoicePanel({ record, onClose }: { record: IntakeRecord; onClose: () => void }) {
  const nav = useNavigate();
  const st = useStore.getState();
  const v = record.voice;
  const me = useStore((s) => meOf(s));
  const paused = useStore((s) => s.agentPaused[VOICE_AGENT]);
  const [auto, setAuto] = useState(true);
  const [leave, setLeave] = useState(false);
  const active = callActive(v);
  const activeRef = useRef(active);
  activeRef.current = active;
  useBodyLock();

  /* Turn-taking: the assistant speaks after a short pause; the caller's scripted reply follows unless the coordinator answers.
     Keyed on the turn, not the session object, so the call clock ticking does not restart the wait. */
  const phase = v && callActive(v) ? v.phase : undefined;
  const turnKey = `${v?.id}:${v?.turns.length}:${v?.step}:${v?.clarifying}`;
  useEffect(() => {
    if (phase === "assistant") {
      const t = window.setTimeout(() => useStore.getState().voiceSpeak(record.id), 900);
      return () => window.clearTimeout(t);
    }
    if (phase === "caller" && auto) {
      const t = window.setTimeout(() => {
        const r = useStore.getState().intakes.find((x) => x.id === record.id);
        if (r?.voice?.phase === "caller") useStore.getState().voiceReply(record.id, scriptedReply(r, r.voice), { scripted: true });
      }, 1500);
      return () => window.clearTimeout(t);
    }
  }, [phase, turnKey, auto, record.id]);
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => useStore.getState().voiceTick(record.id, CALL_SECONDS_PER_TICK), CALL_TICK_MS);
    return () => window.clearInterval(t);
  }, [active, record.id]);

  const requestClose = () => (activeRef.current ? setLeave(true) : onClose());
  useEscape(!leave, requestClose);

  const status = v?.status ?? "idle";
  const script = scriptOf(record);
  const collected = v?.collected ?? [];
  const unconfirmed = collected.filter((c) => !v?.confirmed?.includes(c.id) && !v?.corrected?.includes(c.id)).length;
  const canSave = !!v && (status === "confirm" ? unconfirmed === 0 : status === "transferred" || status === "escalated") && status !== "saved";
  const save = () => {
    const count = st.voiceSave(record.id);
    st.toast({ title: "Draft saved for staff review", body: `${count} suggestions wait in Referral, Patient profile and Insurance. Nothing was written as verified.`, tone: "good" });
  };
  const runner = staffOf(v?.coordinator ?? me);
  /* A new voice intake may have no initials yet: it is then a new caller, never "Caller Caller". */
  const caller = record.initials ? `Caller ${record.initials}${record.age !== null ? `, ${record.age}` : ""}` : "New caller";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-labelledby="voice-title">
      <header className="border-b border-ink/80 bg-ink px-4 py-3 text-white min-[900px]:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Bubble icon={Phone} className={status === "escalated" ? "bg-risk text-white" : "bg-forest text-white"} />
          <h2 id="voice-title" className="text-[18px] font-semibold">Voice Intake Assistant (simulated call)</h2>
          <span className="text-[14px] text-white/80">{record.id} · {caller}</span>
          <Pill tone={TONE[status] ?? "neutral"} dot={active}>{STATUS_LABEL[status]}</Pill>
          <SimulatedTag what="Simulated call" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {v && status !== "idle" ? <span className="text-[16px] font-semibold tabular-nums" aria-label={`Call time ${clock(v.elapsed ?? 0)}`}>{clock(v.elapsed ?? 0)}</span> : null}
            {active ? (
              <button type="button" onClick={() => st.voiceSkip(record.id)} className="inline-flex h-[38px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-sage hover:bg-white/10">
                <FastForward size={16} className="ico" />
                Skip to read-back (demo)
              </button>
            ) : null}
            {v && status !== "saved" && status !== "transferred" && status !== "idle" ? (
              <Button variant={status === "escalated" ? "danger" : "outline"} icon={PhoneForwarded} onClick={() => st.voiceTransfer(record.id, status === "escalated" ? "Safety concern: connected to a person" : "Coordinator took over the call")}>
                Transfer to staff
              </Button>
            ) : null}
            <button type="button" onClick={requestClose} aria-label="Close the Voice Intake Assistant" className="grid h-9 w-9 place-items-center rounded-xl border border-white/30 text-white hover:bg-white/10">
              <X size={18} className="ico" />
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[12px] text-white/75">
          Simulated call: no telephony, speech recognition or voice vendor is connected. Run by {runner ? `${runner.name} (${runner.role})` : actorName(v?.coordinator ?? me)} with the caller.
        </p>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 min-[900px]:p-5">
        {status === "escalated" ? (
          <Banner tone="risk" title="Safety concern: routine questions stopped" className="mb-3"
            action={<Button variant="primary" icon={PhoneForwarded} onClick={() => st.voiceTransfer(record.id, "Safety concern: connected to a person")}>Transfer to staff now</Button>}>
            The caller said: “{(v?.escalation?.text ?? "").replace(/[.!?]+$/, "")}.” Connect them with a person now. If they are in danger, call 911. The 988 Suicide and Crisis Lifeline takes calls and texts at any time. A safety alert was raised for a clinician. Psyflo makes no emergency determination.
          </Banner>
        ) : null}
        {status === "transferred" ? (
          <Banner tone={v?.escalation ? "risk" : "neutral"} title={`${actorName(v?.transfer?.by ?? me)} is on the call. The assistant stopped.`} className="mb-3">
            {v?.transfer?.reason}. {v?.escalation ? "A clinician reviews the safety alert. " : ""}Save what was collected so staff can review it.
          </Banner>
        ) : null}
        {status === "saved" ? (
          <Banner tone="good" title="Draft saved for staff review" className="mb-3"
            action={<Button size="sm" onClick={() => { onClose(); nav(paths.intakeRecord(record.id, "profile")); }}>Review in Patient profile</Button>}>
            {collected.length} suggestions, each linked to the call transcript, wait in Referral, Patient profile and Insurance. Nothing was written as verified.
          </Banner>
        ) : null}

        {!v || status === "idle" ? (
          <Card className="mx-auto max-w-[640px]">
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <Bubble icon={AudioLines} size={40} className="bg-sage-bg text-forest" />
                <div>
                  <p className="text-[16px] font-semibold">{record.initials ? `Call with ${record.initials}${record.age !== null ? `, ${record.age}` : ""}` : "Call with a new caller"}</p>
                  <p className="text-[13px] text-muted">You stay on the line. The assistant leads, one question at a time, and you can take over at any moment.</p>
                </div>
              </div>
              <p className="rounded-xl bg-tile px-3.5 py-2.5 text-[13px] text-ink2">It introduces itself: “{VOICE_ROLE}”</p>
              <p className="text-[13px] text-ink2">It never {NEVER.slice(0, -1).join(", ")} or {NEVER[NEVER.length - 1]}. It skips what is on file, asks a clarifying question when an answer is vague, reads back a summary for the caller to confirm, and stops for a person on any safety concern.</p>
              {paused ? <p className="rounded-xl bg-mid-bg px-3 py-2 text-[13px] text-mid-ink">The Clinical Documentation Agent is paused in Settings, so the assistant cannot run. Resume it in Settings, or take the call yourself.</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={onClose}>Not now</Button>
                <Button variant="primary" icon={Phone} disabled={paused} onClick={() => st.voiceStart(record.id)}>Start the call</Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid min-h-[480px] grid-cols-1 gap-4 min-[900px]:h-full min-[900px]:min-h-0 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
            <VoiceConversation record={record} v={v} auto={auto} setAuto={setAuto} />
            <VoiceSidebar record={record} v={v} />
          </div>
        )}
      </main>

      {v && status !== "idle" ? (
        <footer className="flex flex-wrap items-center gap-3 border-t border-edge bg-white px-4 py-3 min-[900px]:px-6">
          <p className="min-w-0 flex-1 text-[12px] text-muted">
            {script.callerLabel} · Language {v.language} · {v.consent === true ? "Consented to the call transcript" : v.consent === false ? "Did not consent; handed to staff" : "Consent not asked yet"}. In production a call transcript follows your retention policy and needs a signed BAA with the voice vendor before any real PHI.
          </p>
          {status === "saved" ? (
            <>
              <Button onClick={() => st.voiceRestart(record.id)}>Set up a new call</Button>
              <Button variant="primary" onClick={onClose}>Back to the record</Button>
            </>
          ) : (
            <>
              {status === "confirm" && unconfirmed ? <span className="text-[12px] text-ink2">Confirm or correct {unconfirmed} more {unconfirmed === 1 ? "fact" : "facts"} first</span> : null}
              <Button variant="primary" icon={Save} disabled={!canSave} onClick={save}>{status === "transferred" || status === "escalated" ? "Save what was collected for staff review" : "Save draft for staff review"}</Button>
            </>
          )}
        </footer>
      ) : null}

      <Modal
        open={leave}
        onClose={() => setLeave(false)}
        title="Leave the call screen?"
        size="sm"
        footer={
          <>
            <Button onClick={() => setLeave(false)}>Stay on the call</Button>
            <Button variant="primary" onClick={() => { setLeave(false); onClose(); }}>Leave and hold</Button>
          </>
        }
      >
        <p className="text-[14px]">The simulated call waits where it is. Open the Voice Intake Assistant again to continue, or transfer the caller to staff.</p>
      </Modal>
    </div>
  );
}
