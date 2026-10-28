import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { Button, Pill, TextArea } from "@/components/ui";
import type { AssessmentPlan, InstrumentInstance, ModuleId, ModuleSchema, SectionDef } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { longDate } from "@/lib/time";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";
import { SignOffDialog } from "../shared/SignOff";
import { FieldRow } from "./FieldRow";
import { locFindings, locMissing, requestedLevel, sectionFields } from "./model";

const SELECT = "h-[38px] w-full max-w-[420px] rounded-xl border border-field bg-white px-3 text-sm text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15";
const H = "text-[13px] font-semibold text-ink2";

/** The level-of-care review: what was requested, what the record shows so far, what is missing, the clinician's own recommendation, and the level a clinician
    confirms. The level is chosen from names only, by a person. No criteria are loaded and nothing here proposes, ranks or fills a level. */
export function LocReview({ record, moduleId, section, schema, inst, locked, framework, onGoSection, onGoModule, onGoField }: {
  record: IntakeRecord; moduleId: ModuleId; section: SectionDef; schema: ModuleSchema; inst: InstrumentInstance | undefined; locked: boolean;
  framework: AssessmentPlan["framework"] | undefined;
  onGoSection: (sectionId: string) => void; onGoModule: (id: ModuleId) => void; onGoField: (key: string) => void;
}) {
  const setLoc = useStore((s) => s.setInstrumentLoc);
  const toast = useStore((s) => s.toast);
  const options = section.locOptions ?? [];
  const requested = requestedLevel(record, inst);
  const confirmed = inst?.loc?.confirmed;
  const [rec, setRec] = useState(inst?.loc?.recommendation ?? "");
  const [choice, setChoice] = useState("");
  const [dialog, setDialog] = useState(false);
  useEffect(() => setRec(inst?.loc?.recommendation ?? ""), [inst?.loc?.recommendation]);

  const findings = locFindings(record, moduleId, schema, inst);
  const missing = locMissing(moduleId, schema, inst);
  const evaluating = record.config && record.config.programId !== record.config.requestedProgramId;

  return (
    <div data-loc-review={moduleId} className="space-y-5 py-3.5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className={H}>Requested level of care</div>
          <p className="mt-1 text-[14px]">{requested}</p>
          {evaluating && record.config ? <p className="text-[12px] text-muted">Being evaluated for a different program than the referral asked for.</p> : null}
        </div>
        <div>
          <div className={H}>Applicable criteria</div>
          <p className="mt-1"><Pill tone="neutral">Licensed criteria not loaded in this demo</Pill></p>
          {framework ? <p className="mt-1 text-[12px] text-muted">Configured framework: {framework.label}{framework.edition ? `, ${framework.edition}` : ""}.</p> : null}
        </div>
      </div>

      <div>
        <div className={H}>Clinical findings so far</div>
        {findings.length ? (
          <ul className="mt-1.5 divide-y divide-line rounded-xl border border-line">
            {findings.map((f) => (
              <li key={f.label} className="flex items-start gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{f.label}</div>
                  <p className="text-[13px] text-ink2">{f.text}</p>
                </div>
                <Button size="sm" variant="ghost" trailing={ArrowRight} onClick={() => (f.moduleId ? onGoModule(f.moduleId) : f.sectionId ? onGoSection(f.sectionId) : undefined)}>Open</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13px] text-muted">No findings are recorded yet. Complete the sections above or the other modules of this intake.</p>
        )}
      </div>

      <div>
        <div className={H}>Missing evidence</div>
        {missing.length ? (
          <ul className="mt-1.5 space-y-1.5">
            {missing.map((m) => (
              <li key={`${m.label}-${m.fieldKey ?? ""}`} className="flex items-start gap-2 text-[13px]">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-mid" aria-hidden="true" />
                <span className="min-w-0 flex-1"><span className="font-medium">{m.label}</span>{m.text ? <span className="text-muted">: {m.text}</span> : null}</span>
                {m.fieldKey ? <button type="button" onClick={() => onGoField(m.fieldKey as string)} className="text-[12px] font-semibold text-forest hover:underline">Go to it</button> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13px] text-muted">Nothing is listed as missing. A clinician still decides whether the evidence is enough.</p>
        )}
      </div>

      <div>
        <label htmlFor={`loc-rec-${moduleId}`} className={H}>Clinician recommendation</label>
        {locked ? (
          <p className="mt-1 text-[14px] whitespace-pre-line">{inst?.loc?.recommendation || "Not entered"}</p>
        ) : (
          <TextArea
            id={`loc-rec-${moduleId}`} value={rec} rows={2} style={{ minHeight: 64 }} className="mt-1.5" placeholder="In the clinician's own words"
            onChange={(e) => setRec(e.target.value)} onBlur={() => rec.trim() !== (inst?.loc?.recommendation ?? "") && setLoc(record.id, moduleId, { recommendation: rec.trim(), requested })}
          />
        )}
      </div>

      <div data-loc-confirm className="rounded-2xl border border-line bg-tile/60 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className={H}>Level of care confirmed by a clinician</div>
          {confirmed ? <Pill tone="good">Clinician confirmed</Pill> : <Pill tone="neutral">Not confirmed</Pill>}
        </div>
        {confirmed ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px]"><span className="font-semibold">{confirmed}</span><span className="text-muted"> · {actorName(inst?.loc?.confirmedBy ?? "")}, {inst?.loc?.confirmedAt !== undefined ? longDate(inst.loc.confirmedAt) : ""}</span></p>
            {!locked ? <Button size="sm" onClick={() => setLoc(record.id, moduleId, { confirmed: "" })}>Change the level</Button> : null}
          </div>
        ) : locked ? (
          <p className="mt-1 text-[14px] text-muted">Not confirmed</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <select aria-label="Level of care to confirm" value={choice} onChange={(e) => setChoice(e.target.value)} className={SELECT}>
              <option value="">Choose a level</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <Button variant="primary" icon={BadgeCheck} disabled={!choice} onClick={() => setDialog(true)}>Confirm level</Button>
          </div>
        )}
        <p className="mt-2 text-[12px] text-muted">A person chooses the level. Psyflo never suggests, ranks or fills one, and an AI suggestion cannot reach this choice.</p>
        <div className="mt-1">
          {sectionFields(section, record).map((f) => <FieldRow key={f.key} record={record} moduleId={moduleId} def={f} inst={inst} locked={locked} />)}
        </div>
      </div>

      <SignOffDialog
        open={dialog} onClose={() => setDialog(false)} record={record} title="Confirm the level of care" signLabel="Confirm level"
        attestation="I chose this level myself, using my own clinical judgment and the evidence in this review. Psyflo did not choose it."
        onSign={(signer, rolePlay) => {
          const ok = setLoc(record.id, moduleId, { confirmed: choice, requested }, signer.id, rolePlay);
          toast(ok ? { title: "Level of care confirmed", body: `${choice}, confirmed by ${signer.name}${rolePlay ? " (demo role-play)" : ""}.`, tone: "good" } : { title: "Not confirmed", body: "Only a qualified clinician can confirm a level.", tone: "risk" });
          setChoice("");
        }}
      />
    </div>
  );
}
