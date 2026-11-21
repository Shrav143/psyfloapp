import { useState } from "react";
import { PenLine, Plus, RotateCcw, Save, X } from "lucide-react";
import { Button, Field, Pill, TextArea, TextInput } from "@/components/ui";
import { INTAKE_STAFF } from "@/data/intake/seed";
import type { IntakeRecord, LevelOfNeedReview } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";
import { SignOffDialog } from "../shared/SignOff";
import { CANS_THEMES } from "./cansModel";
import { cansCompletion } from "./cansState";
import { Select } from "./ui";

/* The Level of Need review a person fills: documented needs, recommendations, missing information and a qualified reviewer. The disposition is
   free text recorded through the sign-off gate; anything that reads like a level, tier, score or another instrument's result is refused. */

const LOOKS_LIKE_LEVEL = /\b(level|tier|score|lon)\s*[:#=]?\s*(\d|i{1,3}\b|iv\b|v\b|one\b|two\b|three\b|four\b|five\b)|\b(LOCUS|CALOCUS|CASII|ASAM)\b/i;
export const dispositionProblem = (t: string): string | null =>
  !t.trim() ? "Write the disposition first." : LOOKS_LIKE_LEVEL.test(t) ? "A disposition is a next step in words. It cannot be a level, tier, score or another instrument's result." : null;

export function LonReviewForm({ record, lon }: { record: IntakeRecord; lon: LevelOfNeedReview }) {
  const save = useStore((s) => s.saveLonReview);
  const disposition = useStore((s) => s.dispositionLon);
  const reopen = useStore((s) => s.reopenLon);
  const [form, setForm] = useState({ reviewNote: lon.reviewNote ?? "", functionalNeeds: lon.functionalNeeds, serviceNeeds: lon.serviceNeeds, recommendations: lon.recommendations });
  const [missing, setMissing] = useState<string[]>(lon.missing);
  const [newMissing, setNewMissing] = useState("");
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  const [signing, setSigning] = useState(false);
  const dirty = form.reviewNote !== (lon.reviewNote ?? "") || form.functionalNeeds !== lon.functionalNeeds || form.serviceNeeds !== lon.serviceNeeds || form.recommendations !== lon.recommendations || missing.join("|") !== lon.missing.join("|");
  const done = lon.status === "dispositioned";
  const problem = dispositionProblem(text);
  const qualified = INTAKE_STAFF.filter((s) => s.qualified);
  const gaps = CANS_THEMES.filter((t) => !(record.cans?.evidence ?? []).some((e) => e.theme === t));
  const steps = [
    record.assessment.status !== "signed" ? "Complete and sign the clinical assessment" : null,
    !record.cans ? "Start the CANS record and gather evidence" : !record.cans.items.length ? "Load a CANS template (the official mapping is not available)" : cansCompletion(record.cans).missing.length ? `Address ${cansCompletion(record.cans).missing.length} CANS item${cansCompletion(record.cans).missing.length === 1 ? "" : "s"} with no rating label or note` : null,
    record.cans && record.cans.status !== "signed" && record.cans.items.length ? "Have a qualified clinician sign the CANS record" : null,
    record.cans && gaps.length ? `Gather evidence for ${gaps.length} theme${gaps.length === 1 ? "" : "s"} with none` : null,
    !lon.reviewer ? "Assign a qualified reviewer" : null,
    "Wait for DMAS's validated Level of Need configuration before any level is shown",
  ].filter((x): x is string => !!x);
  const area = (k: keyof typeof form, label: string, ph: string) => (
    <Field label={label}>
      <TextArea rows={2} value={form[k]} disabled={done} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} placeholder={ph} />
    </Field>
  );
  return (
    <div data-lon-review className="space-y-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[14px] font-semibold text-ink">Level of Need review</h4>
        <Pill tone={done ? "good" : "neutral"}>{done ? "Disposition recorded" : "In review"}</Pill>
        {lon.updatedBy ? <span className="text-[12px] text-muted">Saved by {actorName(lon.updatedBy)} · {lon.updatedAt !== undefined ? stamp(lon.updatedAt) : ""}</span> : null}
      </div>
      {area("reviewNote", "Review note", "The reviewer's own note on the documented needs")}
      {area("functionalNeeds", "Relevant functional needs", "What the record documents about daily functioning")}
      {area("serviceNeeds", "Documented service needs", "Needs the record documents, with where they come from")}
      {area("recommendations", "Service recommendation (by the clinician, never computed)", "The service the clinician recommends, in their words")}
      <div>
        <span className="text-[13px] font-medium text-ink2">Missing information</span>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {missing.map((m) => (
            <li key={m} className="inline-flex items-center gap-1 rounded-full bg-neutral-bg py-[3px] pr-1 pl-2.5 text-[12px] font-semibold text-neutral-ink">
              {m}
              {!done ? (
                <button type="button" aria-label={`Remove ${m}`} onClick={() => setMissing((x) => x.filter((y) => y !== m))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white"><X size={12} className="ico" /></button>
              ) : null}
            </li>
          ))}
          {!missing.length ? <li className="text-[13px] text-muted">None listed</li> : null}
        </ul>
        {!done ? (
          <div className="mt-2 flex gap-2">
            <TextInput value={newMissing} onChange={(e) => setNewMissing(e.target.value)} placeholder="Add missing information" aria-label="Add missing information" className="min-w-0 flex-1" />
            <Button size="sm" icon={Plus} disabled={!newMissing.trim()} onClick={() => { setMissing((x) => [...new Set([...x, newMissing.trim()])]); setNewMissing(""); }}>Add</Button>
          </div>
        ) : null}
      </div>
      <Field label="Qualified reviewer">
        <Select label="Qualified reviewer" value={lon.reviewer ?? ""} disabled={done} onChange={(v) => save(record.id, { reviewer: v || undefined })} options={[{ value: "", label: "Not assigned" }, ...qualified.map((s) => ({ value: s.id, label: `${s.name}, ${s.credentials ?? s.role}` }))]} />
      </Field>
      {!done ? <Button size="sm" variant="primary" icon={Save} disabled={!dirty} onClick={() => save(record.id, { ...form, missing })}>Save review</Button> : null}
      <div>
        <span className="text-[13px] font-medium text-ink2">Recommended next steps</span>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink">
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
      {done ? (
        <div data-lon-disposition className="rounded-xl border border-good-edge bg-good-bg px-3.5 py-3">
          <p className="text-[12px] font-semibold text-good-ink">Final disposition (not a Level of Need determination)</p>
          <p className="mt-1 text-[14px] text-ink">{lon.disposition}</p>
          <p className="mt-1 text-[12px] text-muted">
            Recorded by {lon.decidedBy ? actorName(lon.decidedBy) : "a clinician"}{lon.decidedAt !== undefined ? ` · ${stamp(lon.decidedAt)}` : ""}{lon.rolePlay ? " · demo role-play" : ""}
          </p>
          <Button size="sm" className="mt-2" icon={RotateCcw} onClick={() => reopen(record.id)}>Reopen review</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Field label="Final disposition (free text)" error={tried && problem ? problem : undefined} hint="Next steps in words, for example: continue preparation and revisit when DMAS publishes the model.">
            <TextArea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Button size="sm" variant="primary" icon={PenLine} onClick={() => { setTried(true); if (!problem) setSigning(true); }}>Record disposition</Button>
        </div>
      )}
      <SignOffDialog
        open={signing}
        onClose={() => setSigning(false)}
        record={record}
        title="Record the Level of Need review disposition"
        attestation="I reviewed the documented needs and recorded this disposition. It is not a Level of Need determination, level or score."
        signLabel="Record disposition"
        onSign={(signer, rolePlay) => { disposition(record.id, text.trim(), signer.id, rolePlay); setText(""); setTried(false); }}
      />
    </div>
  );
}
