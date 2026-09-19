"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/lib/core-ui/sheet";
import { payerScorecard } from "@/lib/demo/analytics";
import { pct } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { POLICY_CHANGES } from "@/lib/demo/policy-changes";
import type { Payer, PayerId } from "@/lib/demo/types";
import { KV, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { PolicyChangeCard } from "./policy-changes";
import { RuleTupleCard } from "./rule-tuple-card";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 font-medium text-[11px] text-slate-500 uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </section>
  );
}

function channelItems(payer: Payer) {
  const slow = payer.medianDecisionDays > payer.decisionSlaDays;
  return [
    { k: "Auth portal", v: `${payer.authPortal} · ${payer.authChannel}` },
    {
      k: "Appeals",
      v: `${payer.appealChannel}${payer.appealFax ? ` · ${payer.appealFax}` : ""}`,
    },
    {
      k: "Appeal deadline",
      v: `${payer.appealDeadlineDays} days from the adverse determination`,
    },
    {
      k: "Decision clock",
      v: (
        <span className={slow ? "text-amber-700" : ""}>
          {payer.decisionSlaDays}-day rule · median observed{" "}
          {payer.medianDecisionDays} days
        </span>
      ),
    },
    {
      k: "Unit cap",
      v: payer.unitCap
        ? `${payer.unitCap} per ${payer.typicalWindowDays}-day window`
        : "None published",
    },
    { k: "Typical window", v: `${payer.typicalWindowDays} days` },
    {
      k: "Packet split",
      v:
        payer.packetSplit === "three-part"
          ? "Three separate uploads"
          : "Single upload",
    },
    {
      k: "Member-signed form",
      v: payer.requiresMemberSignedAppealForm
        ? "Required on appeals"
        : "Not required",
    },
    {
      k: "Published first-pass",
      v:
        payer.publishedFirstPassApproval === undefined
          ? "Not published"
          : pct(payer.publishedFirstPassApproval),
    },
  ];
}

export function PayerSheet({
  payerId,
  onClose,
}: {
  payerId: PayerId | null;
  onClose: () => void;
}) {
  const payer = payerId ? PAYER_BY_ID[payerId] : undefined;
  const row = payerScorecard().find((r) => r.payerId === payerId);
  const changes = POLICY_CHANGES.filter((c) => c.payerId === payerId);
  return (
    <Sheet
      open={Boolean(payer)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {payer ? (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2 text-base">
                <PayerChip color={payer.color} name={payer.name} />
              </SheetTitle>
              <SheetDescription>
                {payer.kind === "mco"
                  ? "Kentucky Medicaid MCO"
                  : "Traditional Medicare"}
                . Everything below is observed from the ledger or confirmed with
                provider relations. Nothing is predicted.
              </SheetDescription>
              {row ? (
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">First-pass</div>
                    <div className="font-semibold text-slate-900">
                      {pct(row.firstPass)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">Partial rate</div>
                    <div className="font-semibold text-slate-900">
                      {pct(row.partial)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">Trend</div>
                    <div className="font-semibold text-slate-900">
                      {row.trendPts > 0 ? `+${row.trendPts}` : row.trendPts} pts
                    </div>
                  </div>
                </div>
              ) : null}
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              <Section title="Payer notes">
                <ul className="list-disc space-y-1 pl-4 text-slate-700 text-sm">
                  {payer.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </Section>
              <Section title="Channels and clocks">
                <KV items={channelItems(payer)} />
              </Section>
              <RuleTupleCard payer={payer} />
              <Section title="Policy changes detected">
                {changes.length ? (
                  <div className="space-y-3">
                    {changes.map((c) => (
                      <PolicyChangeCard key={c.id} change={c} compact />
                    ))}
                  </div>
                ) : (
                  <Pill tone="slate">None detected for this payer</Pill>
                )}
              </Section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
