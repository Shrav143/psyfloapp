import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Chip, Field, Segmented, TextInput } from "@/components/ui";
import type { Urgency } from "@/data/types";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { URGENCY_LABEL } from "../referral/labels";
import { defaultServiceDate } from "./buildDraft";
import { ServiceSelect, SiteSelect } from "./inputs";
import { normInitials } from "./initials";

/** Voice-Assisted Intake. The record is made first, because the Voice Intake Assistant works on a record: it opens beside it with the call ready.
    Simulated: no call is placed and no audio is recorded. */
export function VoiceFlow() {
  const nav = useNavigate();
  const scope = useScope();
  const toast = useStore((s) => s.toast);
  const [initials, setInitials] = useState("");
  const [serviceId, setServiceId] = useState<VaServiceId | "">("");
  const [urgency, setUrgency] = useState<Urgency>("routine");
  const [site, setSite] = useState(scope.sites[0]);

  const start = () => {
    const s = useStore.getState();
    const svc: VaServiceId = serviceId || "other-bh";
    const id = s.createIntake({
      method: "voice", serviceId: svc, site, initials: initials.trim() ? normInitials(initials) : "", age: null, payerId: null, urgency, priority: urgency !== "routine",
      sourceOrg: "Voice intake (caller)", serviceDate: defaultServiceDate(svc, s.clock), title: `Voice-assisted intake: ${serviceById(svc).short}`,
    });
    s.patchIntake(id, (r) => ({ ...r, voice: { id: `VS-${id}`, status: "idle", language: "English", turns: [], asked: [], scriptId: "voice-generic", cursor: 0, simulated: true } }));
    toast({ title: `${id} created`, body: "The Voice Intake Assistant is ready (simulated).", tone: "good" });
    nav(paths.intakeRecord(id, "referral", "voice"));
  };

  return (
    <Card data-flow="voice">
      <CardHeader title="Voice-Assisted Intake" subtitle="The Voice Intake Assistant asks the questions during a referral call. A person confirms every answer." right={<Chip className="border border-dashed border-field bg-white">Simulated voice</Chip>} />
      <CardBody className="flex flex-col gap-4">
        <Banner tone="neutral">Simulated: no call is placed and no audio is recorded. What the caller says becomes suggestions for staff to review.</Banner>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Caller or person's initials, if known"><TextInput value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="T.W." /></Field>
          <Field label="Program requested, if known"><ServiceSelect value={serviceId} onChange={setServiceId} placeholder="Not known yet" /></Field>
          <Field label="Urgency">
            <Segmented<Urgency> items={(["routine", "urgent", "emergent"] as Urgency[]).map((u) => ({ id: u, label: URGENCY_LABEL[u] }))} value={urgency} onChange={setUrgency} />
          </Field>
          <Field label="Site"><SiteSelect value={site} sites={scope.sites} onChange={setSite} /></Field>
        </div>
        <div><Button variant="primary" icon={AudioLines} onClick={start} data-start-voice>Start voice-assisted intake</Button></div>
      </CardBody>
    </Card>
  );
}
