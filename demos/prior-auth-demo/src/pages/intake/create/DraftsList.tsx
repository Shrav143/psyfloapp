import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { METHOD_LABEL } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { draftPath } from "./paths";

/** Drafts that were read and not yet saved or decided. They wait here until a person resumes, saves or discards them. */
export function DraftsList() {
  const drafts = useStore((s) => s.referralDrafts);
  const discard = useStore((s) => s.discardIntakeDraft);
  if (!drafts.length) return null;
  return (
    <Card data-card="Drafts">
      <CardHeader title="Drafts in progress" subtitle={`${drafts.length} referral${drafts.length === 1 ? "" : "s"} read and waiting for a person`} />
      <CardBody className="py-1">
        <ul>
          {drafts.map((d) => (
            <li key={d.id} data-draft={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3 last:border-b-0">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">{d.label}</div>
                <p className="text-[12px] text-muted">{d.id} · {METHOD_LABEL[d.record.method]} · started {stamp(d.startedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={d.step === "extracting" ? "neutral" : "mid"}>{d.step === "extracting" ? "Reading" : "Needs review"}</Pill>
                <Link to={draftPath(d.id)} className="inline-flex h-8 items-center rounded-[10px] border border-field bg-white px-3 text-[13px] font-medium hover:bg-tile" data-resume-draft>Resume</Link>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => discard(d.id)} aria-label={`Discard draft ${d.id}`}>Discard</Button>
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
