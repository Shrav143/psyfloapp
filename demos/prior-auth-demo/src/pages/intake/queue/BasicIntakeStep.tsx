import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button, Field, Modal, Segmented, TextArea, TextInput } from "@/components/ui";
import { METHOD_LABEL } from "@/data/intake/types";
import type { BuiltInPayerId, Urgency } from "@/data/types";
import type { VaServiceId } from "@/data/va/services";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { intakesInView } from "@/store/intakeSelectors";
import { createManual, createPhone, createVoice, normInitials } from "./createFlows";
import { DuplicateNotice } from "./DuplicateNotice";
import { findDuplicates } from "./duplicates";
import { PlanSelect, ServiceSelect, SiteSelect } from "./IntakeInputs";
import { URGENCY_LABEL } from "./labels";

type Basic = "manual" | "phone" | "voice";
const SUBTITLE: Record<Basic, string> = {
  manual: "Enter what the referral says. You can add the rest in the record.",
  phone: "Start the record now; the call checklist opens with it. Answers are saved as patient reported.",
  voice: "The Voice Intake Assistant opens with the record. It is a simulation: no call is placed and no audio is recorded.",
};

/** Manual entry, staff-assisted phone intake and voice-agent-assisted intake: a short form, then the record. */
export function BasicIntakeStep({ method, onBack, onClose }: { method: Basic; onBack: () => void; onClose: () => void }) {
  const nav = useNavigate();
  const scope = useScope();
  const focus = useStore((s) => s.programFocus);
  const toast = useStore((s) => s.toast);
  const all = useStore((s) => s.intakes);
  const [initials, setInitials] = useState("");
  const [age, setAge] = useState("");
  const [serviceId, setServiceId] = useState<VaServiceId | "">(focus === "all" ? "" : focus);
  const [payer, setPayer] = useState<BuiltInPayerId | "unknown">("unknown");
  const [member, setMember] = useState("");
  const [site, setSite] = useState(scope.sites[0]);
  const [source, setSource] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("routine");
  const [tried, setTried] = useState(false);

  const ageNum = age.trim() === "" ? null : Number(age);
  const ini = normInitials(initials);
  const visible = useMemo(() => intakesInView(useStore.getState(), false), [all, scope.sites]); // eslint-disable-line react-hooks/exhaustive-deps
  const dups = useMemo(() => findDuplicates(visible, { initials: ini, age: ageNum !== null && Number.isFinite(ageNum) ? ageNum : null, memberLast4: member }), [visible, ini, ageNum, member]);

  const errors = {
    initials: method !== "voice" && ini.length < 4 ? "Enter the patient's initials (two or three letters)." : undefined,
    age: ageNum !== null && (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 110) ? "Enter an age in years, or leave it blank." : undefined,
    service: !serviceId ? "Choose the requested service." : undefined,
    source: method === "manual" && !source.trim() ? "Enter who referred." : undefined,
    reason: method === "manual" && !reason.trim() ? "Enter the reason for referral." : undefined,
    member: member && !/^\d{4}$/.test(member) ? "Enter the last 4 digits only." : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = () => {
    setTried(true);
    if (!valid || !serviceId) return;
    const b = {
      serviceId, site, initials: ini, age: ageNum, payerId: payer === "unknown" ? null : payer, urgency,
      sourceOrg: method === "voice" ? source.trim() || "Voice intake (caller)" : method === "phone" ? source.trim() || "Phone call" : source.trim(),
    };
    const id = method === "manual" ? createManual({ ...b, reason, memberLast4: member }) : method === "phone" ? createPhone(b) : createVoice(b);
    onClose();
    nav(paths.intakeRecord(id, "referral", method === "voice" ? "voice" : undefined));
    toast({ title: `${id} created`, body: method === "phone" ? "The call checklist is open in Referral." : method === "voice" ? "The Voice Intake Assistant is ready (simulated)." : "Saved as entered by staff.", tone: "good" });
  };
  const err = (k: keyof typeof errors) => (tried ? errors[k] : undefined);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={METHOD_LABEL[method]}
      subtitle={SUBTITLE[method]}
      footer={
        <>
          <Button icon={ArrowLeft} variant="ghost" onClick={onBack} className="mr-auto">Back</Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>{dups.length ? "Create anyway" : method === "voice" ? "Create and open the assistant" : "Create intake"}</Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label={method === "voice" ? "Caller initials, if known" : "Patient initials"} required={method !== "voice"} error={err("initials")} hint="Privacy mode keeps initials only.">
          <TextInput value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="T.W." autoFocus />
        </Field>
        <Field label="Age" error={err("age")}>
          <TextInput value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="Years" />
        </Field>
        {dups.length ? <DuplicateNotice hits={dups} onOpen={onClose} className="sm:col-span-2" /> : null}
        <Field label="Requested service" required error={err("service")}>
          <ServiceSelect value={serviceId} onChange={setServiceId} />
        </Field>
        <Field label="Site">
          <SiteSelect value={site} sites={scope.sites} onChange={setSite} />
        </Field>
        {method === "manual" ? (
          <>
            <Field label="Medicaid plan">
              <PlanSelect value={payer} onChange={setPayer} />
            </Field>
            <Field label="Medicaid ID, last 4 digits" error={err("member")}>
              <TextInput value={member} onChange={(e) => setMember(e.target.value.trim())} inputMode="numeric" maxLength={4} placeholder="4471" />
            </Field>
          </>
        ) : null}
        <Field label={method === "manual" ? "Referral source" : "Who is calling"} required={method === "manual"} error={err("source")} className="sm:col-span-2">
          <TextInput value={source} onChange={(e) => setSource(e.target.value)} placeholder={method === "manual" ? "Organization and person, for example a school counselor" : "Self, a parent, a clinician..."} />
        </Field>
        {method === "manual" ? (
          <Field label="Reason for referral" required error={err("reason")} className="sm:col-span-2">
            <TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </Field>
        ) : null}
        {method !== "voice" ? (
          <Field label="Urgency" className="sm:col-span-2" hint={urgency === "emergent" ? "If someone may be in danger now, call 911 or 988 first. Then flag a safety concern in the record." : undefined}>
            <Segmented<Urgency> items={(["routine", "urgent", "emergent"] as Urgency[]).map((u) => ({ id: u, label: URGENCY_LABEL[u] }))} value={urgency} onChange={setUrgency} />
          </Field>
        ) : null}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
