import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, Field, Label, Segmented, TextInput } from "@/components/ui";
import { CLINICIAN_AT, INTAKE_STAFF } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";
import { scriptOf } from "./engine";

const SELECT = "h-[38px] w-full rounded-xl border border-field bg-white px-3 text-sm";
export const RETENTION_NOTE = "In this demo nothing is recorded: the scribe plays a scripted conversation in this browser. In production, recordings and transcripts follow your organization's retention policy, are encrypted in transit and at rest, and need a signed BAA with the audio vendor before any real PHI.";

/** Step one of the scribe: recording consent (who, verbal or written) and the patient and encounter. Recording cannot start without it. */
export function ScribeConsent({ record, onDeclined }: { record: IntakeRecord; onDeclined: () => void }) {
  const script = scriptOf(record);
  const consent = useStore((s) => s.scribeConsent);
  const declined = useStore((s) => s.scribeDeclined);
  const [who, setWho] = useState<string[]>([]);
  const [method, setMethod] = useState<"verbal" | "written">("verbal");
  const [asked, setAsked] = useState(false);
  const [identity, setIdentity] = useState(false);
  const [type, setType] = useState(script.encounterType);
  const [clinician, setClinician] = useState(CLINICIAN_AT[record.site]);
  const [others, setOthers] = useState(script.others);
  const missing = [!who.length && "choose who consented", !asked && "confirm everyone present agreed", !identity && "check the patient's identity"].filter(Boolean) as string[];
  const patient = `${record.initials || "Patient not entered"}${record.age !== null ? `, ${record.age}` : ""}`;
  const types = [...new Set([script.encounterType, "Intake assessment, telehealth", "Follow-up visit"])];

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      <Card>
        <CardHeader title="Before you start" right={<ShieldCheck size={18} className="ico text-forest" aria-hidden="true" />} />
        <CardBody className="space-y-5">
          <section aria-labelledby="sc-consent">
            <Label>1 · Recording consent</Label>
            <h3 id="sc-consent" className="sr-only">Recording consent</h3>
            <p className="mt-2 text-[13px] font-medium text-ink2">Who consented to the recording</p>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2">
              {script.consenters.map((c) => (
                <Checkbox key={c} checked={who.includes(c)} onChange={(v) => setWho((w) => (v ? [...w, c] : w.filter((x) => x !== c)))} label={c} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-[13px] font-medium text-ink2">How</span>
              <Segmented<"verbal" | "written"> items={[{ id: "verbal", label: "Verbal" }, { id: "written", label: "Written" }]} value={method} onChange={setMethod} />
            </div>
            <Checkbox className="mt-3" checked={asked} onChange={setAsked} label="I asked everyone present, and they agreed to the recording" />
          </section>
          <section aria-labelledby="sc-enc" className="border-t border-line pt-4">
            <Label>2 · Patient and encounter</Label>
            <h3 id="sc-enc" className="sr-only">Patient and encounter</h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-[14px] font-semibold">{patient}</span>
              <span className="text-[13px] text-muted">{record.id}</span>
              <Checkbox checked={identity} onChange={setIdentity} label="Identity checked (name and date of birth)" />
            </div>
            <div className="mt-3 grid gap-3 min-[700px]:grid-cols-2">
              <Field label="Encounter">
                <select aria-label="Encounter" value={type} onChange={(e) => setType(e.target.value)} className={SELECT}>
                  {types.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Clinician">
                <select aria-label="Clinician" value={clinician} onChange={(e) => setClinician(e.target.value)} className={SELECT}>
                  {INTAKE_STAFF.filter((s) => s.qualified).map((s) => <option key={s.id} value={s.id}>{s.name}{s.credentials ? `, ${s.credentials.split(",")[0]}` : ""}</option>)}
                </select>
              </Field>
              <Field label="Others present" className="min-[700px]:col-span-2">
                <TextInput value={others} onChange={(e) => setOthers(e.target.value)} />
              </Field>
            </div>
          </section>
          <p className="rounded-xl bg-neutral-bg px-3.5 py-2.5 text-[13px] text-neutral-ink">{RETENTION_NOTE}</p>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            {missing.length ? <span className="mr-auto text-[12px] text-muted">To continue: {missing.join(", ")}.</span> : null}
            <Button
              onClick={() => {
                declined(record.id, who.join(", ") || "No one consented");
                onDeclined();
              }}
            >
              Consent not given
            </Button>
            <Button
              variant="primary"
              disabled={missing.length > 0}
              onClick={() => consent(record.id, { by: who.join(" and "), method }, { patient, identityChecked: identity, type, clinician: actorName(clinician), others: others.trim() || "None" })}
            >
              Record consent and continue
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
