import { useState } from "react";
import { AgentChip, Button, InfoTip, Pill, TextArea } from "@/components/ui";
import { SAFETY_PROMPTS } from "@/data/intake/scripts";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName, SourceLink, ValueMeta } from "../shared/provenance";
import { safetyByPerson, useClinicianActor } from "./model";

/** Safety and risk screening. Structured prompts a clinician records, the clinician's own documentation, and any AI draft of what was
    heard, which is only ever a starting point: AI never finalizes risk, and accepting a draft as it stands is not offered. */
export function SafetyField({ record, readOnly, feeds }: { record: IntakeRecord; readOnly: boolean; feeds?: string[] }) {
  const actor = useClinicianActor(record);
  const documentSafety = useStore((s) => s.documentSafety);
  const setPrompt = useStore((s) => s.setSafetyPrompt);
  const decide = useStore((s) => s.decideSuggestion);
  const fv = record.assessment.fields.safety;
  const drafts = record.suggestions.filter((x) => x.section === "assessment" && x.field === "safety" && x.status === "pending");
  const prompts = record.assessment.safetyPrompts ?? {};
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [from, setFrom] = useState<string[]>([]);
  const byPerson = safetyByPerson(record);
  const recorded = SAFETY_PROMPTS.filter((p) => prompts[p.id]).length;
  const open = (initial: string, ids: string[]) => {
    setText(initial);
    setFrom(ids);
    setEditing(true);
  };
  const save = () => {
    documentSafety(record.id, { value: text.trim(), by: actor.staff.id, rolePlay: actor.rolePlay, fromSuggestions: from });
    setEditing(false);
  };
  const rolePlayNote = actor.rolePlay ? (
    <p className="text-[12px] text-mid-ink">
      Only a qualified clinician documents this. You are viewing as {actor.viewer?.name ?? "a non-clinician"}, so it is recorded as {actor.staff.name} (demo role-play).
    </p>
  ) : null;

  return (
    <div data-field="assessment.safety" className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-[13px] font-semibold text-ink2">Safety and risk screening<span className="ml-1 text-risk" aria-label="required">*</span></h4>
          <Pill tone={byPerson ? "good" : "mid"}>{byPerson ? "Documented by a clinician" : "A clinician documents this"}</Pill>
          <InfoTip label="About the safety and risk screening">AI may draft what it heard in a conversation. It never decides that a person is safe and never finalizes risk. A clinician records each prompt and documents the screening in their own words.</InfoTip>
        </div>
        {!readOnly && !editing ? (
          <button type="button" onClick={() => open(fv?.value ?? "", [])} className="text-[12px] font-semibold text-forest hover:underline">
            {fv?.value ? "Edit documentation" : "Document"}
          </button>
        ) : null}
      </div>

      {feeds?.length ? <p data-feeds="safety" className="mt-0.5 text-[12px] text-muted">Feeds: {feeds.join(", ")}</p> : null}
      <div className="mt-2 rounded-xl border border-line">
        <p className="border-b border-line px-3 py-1.5 text-[12px] text-muted">Structured prompts · {recorded} of {SAFETY_PROMPTS.length} recorded</p>
        <ul>
          {SAFETY_PROMPTS.map((p) => {
            const v = prompts[p.id];
            return (
              <li key={p.id} data-prompt={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-3 py-2 last:border-b-0">
                <span className="min-w-0 flex-1 text-[13px]">{p.text}</span>
                {readOnly ? (
                  <span className="text-[13px] font-medium">{v?.response ?? "Not recorded"}</span>
                ) : (
                  <select
                    aria-label={p.text}
                    value={v?.response ?? ""}
                    onChange={(e) => e.target.value && setPrompt(record.id, p.id, e.target.value, actor.staff.id, actor.rolePlay)}
                    className={cn("h-8 w-[220px] max-w-full rounded-lg border bg-white px-2 text-[12px]", v ? "border-line" : "border-field text-muted")}
                  >
                    <option value="">Not recorded</option>
                    {p.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                )}
                {v ? <span className="w-full text-[11px] text-muted">{actorName(v.by)} · {stamp(v.at)}</span> : null}
              </li>
            );
          })}
        </ul>
      </div>
      {!readOnly && !editing && rolePlayNote ? <div className="mt-1.5">{rolePlayNote}</div> : null}

      {drafts.length && !readOnly ? (
        <div className="mt-2 space-y-2">
          {drafts.map((d) => (
            <div key={d.id} data-suggestion={d.id} className="rounded-xl border border-mid-edge bg-mid-bg/50 px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <AgentChip agent={d.agent} />
                <span className="font-semibold text-ink2">AI-drafted risk information</span>
                <Pill tone="mid">Needs a clinician</Pill>
              </div>
              <p className="mt-1.5 text-[14px]">{d.value}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <SourceLink record={record} source={d.source} />
                {d.source.quote ? <span className="text-[12px] text-muted italic">“{d.source.quote}”</span> : null}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={() => open([fv?.value, d.value].filter(Boolean).join("\n"), drafts.map((x) => x.id))}>Document from this draft</Button>
                <Button size="sm" onClick={() => decide(record.id, d.id, "rejected")}>Dismiss the draft</Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {editing ? (
        <div className="mt-2 space-y-2">
          <TextArea aria-label="Safety and risk screening documentation" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="What was asked, what the person said, and the clinician's plan" />
          {rolePlayNote}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" disabled={!text.trim()} onClick={save}>{actor.rolePlay ? `Save as ${actor.staff.name} (demo)` : "Save"}</Button>
            <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : fv?.value ? (
        <div className="mt-2">
          <p className="text-[14px] whitespace-pre-line">{fv.value}</p>
          <ValueMeta record={record} fv={fv} />
          {!byPerson ? <p className="mt-1 text-[12px] text-mid-ink">This text did not come from a clinician. A clinician documents the screening before the assessment can be signed.</p> : null}
        </div>
      ) : (
        <p className="mt-2 text-[14px] text-risk-ink">Not documented by a clinician yet</p>
      )}
    </div>
  );
}
