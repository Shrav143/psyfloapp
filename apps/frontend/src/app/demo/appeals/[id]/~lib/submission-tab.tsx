"use client";

import type { Appeal } from "@/lib/demo/appeals";
import { addDays, fmtDate } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { KV } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import {
  CHANNEL_LABEL,
  daysLeft,
  RECEIPT_CALL_AT,
} from "../../~lib/appeal-helpers";

export function SubmissionTab({
  appeal,
  destination,
  filedAt,
  pages,
}: {
  appeal: Appeal;
  destination: string;
  filedAt?: string;
  pages: number;
}) {
  const payer = PAYER_BY_ID[appeal.payerId];
  const left = daysLeft(appeal.deadline);
  const receipt = appeal.receiptConfirmedAt
    ? `${fmtDate(appeal.receiptConfirmedAt, true)} · confirmed by phone`
    : filedAt
      ? `unconfirmed · call ${RECEIPT_CALL_AT}`
      : "after sending · Caller agent, 3 business days";
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <div className="mb-2 font-medium text-slate-900 text-sm">
          Where it goes
        </div>
        <KV
          items={[
            { k: "Destination", v: destination },
            { k: "Channel", v: CHANNEL_LABEL[appeal.channel] },
            {
              k: "Packet",
              v: `${pages} pages · ${payer.packetSplit === "three-part" ? "3 documents" : "1 document"}`,
            },
            {
              k: "Deadline",
              v: (
                <span
                  className={
                    left <= 14 && !appeal.outcome ? "text-rose-600" : undefined
                  }
                >
                  {fmtDate(appeal.deadline, true)} ·{" "}
                  {left >= 0 ? `${left}d left` : `${-left}d ago`}
                </span>
              ),
            },
            {
              k: "Filed",
              v: filedAt ? (
                fmtDate(filedAt, true)
              ) : (
                <Pill tone="amber">not yet</Pill>
              ),
            },
            { k: "Receipt", v: receipt },
            {
              k: "Decision due",
              v: appeal.decisionDueAt
                ? fmtDate(appeal.decisionDueAt, true)
                : filedAt
                  ? fmtDate(addDays(filedAt, 30), true)
                  : "30 days after receipt",
            },
          ]}
        />
      </div>
      <div>
        <div className="mb-2 font-medium text-slate-900 text-sm">
          {payer.short} appeal rules
        </div>
        <KV
          items={[
            {
              k: "Appeal window",
              v: `${payer.appealDeadlineDays} calendar days from the notice`,
            },
            {
              k: "Packet split",
              v:
                payer.packetSplit === "three-part" ? (
                  <Pill tone="amber">three separate documents</Pill>
                ) : (
                  <Pill tone="slate">single upload</Pill>
                ),
            },
            {
              k: "Member-signed form",
              v: payer.requiresMemberSignedAppealForm ? (
                <Pill tone="violet">required · attached</Pill>
              ) : (
                "not required"
              ),
            },
            {
              k: "Criteria set",
              v:
                payer.criteriaSet === "unconfirmed" ? (
                  <Pill tone="amber">unconfirmed — asked on the call</Pill>
                ) : (
                  payer.criteriaSet
                ),
            },
            {
              k: "Decision SLA",
              v: `${payer.decisionSlaDays} days on requests · 30 days on appeals`,
            },
          ]}
        />
        <ul className="mt-3 space-y-1 text-slate-600 text-xs">
          {payer.notes.map((n) => (
            <li key={n} className="flex gap-1.5">
              <span className="text-slate-400">·</span>
              {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
