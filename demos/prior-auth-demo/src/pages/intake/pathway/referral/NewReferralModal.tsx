import { useState } from "react";
import { Button, Field, Modal, Segmented, TextInput } from "@/components/ui";
import { CHANNEL_LABEL, destinationsFor, EXTERNAL_DESTINATIONS, internalDestination, type ReferralChannel, type ReferralDestination } from "@/data/intake/destinations";
import { CLINICIAN_AT, staffOf } from "@/data/intake/seed";
import type { IntakeRecord, ReferralOut } from "@/data/intake/types";
import { DAY } from "@/lib/time";
import { useStore } from "@/store";
import { fromIso, isoOf } from "../../cans/cansModel";
import { Select } from "../../cans/ui";
import { pathwayName } from "../pathwayModel";
import { consentFromProfile, isGenerated, matchDoc } from "./referralModel";

/** Create a referral from a care pathway, to this clinic's own team or to an external (fictional) organization. It starts as a draft. */
export function NewReferralModal({ record, pwId, onClose, onCreated }: { record: IntakeRecord; pwId: string | null; onClose: () => void; onCreated: (roId: string) => void }) {
  const create = useStore((s) => s.createReferralOut);
  const clock = useStore((s) => s.clock);
  const options = record.pathways.filter((p) => p.status !== "not_selected");
  const [pathId, setPathId] = useState(pwId ?? options[0]?.id ?? "");
  const pw = options.find((p) => p.id === pathId);
  const canInternal = !!pw && pw.serviceId !== "external";
  const [kind, setKind] = useState<"internal" | "external">(pw?.serviceId === "external" ? "external" : "internal");
  const effKind = canInternal ? kind : "external";
  const listed = pw ? destinationsFor(pw.serviceId) : [];
  const directory = listed.length ? listed : EXTERNAL_DESTINATIONS;
  const [extId, setExtId] = useState(directory[0]?.id ?? "");
  const dest: ReferralDestination | undefined = !pw ? undefined : effKind === "internal" && pw.serviceId !== "external" ? internalDestination(record.site, pw.serviceId) : directory.find((d) => d.id === extId) ?? directory[0];
  const [contact, setContact] = useState<string | null>(null);
  const [channel, setChannel] = useState<ReferralChannel | null>(null);
  const [priority, setPriority] = useState<ReferralOut["priority"]>(record.urgency === "routine" ? "routine" : "urgent");
  const [consent, setConsent] = useState<ReferralOut["consent"]>(consentFromProfile(record));
  const [follow, setFollow] = useState(isoOf(clock + 3 * DAY));
  const names = dest ? [...new Set([...dest.requiredDocs, ...(pw?.referralReqs ?? [])])] : [];
  const [picked, setPicked] = useState<Record<string, string>>({});
  const docFor = (name: string) => (name in picked ? picked[name] : matchDoc(name, record.documents)?.id ?? "");
  const clinician = staffOf(CLINICIAN_AT[record.site]);

  const save = () => {
    if (!pw || !dest) return;
    const roId = create(record.id, {
      serviceId: pw.serviceId, pathwayId: pw.id, destinationId: dest.id,
      destination: { org: dest.org, contact: contact ?? dest.contact, phone: dest.phone, channel: channel ?? dest.channel },
      referringClinician: clinician ? `${clinician.name}${clinician.credentials ? `, ${clinician.credentials}` : ""}` : "Site clinician",
      docs: names.map((name) => (isGenerated(name) ? { name, required: true, attached: false, generated: true } : { name, required: true, attached: !!docFor(name), docId: docFor(name) || undefined })),
      consent, priority, followUpAt: fromIso(follow) ?? undefined,
    });
    onCreated(roId);
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" title="New referral" subtitle="Starts as a draft. Nothing is sent until a person approves it." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!pw || !dest} onClick={save}>Create draft</Button></>}>
      {!options.length ? (
        <p className="text-[14px] text-ink2">Add a care pathway option first. A referral comes from a pathway.</p>
      ) : (
        <div className="space-y-3">
          <Field label="From the pathway">
            <Select label="From the pathway" value={pathId} onChange={(v) => { setPathId(v); setPicked({}); setContact(null); setChannel(null); }} options={options.map((p) => ({ value: p.id, label: pathwayName(p) }))} />
          </Field>
          {canInternal ? (
            <Segmented items={[{ id: "internal", label: "This clinic" }, { id: "external", label: "External organization" }]} value={effKind} onChange={(v) => { setKind(v); setContact(null); setChannel(null); setPicked({}); }} />
          ) : null}
          {effKind === "external" ? (
            <Field label="Receiving organization" hint={listed.length ? "From the referral directory (fictional organizations)" : "No directory entry lists this service; choose the closest"}>
              <Select label="Receiving organization" value={dest?.id ?? ""} onChange={(v) => { setExtId(v); setContact(null); setChannel(null); setPicked({}); }} options={directory.map((d) => ({ value: d.id, label: d.org }))} />
            </Field>
          ) : (
            <p className="text-[13px] text-ink">Receiving: <b>{dest?.org}</b></p>
          )}
          {dest ? <p className="text-[12px] text-muted">{dest.note}{dest.phone ? ` · ${dest.phone}` : ""}</p> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Receiving contact"><TextInput value={contact ?? dest?.contact ?? ""} onChange={(e) => setContact(e.target.value)} /></Field>
            <Field label="Channel">
              <Select label="Channel" value={channel ?? dest?.channel ?? "secure_message"} onChange={(v) => setChannel(v as ReferralChannel)} options={(Object.keys(CHANNEL_LABEL) as ReferralChannel[]).map((c) => ({ value: c, label: `${CHANNEL_LABEL[c]} (simulated)` }))} />
            </Field>
            <Field label="Priority">
              <Select label="Priority" value={priority} onChange={(v) => setPriority(v as ReferralOut["priority"])} options={[{ value: "routine", label: "Routine" }, { value: "urgent", label: "Urgent" }]} />
            </Field>
            <Field label="Consent or release" hint="Recorded by staff. Psyflo does not decide consent.">
              <Select label="Consent or release" value={consent} onChange={(v) => setConsent(v as ReferralOut["consent"])} options={[{ value: "on_file", label: "On file" }, { value: "needed", label: "Needed" }, { value: "declined", label: "Declined" }]} />
            </Field>
            <Field label="Follow-up date"><TextInput type="date" value={follow} onChange={(e) => setFollow(e.target.value)} /></Field>
          </div>
          <div>
            <span className="text-[13px] font-medium text-ink2">Required documents</span>
            <ul className="mt-1.5 space-y-2">
              {names.map((name) => (
                <li key={name} className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <span className="text-[13px] font-medium text-ink">{name}</span>
                  {isGenerated(name) ? (
                    <span className="text-[13px] text-muted">Generated with the packet</span>
                  ) : (
                    <Select label={`Attach ${name}`} value={docFor(name)} onChange={(v) => setPicked((p) => ({ ...p, [name]: v }))} options={[{ value: "", label: "Not attached yet" }, ...record.documents.map((d) => ({ value: d.id, label: d.name }))]} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}
