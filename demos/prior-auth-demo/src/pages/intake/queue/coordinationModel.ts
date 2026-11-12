import { effectiveStatus } from "@/data/assess/status";
import { REPLY_TASK_ACTION } from "@/data/intake/ext/referral";
import { INTAKE_STAFF } from "@/data/intake/seed";
import { REFERRAL_OUT_LABEL, TRIAGE_LABEL, type IntakeRecord, type ReferralOut, type ReferralOutStatus } from "@/data/intake/types";
import { siteName } from "@/data/sites";
import type { Tone, Urgency } from "@/data/types";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { DAY, longDate } from "@/lib/time";
import { paths } from "@/routes";
import { planFor } from "@/store/intakePlan";
import { activeIntakes } from "@/store/intakeSelectors";
import type { FacetDef } from "./facets";
import { nextActionOf } from "./nextAction";
import { URGENCY_LABEL } from "./labels";
import { lastUpdated, staffName } from "./rows";

/* Care Coordination: everything that waits on someone outside the intake or at a handoff. Three kinds of row (a referral out to another program, an
   information request waiting on the referrer, an intake ready for its next step), grouped by four views the cards filter to. A row can be in more than
   one view: a referral waiting for a reply is both "referrals out" and "awaiting replies". */

export type CoordKind = "out" | "reply" | "handoff";
export const KIND_LABEL: Record<CoordKind, string> = { out: "Referral out", reply: "Information request", handoff: "Care plan and authorization" };
export type CoordView = "out" | "waiting" | "reminder" | "next";
export const VIEW_CARDS: { id: CoordView; label: string; line: string }[] = [
  { id: "out", label: "Referrals out", line: "Sent to other programs" },
  { id: "waiting", label: "Awaiting replies", line: "Waiting on another organization" },
  { id: "reminder", label: "Closed-loop reminders", line: "A follow-up is due or a reply needs you" },
  { id: "next", label: "Ready for next step", line: "Care planning or authorization" },
];

/** Days before a follow-up date that it starts to count as a reminder. */
const SOON = 2 * DAY;
const WAITING_ON_THEM: ReferralOutStatus[] = ["sent", "received", "under_review"];
const OUT_TONE: Record<ReferralOutStatus, Tone> = {
  draft: "neutral", ready: "neutral", sent: "neutral", received: "neutral", under_review: "neutral", accepted: "good", needs_info: "mid", declined: "risk", scheduled: "good", completed: "good",
};

export interface CoordRow {
  key: string;
  kind: CoordKind;
  record: IntakeRecord;
  title: string;
  /** The organization that holds the next move, or the payer for a handoff. */
  counterparty: string;
  serviceId: string;
  serviceLabel: string;
  status: string;
  statusTone: Tone;
  step: string;
  /** A follow-up or appointment date, in demo minutes. */
  due: number | null;
  overdue: boolean;
  updatedAt: number;
  views: CoordView[];
  ro?: ReferralOut;
  taskId?: string;
  /** Where Open goes. */
  to: string;
  /** The follow-up draft waits for a person to approve it. */
  hasDraft: boolean;
}

const serviceLabel = (id: string): string => (id === "external" ? "External program" : serviceById(id as never).short);

function outStep(ro: ReferralOut, overdue: boolean): string {
  switch (ro.status) {
    case "draft": return ro.consent === "on_file" ? "Prepare the packet" : "Get consent to share records";
    case "ready": return "Approve and send";
    case "sent": case "received": case "under_review": return overdue ? "Follow up with them" : "Wait for their decision";
    case "needs_info": return "Answer their information request";
    case "accepted": return "Record the appointment";
    case "declined": return "Choose another program";
    case "scheduled": return ro.appointmentAt !== undefined && ro.appointmentAt < 0 ? "Confirm the appointment happened" : "Appointment is set";
    case "completed": return "Closed";
  }
}

