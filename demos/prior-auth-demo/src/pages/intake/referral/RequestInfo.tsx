import { useState } from "react";
import { MailQuestion, Send } from "lucide-react";
import { AgentChip, Button, Card, CardBody, CardHeader, Checkbox, Chip, Dropdown, Field, TextArea, TextInput } from "@/components/ui";
import { staffOf } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { itemsToRequest, openInfoRequests } from "./logic";

const CHANNELS = ["Secure message", "Fax", "Phone call"];

function draftFor(r: IntakeRecord, to: string, items: string[], me: string): string {
  const staff = staffOf(me);
  const who = `${r.initials || "the patient"}${r.age !== null ? `, ${r.age}` : ""}`;
  return [
    `Hello ${to},`,
    "",
    `Thank you for referring ${who} to the Psyflo demo clinic for ${serviceById(r.serviceId).short}. To finish the intake we still need:`,
    ...(items.length ? items.map((i) => `- ${i}`) : ["- (add what you need)"]),
    "",
    "You can reply to this message or call our intake line at (804) 555-0100.",
    "",
    `${staff?.name ?? "Intake team"}${staff ? `, ${staff.role}` : ""}`,
    "Psyflo demo clinic intake",
  ].join("\n");
}

/** What the referral is missing, and a drafted request to the referrer that a person reviews and sends (simulated). The task that waits
    for the reply shows here and in the assistant panel. */
export function RequestInfo({ record }: { record: IntakeRecord }) {
  const me = useStore((s) => meOf(s));
  const send = useStore((s) => s.requestIntakeInfo);
  const reply = useStore((s) => s.markIntakeInfoReply);
  const items = itemsToRequest(record);
  const waiting = openInfoRequests(record);
  const defaultTo = record.referral.referringClinician?.value || record.sourceOrg;
  const [draft, setDraft] = useState<{ to: string; channel: string; message: string; needsInfo: boolean } | null>(null);
  const start = () => setDraft({ to: defaultTo, channel: CHANNELS[0], message: draftFor(record, defaultTo, items, me), needsInfo: record.triage !== "needs_info" });

  return (
    <Card>
      <CardHeader
        title="Missing information"
        subtitle={items.length ? `${items.length} item${items.length === 1 ? "" : "s"} to ask the referrer for` : "Nothing required is missing from the referral"}
        right={!draft ? <Button size="sm" variant={items.length ? "primary" : "outline"} icon={MailQuestion} onClick={start} data-request-info>Request from the referrer</Button> : null}
      />
      {items.length || waiting.length || draft ? (
      <CardBody className="flex flex-col gap-3">
        {items.length ? (
          <ul className="list-disc pl-5 text-[14px]">
            {items.map((i) => <li key={i}>{i}</li>)}
          </ul>
        ) : null}
        {waiting.map((t) => (
          <div key={t.id} data-waiting className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line bg-tile px-3.5 py-2.5">
            <div className="min-w-0 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <AgentChip agent="navigator" />
                <span className="font-semibold">Waiting on the referrer</span>
                <span className="text-muted">since {stamp(t.at)}</span>
              </div>
              {t.result ? <p className="mt-1 text-ink2">{t.result}</p> : null}
            </div>
            <Button size="sm" onClick={() => reply(record.id, t.id)}>Mark reply received</Button>
          </div>
        ))}
        {draft ? (
          <div data-draft className="flex flex-col gap-3 rounded-xl border border-field px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <AgentChip agent="navigator" />
              <Chip>AI-generated draft</Chip>
              <span className="text-muted">Review and edit before sending. Sending is simulated: nothing leaves the demo.</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
              <Field label="To">
                <TextInput value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
              </Field>
              <Field label="Send by">
                <Dropdown<string> variant="field" ariaLabel="Send by" value={draft.channel} onChange={(v) => setDraft({ ...draft, channel: v })} options={CHANNELS.map((c) => ({ value: c, label: c }))} />
              </Field>
            </div>
            <Field label="Message">
              <TextArea value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} rows={9} />
            </Field>
            {record.triage !== "needs_info" ? <Checkbox checked={draft.needsInfo} onChange={(v) => setDraft({ ...draft, needsInfo: v })} label="Set triage to Needs information" /> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                icon={Send}
                disabled={!draft.to.trim() || !draft.message.trim()}
                onClick={() => {
                  send(record.id, { to: draft.to.trim(), channel: draft.channel, items, message: draft.message, needsInfo: draft.needsInfo });
                  setDraft(null);
                }}
              >
                Send (simulated)
              </Button>
              <Button onClick={() => setDraft(null)}>Discard draft</Button>
            </div>
          </div>
        ) : null}
      </CardBody>
      ) : null}
    </Card>
  );
}
