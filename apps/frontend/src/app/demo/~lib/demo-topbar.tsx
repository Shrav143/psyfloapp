"use client";

import { Bell, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/lib/core-ui/button";
import { getDataset } from "@/lib/demo/dataset";
import { DEMO_TODAY, fmtLongDate } from "@/lib/demo/format";
import { useDemoStore } from "@/lib/demo/store";
import { cn } from "@/lib/tailwind-utils";
import { titleFor } from "./nav";

const LOCATIONS = [
  { id: "both", label: "Both sites" },
  { id: "lex", label: "Lexington" },
  { id: "hop", label: "Hopkinsville" },
] as const;

export function DemoTopbar() {
  const pathname = usePathname();
  const location = useDemoStore((s) => s.location);
  const setLocation = useDemoStore((s) => s.setLocation);
  const setAskOpen = useDemoStore((s) => s.setAskOpen);
  const queued = useDemoStore((s) => s.signoffQueue.length);
  const signed = useDemoStore((s) => s.signed.length);
  const baseQueue = getDataset().authorizations.filter(
    (a) => a.status === "awaiting_signoff" || a.status === "appeal",
  ).length;
  const queue = Math.max(0, baseQueue + queued - signed);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-slate-200 border-b bg-white/90 px-4 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="truncate font-semibold text-slate-900">
          {titleFor(pathname)}
        </div>
        <span className="hidden text-slate-400 text-xs md:inline">
          {fmtLongDate(DEMO_TODAY)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 lg:flex">
          {LOCATIONS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLocation(l.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                location === l.id
                  ? "bg-white font-medium text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-[11px] text-amber-800 sm:inline">
          Demo data — not Harbor's records
        </span>
        <Button asChild variant="outline" size="sm" className="relative">
          <Link href="/demo/authorizations?view=signoff">
            <Bell className="size-4" />
            <span className="hidden sm:inline">Sign-off queue</span>
            {queue > 0 ? (
              <span className="ml-1 rounded-full bg-violet-600 px-1.5 text-[10px] text-white">
                {queue}
              </span>
            ) : null}
          </Link>
        </Button>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setAskOpen(true)}
        >
          <MessageSquareText className="size-4" />
          Ask Psyflo
        </Button>
      </div>
    </header>
  );
}
