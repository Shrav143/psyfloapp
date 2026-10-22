import { Card, CardHeader } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { isoOf, leftText, minutesOf, payerNameOf } from "@/data/patients";
import { PROGRAM_LABEL } from "@/data/types";
import { plural } from "@/lib/format";
import { ago } from "@/lib/time";
import { authType } from "./authType";
import type { CaseEnv } from "./caseEnv";
import type { ReviewModel } from "./reviewModel";
import { datesOfService, describeVerification } from "./verificationFor";

const mdy = (iso: string): string => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;

/** The case in one list: who, which payer, which type of request, what service and dates, what Eligibility found, the authorization it follows, how ready the documents are,
    the medical-necessity summary and what is still outstanding. Computed live from the draft, never typed. */
export function ReviewSummary({ draft, env, review }: { draft: CaseDraft; env: CaseEnv; review: ReviewModel }) {
  const dos = datesOfService(draft);
  const rec = env.verification.record;
  const a = authType(draft.kind).existing ? env.authorization : undefined;
  const b = a ? undefined : authType(draft.kind).existing ? draft.basis : undefined;
  const acks = review.missing.filter((m) => m.severity === "ack").length;
  const notes = review.missing.filter((m) => m.severity === "note").length;
  const r = env.readiness;
  const words = review.sections.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
  const rows: [string, string][] = [
    ["Patient", draft.patient.initials ? `${draft.patient.initials}, ${draft.patient.age ?? ""}${draft.patientId ? ` · existing patient ${draft.patientId}` : " · new patient"}` : "Not added"],
    ["Payer", draft.payerId ? `${payerNameOf(draft.payerId)}${draft.planType ? ` · ${draft.planType}` : ""}${draft.memberId ? ` · member ID ${draft.memberId.startsWith("…") ? draft.memberId : `…${draft.memberId.replace(/\W/g, "").slice(-4)}`}` : ""}` : "Not added"],
    ["Request", `${authType(draft.kind).label} · recorded as ${draft.type ?? "no type yet"}`],
    ["Service", draft.program ? `${draft.levelLabel ?? PROGRAM_LABEL[draft.program]}` : "Not added"],
    ["Dates and length", dos ? `${mdy(dos.from)} to ${mdy(dos.to)} · ${plural(Math.round((minutesOf(dos.to) - minutesOf(dos.from)) / 1440) + 1, "day")}${draft.endDate ? "" : " (the usual length)"}` : "Not added"],
    ["Eligibility", rec ? `${describeVerification(rec)}. Checked ${ago(rec.checkedAt, env.clock)}, simulated source.` : "Not checked"],
    ["Existing authorization", a ? `${a.id} · ${a.label} · ${leftText(a) ?? "no days on file"}${a.approvedTo === null ? "" : `, ends ${mdy(isoOf(a.approvedTo))}`}` : b ? `${b.label} · ${b.authorized === null ? "no days on file" : `${b.authorized} ${b.unit} authorized`}${b.used !== null && b.authorized !== null ? `, ${b.authorized - b.used} left` : ""}${b.to ? `, ends ${mdy(b.to)}` : ""}` : "None. This starts a new stay."],
    ["Documentation", `${r.ready} of ${r.total} ready${r.missingRequired.length ? `, ${plural(r.missingRequired.length, "required document")} missing` : ""}`],
    ["Medical necessity", review.sections.length ? `${plural(review.sections.length, "section")}, ${words} words, prepared by Scribe from the chart` : "Not prepared yet"],
    ["Outstanding", acks + notes === 0 ? "Nothing outstanding" : `${acks ? `${acks} to acknowledge` : ""}${acks && notes ? ", " : ""}${notes ? plural(notes, "note") : ""}`],
  ];
  return (
    <Card>
      <CardHeader title="Summary" subtitle="What the payer will be asked for" />
      <dl className="grid grid-cols-[160px_minmax(0,1fr)] gap-x-4 gap-y-2.5 px-6 py-5 text-[14px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
