import { useState } from "react";
import { History } from "lucide-react";
import { Button, Card, Drawer, Label, Pill, Chip } from "@/components/ui";
import { AUTH_STATUS_LABEL, AUTH_STATUS_TONE, leftText, windowText, type AuthorizationRecord, type Patient, type TreatmentEpisode } from "@/data/patients";
import { PROGRAM_LABEL } from "@/data/types";
import { cn } from "@/lib/cn";
import { stamp, longDate } from "@/lib/time";
import { payerNameOf } from "@/data/patients";

const ACTOR: Record<AuthorizationRecord["history"][number]["by"], string> = { payer: "The payer", agent: "An agent", person: "A person" };

/** The authorization a review, renewal or modification refers to: its status, the approved dates, what was authorized, used and is left, when it ends, and a History panel. */
export function AuthorizationCard({ patient, episode, auth }: { patient: Patient; episode: TreatmentEpisode; auth: AuthorizationRecord }) {
  const [open, setOpen] = useState(false);
  const win = windowText(auth);
  const left = leftText(auth);
  const ends = auth.approvedTo === null ? null : longDate(auth.approvedTo);
  return (
    <Card className="px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Label>Authorization</Label>
          <div className="mt-1 text-lg font-semibold">{PROGRAM_LABEL[episode.program]} · {auth.label}</div>
          <div className="text-[13.5px] text-muted">{payerNameOf(auth.payerId)} · {patient.initials}, {patient.age} · {auth.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={AUTH_STATUS_TONE[auth.status]} dot>{AUTH_STATUS_LABEL[auth.status]}</Pill>
          <Button size="sm" icon={History} onClick={() => setOpen(true)}>History</Button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 min-[900px]:grid-cols-4">
        <Fact label="Approved dates" value={win ?? "Not approved yet"} />
        <Fact label="Authorized" value={auth.authorized === null ? "Not on file" : `${auth.authorized} ${auth.unit}`} />
        <Fact label="Left" value={left ?? "Not on file"} tone={auth.left === 0 ? "risk" : auth.status === "expiring" ? "mid" : undefined} />
        <Fact label={auth.approvedTo === null ? "Expires" : "Expires on"} value={ends ?? "Not set"} />
      </dl>
      <Drawer open={open} onClose={() => setOpen(false)} title="Authorization history" subtitle={`${patient.initials}, ${patient.age} · ${PROGRAM_LABEL[episode.program]} · ${auth.id}`} width={520}>
        <p className="mb-4 text-[13.5px] text-muted">Demo data, built from the Case Manager ledger. Each line says who acted: the payer, an agent or a person.</p>
        <ol className="flex flex-col gap-3.5 border-l border-line pl-5">
          {auth.history.map((h, i) => (
            <li key={`${h.at}-${i}`} className="relative">
              <span aria-hidden="true" className="absolute top-1.5 -left-[25px] h-2 w-2 rounded-full bg-forest" />
              <div className="text-sm font-medium">{h.text}</div>
              <div className="text-xs text-muted">{ACTOR[h.by]} · {stamp(h.at)}</div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-2"><Chip>{auth.id}</Chip><Chip>{episode.id}</Chip></div>
      </Drawer>
    </Card>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "risk" | "mid" }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("mt-0.5 text-[14.5px] font-semibold", tone === "risk" ? "text-risk-ink" : tone === "mid" ? "text-mid-ink" : "")}>{value}</dd>
    </div>
  );
}
