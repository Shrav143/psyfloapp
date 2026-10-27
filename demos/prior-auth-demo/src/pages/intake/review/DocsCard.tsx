import { Link } from "react-router-dom";
import { ArrowRight, FileSearch } from "lucide-react";
import { Card, CardHeader, EmptyState, Pill } from "@/components/ui";
import { NOTE_SECTIONS, SECTION_LABEL, type IntakeRecord, type IntakeSectionId } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { paths } from "@/routes";
import { SimulatedTag, SourceLink } from "../shared/provenance";

const DOC_KIND: Record<IntakeRecord["documents"][number]["kind"], string> = {
  referral: "Referral", fax: "Fax", email: "Email", emr_summary: "EMR summary", school_report: "School report", discharge_summary: "Discharge summary", consent: "Consent", insurance_card: "Insurance card", other: "Document",
};
const SCRIBE_STATE: Record<NonNullable<IntakeRecord["scribe"]>["status"], string> = {
  consent: "Waiting for consent", ready: "Ready to record", recording: "Recording (simulated)", paused: "Paused", stopped: "AI-generated draft, waits for review", reviewing: "AI-generated draft, in review", saved: "Reviewed and saved",
};

/** What is on file: documents (simulated imports say so), the AI Scribe note draft by section, the voice intake draft, and AI suggestions
    still waiting, each with its review state. */
export function DocsCard({ record }: { record: IntakeRecord }) {
  const sc = record.scribe;
  const notes = sc ? NOTE_SECTIONS.filter((s) => sc.noteDraft[s.id]) : [];
  const v = record.voice && record.voice.status !== "idle" ? record.voice : null;
  const bySection = record.suggestions.filter((s) => s.status === "pending").reduce<Partial<Record<IntakeSectionId, number>>>((m, s) => ({ ...m, [s.section]: (m[s.section] ?? 0) + 1 }), {});
  const sections = Object.entries(bySection) as [IntakeSectionId, number][];
  const empty = !record.documents.length && !notes.length && !v && !sections.length;
  return (
    <Card data-card="docs">
      <CardHeader title="Documents and AI drafts" right={<span className="text-[12px] text-muted">{record.documents.length} {record.documents.length === 1 ? "document" : "documents"}</span>} />
      {empty ? (
        <EmptyState icon={FileSearch} title="Nothing on file yet" action={<Link className="text-[13px] font-semibold text-forest hover:underline" to={paths.intakeRecord(record.id, "referral")}>Add a referral document</Link>}>
          Documents, AI Scribe drafts and voice intake drafts appear here with their review state.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {record.documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
              <SourceLink record={record} source={{ kind: "document", ref: d.name, docId: d.id }} className="min-w-0 text-[13px]" />
              <span className="text-[12px] text-muted">{DOC_KIND[d.kind]} · received {stamp(d.receivedAt)}</span>
              {d.simulated ? <SimulatedTag what="Simulated import" /> : null}
            </li>
          ))}
          {sc && sc.status !== "consent" && sc.status !== "ready" ? (
            <li className="px-5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold">AI Scribe note</span>
                <Pill tone={sc.status === "saved" ? "good" : "mid"}>{SCRIBE_STATE[sc.status]}</Pill>
                <SimulatedTag what="Simulated audio" />
                <Link to={paths.intakeRecord(record.id, "assessment", "scribe")} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">Open AI Scribe<ArrowRight size={13} className="ico" /></Link>
              </div>
              {notes.length ? <p className="mt-1 text-[12px] text-muted">{notes.map((s) => s.label).join(" · ")}</p> : <p className="mt-1 text-[12px] text-muted">{sc.turns.length} transcript turns; no draft sections yet</p>}
            </li>
          ) : null}
          {v ? (
            <li className="flex flex-wrap items-center gap-2 px-5 py-2.5">
              <span className="text-[13px] font-semibold">Voice intake draft</span>
              <Pill tone={v.status === "saved" ? "good" : v.status === "escalated" || v.status === "transferred" ? "neutral" : "mid"}>{v.status === "saved" ? "Confirmed and saved" : v.status === "summary" || v.status === "confirm" ? "Waits for confirmation" : v.status === "escalated" ? "Escalated to a person" : v.status === "transferred" ? "Transferred to staff" : "In progress"}</Pill>
              <SimulatedTag what="Simulated call" />
              <span className="text-[12px] text-muted">{v.turns.length} turns</span>
              <Link to={paths.intakeRecord(record.id, "profile", "voice")} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">Open Voice Intake Assistant<ArrowRight size={13} className="ico" /></Link>
            </li>
          ) : null}
          {sections.map(([s, n]) => (
            <li key={s} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
              <span className="text-[13px] font-semibold">AI suggestions in {SECTION_LABEL[s]}</span>
              <Pill tone="mid">{n} waiting for review</Pill>
              <Link to={paths.intakeRecord(record.id, s)} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">Review<ArrowRight size={13} className="ico" /></Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
