"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { getDataset } from "@/lib/demo/dataset";
import { denialSummary } from "@/lib/demo/denials";
import { eligibilitySummary } from "@/lib/demo/eligibility";
import { useDemoStore } from "@/lib/demo/store";
import { Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";

type Item = {
  id: string;
  who: string;
  text: string;
  href: string;
  tone: "violet" | "amber" | "red" | "blue";
};

export function WorkQueue() {
  const ds = getDataset();
  const queued = useDemoStore((s) => s.signoffQueue.length);
  const [done, setDone] = useState<string[]>([]);
  const signoff =
    ds.authorizations.filter((a) => a.status === "awaiting_signoff").length +
    queued;
  const appeals = ds.authorizations.filter((a) => a.status === "appeal").length;
  const p2p = ds.authorizations.find((a) => a.status === "p2p");
  const info = ds.authorizations.filter(
    (a) => a.status === "info_requested",
  ).length;
  const pastRule = ds.authorizations.filter(
    (a) => a.status === "pending" && a.stateSince <= "2026-09-14",
  ).length;
  const elig = eligibilitySummary();
  const den = denialSummary();
  const items: Item[] = [
    {
      id: "signoff",
      who: "Heather M.",
      text: `${signoff} renewal packets waiting for a signature`,
      href: "/demo/authorizations?view=signoff",
      tone: "violet",
    },
    {
      id: "appeal",
      who: "Heather M.",
      text: `${appeals} appeal letter to sign · Anthem deadline in 19 days`,
      href: "/demo/appeals",
      tone: "red",
    },
    {
      id: "p2p",
      who: "Heather M.",
      text: p2p
        ? `Peer-to-peer Wed 23 Sep 2:30pm · ${p2p.mrn}`
        : "No peer-to-peer scheduled",
      href: "/demo/denials",
      tone: "amber",
    },
    {
      id: "info",
      who: "Jordan P.",
      text: `${info} payer info request open · updated LOCUS needed`,
      href: "/demo/authorizations?status=info_requested",
      tone: "amber",
    },
    {
      id: "rule",
      who: "Jordan P.",
      text: `${pastRule} decisions past the 7-day rule · call the payer`,
      href: "/demo/authorizations?status=pending",
      tone: "blue",
    },
    {
      id: "elig",
      who: "Front desk",
      text: `${elig.exceptions} eligibility exceptions · 1 member lapsed with 9 unbilled visits`,
      href: "/demo/eligibility",
      tone: "red",
    },
    {
      id: "den",
      who: "Offshore billing",
      text: `${den.deadlineSoon} denials with an appeal deadline inside 14 days`,
      href: "/demo/denials",
      tone: "red",
    },
  ];
  return (
    <Panel
      title="Needs me today"
      description="One queue across intake, authorizations, denials and appeals. Owners are explicit."
      padded={false}
    >
      <ul className="divide-y divide-slate-100">
        {items.map((it) => {
          const finished = done.includes(it.id);
          return (
            <li key={it.id} className="flex items-center gap-3 px-5 py-3">
              <Pill tone={it.tone} className="w-28 justify-center">
                {it.who}
              </Pill>
              <Link
                href={it.href}
                className={
                  finished
                    ? "flex-1 text-slate-400 text-sm line-through"
                    : "flex-1 text-slate-800 text-sm hover:underline"
                }
              >
                {it.text}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  setDone((d) => [...d, it.id]);
                  toast.success("Marked done for today", {
                    description: it.text,
                  });
                }}
              >
                <CheckCircle2
                  className={
                    finished
                      ? "size-4 text-emerald-500"
                      : "size-4 text-slate-300"
                  }
                />
              </Button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
