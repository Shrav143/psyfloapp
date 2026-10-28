import { useState } from "react";
import { Check, CheckCheck, Pencil, X } from "lucide-react";
import { Button, InfoTip, Pill, TextArea } from "@/components/ui";
import { type IntakeRecord, type ScribeSession, type Suggestion } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { valueOf } from "../shared/provenance";
import { clockOf, destinationOf, isRiskProposal, isVerifiedSource, reviewGroups, type ReviewGroup } from "./engine";
import { textFields } from "./route";

type Decision = "accepted" | "edited" | "rejected";
const DECIDED: Record<Decision, string> = { accepted: "Accepted", edited: "Edited and accepted", rejected: "Rejected" };

export function Decide({ onDecide, initial, label }: { onDecide: (d: Decision, edited?: string) => void; initial: string; label: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial);
  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <TextArea value={text} onChange={(e) => setText(e.target.value)} rows={4} aria-label={`Edit ${label}`} />
        <div className="flex gap-2">
          <Button size="sm" variant="primary" icon={Check} disabled={!text.trim()} onClick={() => { onDecide("edited", text.trim()); setEditing(false); }}>Save edit</Button>
          <Button size="sm" onClick={() => { setEditing(false); setText(initial); }}>Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button size="sm" variant="primary" icon={Check} aria-label={`Accept ${label}`} onClick={() => onDecide("accepted")}>Accept</Button>
      <Button size="sm" icon={Pencil} aria-label={`Edit ${label}`} onClick={() => setEditing(true)}>Edit</Button>
      <Button size="sm" icon={X} aria-label={`Reject ${label}`} onClick={() => onDecide("rejected")}>Reject</Button>
    </div>
  );
}

function Proposal({ record, session, sg, review, onSource }: { record: IntakeRecord; session: ScribeSession; sg: Suggestion; review: boolean; onSource: (turnId: string) => void }) {
  const decide = useStore((s) => s.scribeDecideField);
  const retarget = useStore((s) => s.scribeRetarget);
  const risk = isRiskProposal(sg);
  const decided = sg.status !== "pending";
  const verified = isVerifiedSource(record, session, sg);
  const label = destinationOf(record, sg);
  const onFile = !sg.moduleId && !risk && (sg.section === "assessment" || sg.section === "referral" || sg.section === "profile" || sg.section === "coverage") ? valueOf(record, sg.section, sg.field) : "";
  const fields = sg.moduleId ? textFields(sg.moduleId) : [];
  return (
    <div data-extract={sg.field} data-module={sg.moduleId} data-verified={verified} className={cn("rounded-xl border px-3.5 py-3", decided ? "border-line bg-tile/40" : risk ? "border-mid-edge bg-mid-bg/50" : "border-line bg-white")}>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="font-semibold text-ink2">{label}</span>
        <Pill tone={sg.confidence === "high" ? "good" : sg.confidence === "medium" ? "mid" : "risk"}>Confidence: {sg.confidence}</Pill>
        {decided ? <Pill tone={sg.status === "rejected" ? "neutral" : "good"}>{DECIDED[sg.status as Decision]}</Pill> : risk ? <Pill tone="mid">For a clinician to document</Pill> : <Pill tone="mid">AI suggested, needs confirmation</Pill>}
        {!decided && !risk ? <Pill tone={verified ? "good" : "neutral"}>{verified ? "Source verified" : "Check the source"}</Pill> : null}
      </div>
      <p className={cn("mt-1.5 text-[14px]", sg.status === "rejected" && "text-muted line-through")}>{sg.status === "edited" ? sg.editedValue : sg.value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        {sg.source.blockId ? (
          <button type="button" onClick={() => onSource(sg.source.blockId!)} className="font-medium text-forest hover:underline">Transcript {clockOf(sg.source.at ?? 0)}</button>
        ) : null}
        {sg.source.quote ? <span className="text-muted italic">“{sg.source.quote}”</span> : null}
      </div>
      {sg.moduleId && review && !decided && fields.length > 1 ? (
        <label className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          Goes to
          <select aria-label={`Field for ${label}`} value={sg.field} onChange={(e) => retarget(record.id, sg.id, e.target.value)} className="h-8 max-w-full rounded-lg border border-line bg-white px-2 text-[12px] text-ink2">
            {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </label>
      ) : null}
      {onFile ? <p className="mt-1.5 text-[12px] text-muted">On file now: {onFile}</p> : null}
      {risk ? <p className="mt-1.5 text-[12px] text-mid-ink">It goes to Safety and risk screening as a draft. AI never finalizes risk: a clinician documents it.</p> : null}
      {review && !decided ? (
        risk ? (
          <div className="mt-2"><Button size="sm" icon={X} aria-label={`Reject ${label}`} onClick={() => decide(record.id, sg.id, "rejected")}>Reject</Button></div>
        ) : (
          <Decide label={label} initial={sg.value} onDecide={(d, e) => decide(record.id, sg.id, d, e)} />
        )
      ) : null}
    </div>
  );
}

function Group({ record, session, group, review, onSource }: { record: IntakeRecord; session: ScribeSession; group: ReviewGroup; review: boolean; onSource: (turnId: string) => void }) {
  const open = group.items.filter((x) => x.status === "pending").length;
  return (
    <section data-group={group.id} aria-label={group.title} className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-[13px] font-semibold text-ink2">{group.title}</h4>
        <span className="text-[12px] text-muted">{group.items.length} {group.items.length === 1 ? "proposal" : "proposals"}{review && open ? `, ${open} to decide` : ""}</span>
        {group.kind === "module" ? <Pill>Assessment module</Pill> : null}
      </div>
      {group.items.map((sg) => <Proposal key={sg.id} record={record} session={session} sg={sg} review={review} onSource={onSource} />)}
    </section>
  );
}

/** The scribe's proposals, by where they go: a clinician's risk list first, then one group per assessment module, the CANS evidence themes and the shared sections.
    "Accept all verified-source items" is a convenience for the person reviewing; it never includes risk information and never runs by itself. */
export function ScribeFields({ record, session, review, onSource }: { record: IntakeRecord; session: ScribeSession; review: boolean; onSource: (turnId: string) => void }) {
  const acceptVerified = useStore((s) => s.scribeAcceptVerified);
  const toast = useStore((s) => s.toast);
  const groups = reviewGroups(session);
  const pending = (session.extracted ?? []).filter((x) => x.status === "pending" && !isRiskProposal(x));
  const verified = pending.filter((x) => isVerifiedSource(record, session, x)).length;
  if (!groups.length) return <p className="py-8 text-center text-[13px] text-muted">No proposals yet. They appear as the conversation covers each topic.</p>;
  return (
    <div className="space-y-4">
      {review ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-tile/50 px-3 py-2.5">
          <Button size="sm" icon={CheckCheck} disabled={!verified} onClick={() => { const n = acceptVerified(record.id); toast({ title: `${n} proposals accepted`, body: "Each one quotes the transcript line it came from. Risk information was not included.", tone: "good" }); }}>
            Accept all verified-source items ({verified})
          </Button>
          <InfoTip label="About verified sources">A proposal has a verified source when it quotes an unedited transcript line whose speaker label is not in doubt. Risk information, low-confidence items and lines you edited are never included: decide on those one by one.</InfoTip>
          <span className="text-[12px] text-muted">{pending.length - verified} need a closer look</span>
        </div>
      ) : null}
      {groups.map((g) => <Group key={g.id} record={record} session={session} group={g} review={review} onSource={onSource} />)}
    </div>
  );
}
