import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Label, TextArea, Timeline } from "@/components/ui";
import { staffById, type Referral } from "@/data/referrals";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { OwnerAvatar } from "./Chips";

/** What the agents and the team did, and private notes. */
export function ActivityTab({ r }: { r: Referral }) {
  const add = useStore((s) => s.addReferralNote);
  const [text, setText] = useState("");
  const notes = [...r.notes].sort((a, b) => b.at - a.at);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Activity" subtitle="Agents and people, oldest first" />
        <CardBody>
          <Timeline events={r.events} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Notes" subtitle={`${notes.length} ${notes.length === 1 ? "note" : "notes"} · private, visible only to you and your team`} />
        <CardBody className="flex flex-col gap-4">
          {notes.length ? (
            <ul className="flex flex-col gap-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl border border-edge px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                    <OwnerAvatar owner={n.by} />
                    <span className="font-semibold text-ink2">{staffById(n.by).name}</span>
                    {stamp(n.at)}
                  </div>
                  <p className="text-sm">{n.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No notes yet.</p>
          )}
          <div className="flex flex-col gap-2">
            <Label>Add a note</Label>
            <TextArea aria-label="Add a note" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your note" />
            <div>
              <Button variant="primary" size="sm" disabled={!text.trim()} onClick={() => { add(r.id, text); setText(""); }}>Add note</Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
