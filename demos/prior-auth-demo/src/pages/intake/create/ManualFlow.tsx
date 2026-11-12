import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banner, Button, Card, CardBody, CardHeader, Field, Segmented, TextArea, TextInput } from "@/components/ui";
import { ageFromDob } from "@/data/intake/referralFacts";
import type { BuiltInPayerId, Urgency } from "@/data/types";
import type { VaServiceId } from "@/data/va/services";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import { URGENCY_LABEL } from "../referral/labels";
import { PlanSelect, ServiceSelect, SiteSelect } from "./inputs";
import { normInitials } from "./initials";
import { draftPath } from "./paths";
import { startFromManual } from "./startDraft";

const PHONE = /^\(?\d{3}\)?[ -]?\d{3}-?\d{4}$/;

/** Manual Entry: the short list a referral needs. Required values are checked before the review. Everything typed here starts Verified. */
export function ManualFlow() {
  const nav = useNavigate();
  const scope = useScope();
  const clock = useStore((s) => s.clock);
  const focus = useStore((s) => s.programFocus);
  const [initials, setInitials] = useState("");
  const [dob, setDob] = useState("");
  const [source, setSource] = useState("");
  const [referrer, setReferrer] = useState("");
  const [callback, setCallback] = useState("");
  const [reason, setReason] = useState("");
  const [serviceId, setServiceId] = useState<VaServiceId | "">(focus === "all" ? "" : focus);
  const [payer, setPayer] = useState<BuiltInPayerId | "unknown">("unknown");
  const [member, setMember] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("routine");
  const [site, setSite] = useState(scope.sites[0]);
  const [tried, setTried] = useState(false);

  const age = dob ? ageFromDob(dob, clock) : null;
  const errors = {
    initials: normInitials(initials).length < 4 ? "Enter the person's initials or name (two or three letters)." : undefined,
    dob: !dob ? "Enter the date of birth." : age === null ? "Enter a date of birth that is not in the future." : undefined,
    source: !source.trim() ? "Enter who the referral is from." : undefined,
    callback: callback.trim() && !PHONE.test(callback.trim()) ? "Enter a phone number such as (804) 555-0123." : undefined,
    reason: !reason.trim() ? "Enter the reason for referral." : undefined,
    service: !serviceId ? "Choose the program requested." : undefined,
    member: member && !/^\d{4}$/.test(member) ? "Enter the last 4 digits only." : undefined,
  };
  const err = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  const submit = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean) || !serviceId) return;
    nav(draftPath(startFromManual({ initials, dob, sourceOrg: source, referrer, callback, reason, serviceId, payerId: payer, memberLast4: member, urgency, site })));
  };

  return (
    <Card data-flow="manual">
      <CardHeader title="Manual Entry" subtitle="Enter what the referral says. You review it before anything is saved." />
      <CardBody>
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="Person's name or initials" required error={err("initials")} hint="Names appear as initials and age (privacy mode).">
            <TextInput value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="T.W." autoFocus />
          </Field>
          <Field label="Date of birth" required error={err("dob")} hint={age !== null ? `Age ${age}` : undefined}>
            <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
          <Field label="Referral source" required error={err("source")}>
            <TextInput value={source} onChange={(e) => setSource(e.target.value)} placeholder="Organization, for example a school (fictional)" />
          </Field>
          <Field label="Referrer">
            <TextInput value={referrer} onChange={(e) => setReferrer(e.target.value)} placeholder="Name and role" />
          </Field>
          <Field label="Callback number" error={err("callback")} hint="Use a fictional 555-01xx number.">
            <TextInput value={callback} onChange={(e) => setCallback(e.target.value)} inputMode="tel" placeholder="(804) 555-0123" />
          </Field>
          <Field label="Program requested" required error={err("service")}>
            <ServiceSelect value={serviceId} onChange={setServiceId} />
          </Field>
          <Field label="Reason for referral" required error={err("reason")} className="sm:col-span-2">
            <TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </Field>
          <Field label="Payer"><PlanSelect value={payer} onChange={setPayer} /></Field>
          <Field label="Member ID, last 4 digits" error={err("member")}>
            <TextInput value={member} onChange={(e) => setMember(e.target.value.trim())} inputMode="numeric" maxLength={4} placeholder="4471" />
          </Field>
          <Field label="Urgency" className="sm:col-span-2" hint={urgency === "emergent" ? "If someone may be in danger now, call 911 or 988 first. Then save the referral so a clinician can review it." : undefined}>
            <Segmented<Urgency> items={(["routine", "urgent", "emergent"] as Urgency[]).map((u) => ({ id: u, label: URGENCY_LABEL[u] }))} value={urgency} onChange={setUrgency} />
          </Field>
          <Field label="Site"><SiteSelect value={site} sites={scope.sites} onChange={setSite} /></Field>
          {tried && Object.values(errors).some(Boolean) ? <div className="sm:col-span-2"><Banner tone="mid" title="Some required information is missing">Fix the fields marked above to continue.</Banner></div> : null}
          <div className="sm:col-span-2"><Button variant="primary" type="submit" data-start-manual>Continue to review</Button></div>
        </form>
      </CardBody>
    </Card>
  );
}
