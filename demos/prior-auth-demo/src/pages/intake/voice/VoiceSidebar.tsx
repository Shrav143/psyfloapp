import { useState } from "react";
import { Check, CircleCheck, CircleDashed, CircleDot, Pencil } from "lucide-react";
import { Button, Card, CardBody, CardHeader, InfoTip, Pill, TextInput } from "@/components/ui";
import { SECTION_LABEL, type IntakeRecord, type Suggestion, type VoiceSession } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { labelOfCollected, missingRequired, onRecord, scriptOf } from "./engine";

const ORDER: VoiceSession["status"][] = ["identity", "language", "role", "consent", "questions", "summary", "confirm", "saved"];
const STEP_LABEL: Partial<Record<VoiceSession["status"], string>> = { identity: "Confirm identity", language: "Language", role: "The assistant's role", consent: "Consent", questions: "Intake questions", summary: "Read-back", confirm: "Caller confirms facts", saved: "Draft saved for staff review" };
const clock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

function Fact({ record, v, c, label, canConfirm }: { record: IntakeRecord; v: VoiceSession; c: Suggestion; label: string; canConfirm: boolean }) {
  const confirm = useStore((s) => s.voiceConfirm);
  const correct = useStore((s) => s.voiceCorrect);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.value);
  const ok = v.confirmed?.includes(c.id);
  const fixed = v.corrected?.includes(c.id);
  return (
    <li data-collected={c.field} className="border-b border-line py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-semibold text-ink2">{label}</span>
        <span className="text-[11px] text-muted">{SECTION_LABEL[c.section]}</span>
        {fixed ? <Pill tone="mid">Corrected</Pill> : ok ? <Pill tone="good">Caller confirmed</Pill> : <Pill>Draft</Pill>}
      </div>
      {editing ? (
        <form className="mt-1.5 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); correct(record.id, c.id, text); setEditing(false); }}>
          <TextInput value={text} onChange={(e) => setText(e.target.value)} aria-label={`Correct ${label}`} className="h-8 flex-1 text-[13px]" />
          <Button size="sm" type="submit" variant="primary">Save</Button>
        </form>
      ) : (
        <p className="mt-0.5 text-[13px]">{c.value}</p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-muted">
        <span>Call {clock(c.source.at ?? 0)}</span>
        {canConfirm && !editing ? (
          <>
            {!ok && !fixed ? <button type="button" onClick={() => confirm(record.id, c.id)} className="inline-flex items-center gap-1 font-semibold text-forest hover:underline"><Check size={13} className="ico" />Caller confirmed</button> : null}
            <button type="button" onClick={() => { setText(c.value); setEditing(true); }} className="inline-flex items-center gap-1 font-semibold text-forest hover:underline"><Pencil size={12} className="ico" />Correct</button>
          </>
        ) : null}
      </div>
    </li>
  );
}

/** The right side of the call: where the call is, what was collected (as drafts), the questions asked or skipped, and what is still missing. */
export function VoiceSidebar({ record, v }: { record: IntakeRecord; v: VoiceSession }) {
  const confirmAll = useStore((s) => s.voiceConfirm);
  const script = scriptOf(record);
  const labelOf = labelOfCollected(record);
  const collected = v.collected ?? [];
  const questions = script.steps.filter((s) => s.kind === "question");
  const missing = missingRequired(record, v);
  const at = ORDER.indexOf(v.status === "escalated" || v.status === "transferred" ? "questions" : v.status);
  const canConfirm = v.status === "confirm" || v.status === "summary" || v.status === "transferred" || v.status === "escalated";
  const open = collected.filter((c) => !v.confirmed?.includes(c.id) && !v.corrected?.includes(c.id)).length;

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
      <Card>
        <CardBody className="py-3">
          <ol className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {ORDER.map((s, i) => {
              const done = i < at || v.status === "saved";
              const cur = i === at && v.status !== "saved";
              const Icon = done ? CircleCheck : cur ? CircleDot : CircleDashed;
              return (
                <li key={s} className={cn("flex items-center gap-1.5 text-[12px]", cur ? "font-semibold text-ink" : done ? "text-ink2" : "text-muted")}>
                  <Icon size={14} className={cn("ico", done ? "text-good" : cur ? "text-forest" : "text-faint")} aria-label={done ? "Done" : cur ? "Now" : "Not yet"} />
                  {STEP_LABEL[s]}{s === "questions" ? ` (${v.asked.filter((id) => questions.some((q) => q.id === id)).length}/${questions.length})` : ""}
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Collected for staff review" right={<Pill tone="mid">Draft</Pill>} />
        <CardBody className="py-2">
          {collected.length ? (
            <ul>{collected.map((c) => <Fact key={c.id} record={record} v={v} c={c} label={labelOf(c)} canConfirm={canConfirm && v.status !== "saved"} />)}</ul>
          ) : (
            <p className="py-2 text-[13px] text-muted">Nothing yet. Answers appear here as the caller gives them.</p>
          )}
          {canConfirm && v.status !== "saved" && collected.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
              <span className="text-[12px] text-muted">{open ? `${open} not confirmed yet` : "Every fact confirmed or corrected"}</span>
              {open ? <Button size="sm" icon={Check} onClick={() => confirmAll(record.id, "all")}>Caller confirmed the rest</Button> : null}
            </div>
          ) : null}
          <p className="mt-2 text-[12px] text-muted">Nothing here is verified. Staff accept, edit or reject each item in its section.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Questions" right={<InfoTip label="About the questions" align="end">The assistant asks approved intake questions one at a time and skips anything already on file. It never asks for a diagnosis, rates anything or decides eligibility.</InfoTip>} />
        <CardBody className="py-2">
          <ul className="space-y-1.5">
            {questions.map((q) => {
              const skipped = v.skipped?.includes(q.id);
              const asked = v.asked.includes(q.id) && !skipped;
              const has = q.onFile && onRecord(record, q.onFile.section, q.onFile.field);
              return (
                <li key={q.id} data-question={q.id} className="flex items-start gap-2 text-[13px]">
                  {skipped ? <Pill>On file, skipped</Pill> : asked ? <Pill tone="good">Asked</Pill> : q.missingOnly ? <Pill tone="mid">If missing</Pill> : has && v.status === "idle" ? <Pill>On file</Pill> : <Pill>To ask</Pill>}
                  <span className={cn("min-w-0 flex-1", skipped && "text-muted")}>{q.onFile?.label ?? q.id}</span>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Missing for intake" right={<span className="text-[12px] text-muted">{missing.length}</span>} />
        <CardBody className="py-2">
          {missing.length ? (
            <ul className="space-y-1.5">
              {missing.map((m) => (
                <li key={m.field} className="text-[13px]">
                  <span className="font-medium">{m.label}</span>
                  <span className="ml-1.5 text-[12px] text-muted">{m.how === "staff" ? "Staff collect it" : m.how === "asks" ? "The assistant asks for it" : "Not asked on this call"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">No required item is missing.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
