import { Mic } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { interviewTopics, programLabelOf } from "@/data/intake/scripts";
import { NOTE_SECTIONS, type IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { stamp } from "@/lib/time";
import { SimulatedTag, SourceLink } from "../shared/provenance";
import { clockOf } from "../scribe/engine";

const STATE: Record<string, { label: string; tone: Tone }> = {
  none: { label: "No session yet", tone: "neutral" }, consent: { label: "Consent needed", tone: "mid" }, ready: { label: "Ready to record", tone: "neutral" },
  recording: { label: "Recording (simulated)", tone: "risk" }, paused: { label: "Paused", tone: "mid" }, stopped: { label: "Preparing the draft", tone: "neutral" },
  reviewing: { label: "Draft waits for review", tone: "mid" }, saved: { label: "Saved to the intake", tone: "good" },
};

/** Record Intake at a glance: which interview the scribe will run for this program, and the latest session. The way in is the Record Intake button above. */
export function RecordIntakeCard({ record, openScribe }: { record: IntakeRecord; openScribe: () => void }) {
  const s = record.scribe;
  const st = STATE[s?.status ?? "none"];
  const program = programLabelOf(record);
  const topics = interviewTopics(record);
  const drafted = s ? NOTE_SECTIONS.filter((n) => s.noteDraft[n.id]).length : 0;
  const accepted = s ? (s.extracted ?? []).filter((x) => x.status === "accepted" || x.status === "edited").length : 0;
  const action = s?.status === "reviewing" || s?.status === "stopped" ? "Review the draft" : s?.status === "saved" ? "Open the session" : s && s.status !== "consent" ? "Open the scribe" : null;
  return (
    <Card data-testid="record-intake-card">
      <CardHeader title="Record Intake" right={<><Pill tone={st.tone}>{st.label}</Pill><SimulatedTag what="Simulated: no audio is recorded" /></>} />
      <CardBody>
        <p className="text-[13px] text-ink2">
          {program ? `Interview for ${program}: ${topics.join(", ")}.` : "A general intake interview. Configure the intake for the program's own topics."} Proposals go to the assessment modules as pending evidence.
        </p>
        {s && s.status !== "consent" ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] min-[640px]:grid-cols-4">
            <div><dt className="text-[12px] text-muted">Recorded</dt><dd className="font-semibold tabular-nums">{clockOf(s.elapsed)}</dd></div>
            <div><dt className="text-[12px] text-muted">Transcript</dt><dd className="font-semibold">{s.turns.length} turns</dd></div>
            <div><dt className="text-[12px] text-muted">Note sections</dt><dd className="font-semibold">{drafted} of 9 drafted</dd></div>
            <div><dt className="text-[12px] text-muted">Proposals</dt><dd className="font-semibold">{(s.extracted ?? []).length}{s.status === "saved" ? `, ${accepted} accepted` : ""}</dd></div>
          </dl>
        ) : null}
        {s?.consent ? <p className="mt-2 text-[12px] text-muted">Recording consent: {s.consent.by}, {s.consent.method}, {stamp(s.consent.at)}{s.encounter ? ` · ${s.encounter.type} with ${s.encounter.clinician}` : ""}</p> : null}
        {s?.status === "saved" && s.docIds?.length ? (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {s.docIds.map((d) => {
              const doc = record.documents.find((x) => x.id === d);
              return doc ? <SourceLink key={d} record={record} source={{ kind: "document", ref: doc.name, docId: d }} /> : null;
            })}
          </div>
        ) : null}
        {action ? <div className="mt-3"><Button icon={Mic} onClick={openScribe}>{action}</Button></div> : null}
      </CardBody>
    </Card>
  );
}
