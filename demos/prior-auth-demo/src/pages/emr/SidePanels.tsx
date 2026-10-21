import { Eye, PenLine } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { UnmappedField } from "@/data/emr";

/** Fixed text: what the agents may read and what they may write back. */
export function AgentsCanCard() {
  return (
    <Card>
      <CardHeader title="What the agents can do here" />
      <CardBody className="flex flex-col gap-3.5">
        <div className="flex items-start gap-3">
          <Eye size={18} className="ico mt-0.5 text-good" />
          <div><div className="font-semibold">Read</div><div className="text-[13px] text-muted">Assessments, notes, labs, medications, insurance card</div></div>
        </div>
        <div className="flex items-start gap-3">
          <PenLine size={18} className="ico mt-0.5 text-mid" />
          <div><div className="font-semibold">Write back</div><div className="text-[13px] text-muted">Only the approval number and dates, and only after a person approves</div></div>
        </div>
      </CardBody>
    </Card>
  );
}

/** Fields the agents could not place. Map opens a small picker and removes the row. */
export function NeedsMappingCard({ fields, onMap }: { fields: UnmappedField[]; onMap: (f: UnmappedField) => void }) {
  return (
    <Card>
      <CardHeader title="Needs a mapping" right={<Pill tone={fields.length ? "mid" : "good"}>{fields.length}</Pill>} />
      {fields.map((f) => (
        <div key={f.id} className="flex items-start gap-3 border-b border-line px-6 py-3.5 last:border-b-0">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">“{f.field}” in {f.where}</div>
            <div className="text-[13px] text-muted">{f.hint}</div>
          </div>
          <Button size="sm" onClick={() => onMap(f)} aria-label={`Map ${f.field}`}>Map</Button>
        </div>
      ))}
      {!fields.length ? <div className="px-6 py-6 text-sm text-muted">Every field is mapped. New ones appear here when the agents meet a field they cannot place.</div> : null}
    </Card>
  );
}