export function buildCoordinationRows(records: readonly IntakeRecord[], clock: number, now: number): CoordRow[] {
  const rows: CoordRow[] = [];
  for (const r of records) {
    for (const ro of r.referralsOut) {
      const waiting = WAITING_ON_THEM.includes(ro.status);
      const due = waiting ? ro.followUpAt ?? null : ro.status === "scheduled" ? ro.appointmentAt ?? null : null;
      const overdue = due !== null && due < clock && ro.status !== "scheduled";
      const reminder = (waiting && due !== null && due <= clock + SOON) || ro.status === "needs_info" || ro.status === "accepted" || ro.status === "declined" || (ro.status === "scheduled" && due !== null && due < clock);
      const views: CoordView[] = ["out", ...(waiting ? (["waiting"] as const) : []), ...(reminder ? (["reminder"] as const) : [])];
      const last = ro.timeline.reduce((m, e) => Math.max(m, e.at), ro.createdAt);
      rows.push({
        key: `${r.id}:${ro.id}`, kind: "out", record: r, title: `Referral to ${ro.destination.org}`, counterparty: ro.destination.contact, serviceId: ro.serviceId, serviceLabel: serviceLabel(ro.serviceId),
        status: REFERRAL_OUT_LABEL[ro.status], statusTone: OUT_TONE[ro.status], step: outStep(ro, overdue), due, overdue, updatedAt: last, views, ro, to: paths.intakeRecord(r.id, "care"), hasDraft: !!ro.followUpDraft,
      });
    }
    for (const t of r.tasks) {
      if (t.role !== "coordination" || t.action !== REPLY_TASK_ACTION || (t.status !== "running" && t.status !== "queued")) continue;
      const due = t.at + 2 * DAY;
      const overdue = due < clock;
      rows.push({
        key: `${r.id}:${t.id}`, kind: "reply", record: r, title: `Information requested from ${r.sourceOrg}`, counterparty: r.sourceOrg, serviceId: r.serviceId, serviceLabel: serviceLabel(r.serviceId),
        status: "Waiting on the referrer", statusTone: "neutral", step: overdue ? "Follow up with the referrer" : "Wait for the reply", due, overdue, updatedAt: t.at,
        views: ["waiting", ...(due <= clock + SOON ? (["reminder"] as const) : [])], taskId: t.id, to: paths.intakeRecord(r.id, "referral"), hasDraft: false,
      });
    }
  }
  for (const r of activeIntakes(records)) {
    const status = effectiveStatus(r);
    if (status !== "care_planning" && status !== "ready_for_auth") continue;
    const next = nextActionOf(r, status, planFor(r, now));
    rows.push({
      key: `${r.id}:next`, kind: "handoff", record: r, title: status === "care_planning" ? "Care planning" : "Authorization", counterparty: r.payerId ? vaPlanOf(r.payerId)?.name ?? "Plan" : "Plan not confirmed",
      serviceId: r.serviceId, serviceLabel: serviceLabel(r.serviceId), status: TRIAGE_LABEL[status], statusTone: status === "ready_for_auth" ? "good" : "neutral", step: next.label, due: null, overdue: false,
      updatedAt: lastUpdated(r), views: ["next"], to: next.to, hasDraft: false,
    });
  }
  return rows;
}

/** Overdue follow-ups first, then the nearest date, then the newest change. */
export function coordinationOrder(a: CoordRow, b: CoordRow): number {
  if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
  if ((a.due === null) !== (b.due === null)) return a.due === null ? 1 : -1;
  return (a.due ?? 0) - (b.due ?? 0) || b.updatedAt - a.updatedAt || a.key.localeCompare(b.key);
}

export const dueLabel = (due: number | null): string => (due === null ? "No date" : longDate(due));

export const coordinationSearchText = (r: CoordRow): string => [r.record.id, r.record.initials, r.title, r.counterparty, r.serviceLabel, r.status, r.step, staffName(r.record.assignedTo)].join(" ");

export function coordinationFacets(): FacetDef<CoordRow>[] {
  const opt = (value: string, label: string) => ({ value, label });
  return [
    { id: "view", label: "View", allLabel: "All items", always: true, values: (r) => r.views, options: () => VIEW_CARDS.map((c) => opt(c.id, c.label)) },
    { id: "type", label: "Type", allLabel: "All types", primary: true, always: true, values: (r) => [r.kind], options: () => (Object.keys(KIND_LABEL) as CoordKind[]).map((k) => opt(k, KIND_LABEL[k])) },
    {
      id: "service", label: "Service", allLabel: "All services", primary: true, menuWidth: 260, values: (r) => [r.serviceId],
      options: (rows) => [...new Map(rows.map((r) => [r.serviceId, r.serviceLabel])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([v, l]) => opt(v, l)),
    },
    {
      id: "status", label: "Status", allLabel: "All statuses", primary: true, menuWidth: 260, values: (r) => [r.status],
      options: (rows) => [...new Set(rows.map((r) => r.status))].sort().map((s) => opt(s, s)),
    },
    { id: "staff", label: "Assigned to", allLabel: "Anyone", primary: true, values: (r) => [r.record.assignedTo], options: () => INTAKE_STAFF.map((s) => opt(s.id, s.name)) },
    { id: "site", label: "Site", allLabel: "All sites", values: (r) => [r.record.site], options: () => (["A", "B"] as const).map((s) => opt(s, siteName(s))) },
    { id: "urgency", label: "Urgency", allLabel: "Any urgency", values: (r) => [r.record.urgency], options: () => (["routine", "urgent", "emergent"] as Urgency[]).map((u) => opt(u, URGENCY_LABEL[u])) },
  ];
}
