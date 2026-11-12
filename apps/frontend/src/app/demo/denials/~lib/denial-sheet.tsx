"use client";

import { ArrowRight, CircleX, Gavel, PhoneCall, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/lib/core-ui/sheet";
import type { Denial, DenialRoute, DenialStatus } from "@/lib/demo/denials";
import { fmtDate, money } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { useDemoStore } from "@/lib/demo/store";
import { KV, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill, StatusBadge } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import { AcceptDialog, P2PDialog } from "./denial-dialogs";
import {
  categoryLabel,
  daysLeft,
  ROUTE_META,
  VALIDITY_CALLOUT,
} from "./denial-helpers";

const ROUTE_ORDER: DenialRoute[] = ["p2p", "appeal", "resubmit", "accept"];
const ICON = {
  p2p: PhoneCall,
  appeal: Gavel,
  resubmit: RefreshCw,
  accept: CircleX,
};

const NEXT: Partial<Record<DenialStatus, string>> = {
  p2p_scheduled:
    "Peer-to-peer on the calendar: Wed 23 Sep 14:30 · Heather M. takes the call with the criteria summary the agent prepared.",
  appeal_drafting:
    "Advocate agent is drafting the cover letter and appeal letter from the record. Lands in the sign-off queue; nothing is sent.",
  appeal_signoff:
    "Appeal packet is drafted and split per payer rule. Waiting for the clinician's signature.",
  accepted: "Closed. Value recorded on the leakage report as preventable.",
};

export function DenialSheet({
  denial,
  open,
  onClose,
  onStatus,
}: {
  denial?: Denial;
  open: boolean;
  onClose: () => void;
  onStatus: (id: string, status: DenialStatus) => void;
}) {
  const [dialog, setDialog] = useState<"p2p" | "accept" | undefined>();
  const addToSignoff = useDemoStore((s) => s.addToSignoff);
  if (!denial) {
    return null;
  }
  const payer = PAYER_BY_ID[denial.payerId];
  const left = daysLeft(denial.deadline);
  const callout = VALIDITY_CALLOUT[denial.validity];

  const act = (route: DenialRoute) => {
    if (route === "p2p") {
      setDialog("p2p");
    } else if (route === "accept") {
      setDialog("accept");
    } else if (route === "resubmit") {
      toast.success("Corrected claim queued for resubmission", {
        description: `${denial.code} · authorization reference added in loop 2300 REF · billing resubmits today`,
      });
    } else {
      addToSignoff(denial.id);
      onStatus(denial.id, "appeal_drafting");
      toast.success("Appeal drafting started · lands in sign-off queue", {
        description: `${denial.mrn} · ${payer.short} · cover letter and appeal letter drafted from the record`,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? undefined : onClose())}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b pr-10">
          <SheetTitle className="flex flex-wrap items-center gap-2 text-base">
            {denial.mrn}
            <StatusBadge status={denial.status} />
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <PayerChip color={payer.color} name={payer.name} />
            <span>· {denial.kind === "pa" ? "PA denial" : "Claim denial"}</span>
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6">
          <KV
            items={[
              { k: "Received", v: fmtDate(denial.receivedAt, true) },
              {
                k: "Code",
                v: <span className="font-mono">{denial.code}</span>,
              },
              { k: "Category", v: categoryLabel(denial.category) },
              { k: "Validity", v: <StatusBadge status={denial.validity} /> },
              {
                k: "Deadline",
                v: (
                  <span className={left <= 14 ? "text-rose-600" : undefined}>
                    {fmtDate(denial.deadline, true)} · {left}d left
                  </span>
                ),
              },
              { k: "$ at risk", v: money(denial.valueAtRisk) },
              { k: "Owner", v: denial.owner },
            ]}
          />
          <div>
            <div className="mb-1 text-slate-500 text-xs uppercase tracking-wide">
              Payer's reason
            </div>
            <blockquote className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800 text-sm">
              "{denial.reason}"
            </blockquote>
          </div>
          <div
            className={cn("rounded-lg border p-3 text-sm", callout.className)}
          >
            <div className="font-medium">{callout.headline}</div>
            <p className="mt-1 text-xs leading-relaxed">
              {denial.validityNote}
            </p>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-slate-500 text-xs uppercase tracking-wide">
                Recommended route
              </span>
              <Pill tone={ROUTE_META[denial.route].tone}>
                {ROUTE_META[denial.route].label}
              </Pill>
            </div>
            <p className="mb-3 text-slate-600 text-xs">
              {ROUTE_META[denial.route].why}
            </p>
            <div className="grid gap-2">
              {ROUTE_ORDER.map((route) => {
                const Icon = ICON[route];
                const primary = route === denial.route;
                const cls = primary ? "bg-indigo-600 hover:bg-indigo-700" : "";
                if (route === "appeal" && denial.appealId) {
                  return (
                    <Button
                      key={route}
                      asChild
                      variant={primary ? "default" : "outline"}
                      className={cn("justify-start", cls)}
                    >
                      <Link href={`/demo/appeals/${denial.appealId}`}>
                        <Icon className="size-4" /> Open appeal workspace
                        <ArrowRight className="ml-auto size-4" />
                      </Link>
                    </Button>
                  );
                }
                return (
                  <Button
                    key={route}
                    variant={primary ? "default" : "outline"}
                    className={cn("justify-start", cls)}
                    onClick={() => act(route)}
                  >
                    <Icon className="size-4" /> {ROUTE_META[route].action}
                  </Button>
                );
              })}
            </div>
          </div>
          {NEXT[denial.status] ? (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-indigo-900 text-xs">
              {NEXT[denial.status]}
            </div>
          ) : null}
        </div>
      </SheetContent>
      <P2PDialog
        open={dialog === "p2p"}
        denial={denial}
        onClose={() => setDialog(undefined)}
        onScheduled={(who, slot) => {
          onStatus(denial.id, "p2p_scheduled");
          setDialog(undefined);
          toast.success(`P2P scheduled · ${slot}`, {
            description: `${who} with the ${payer.short} medical director · ${denial.mrn} · criteria summary attached to the invite`,
          });
        }}
      />
      <AcceptDialog
        open={dialog === "accept"}
        denial={denial}
        onClose={() => setDialog(undefined)}
        onConfirm={() => {
          onStatus(denial.id, "accepted");
          setDialog(undefined);
          onClose();
          toast.success("Denial accepted and written off", {
            description: `${denial.mrn} · ${money(denial.valueAtRisk)} recorded on the leakage report · history kept`,
          });
        }}
      />
    </Sheet>
  );
}
