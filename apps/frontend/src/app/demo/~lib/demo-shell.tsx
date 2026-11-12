"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/tailwind-utils";
import { AskPanel } from "./ask-panel";
import { DemoTopbar } from "./demo-topbar";
import { NAV } from "./nav";

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-slate-200 border-r bg-white md:flex">
        <Link
          href="/demo/today"
          className="flex items-center gap-2.5 px-5 py-5"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-sm text-white">
            P
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm leading-tight">
              Psyflo
            </div>
            <div className="text-slate-500 text-xs leading-tight">
              Auth Cockpit
            </div>
          </div>
        </Link>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-2 pb-1 font-medium text-[11px] text-slate-400 uppercase tracking-wider">
                {g}
              </div>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === g).map((n) => {
                  const active =
                    pathname === n.href ||
                    (n.href !== "/demo/today" &&
                      pathname.startsWith(`${n.href}/`)) ||
                    pathname === n.href;
                  const Icon = n.icon;
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                          active
                            ? "bg-indigo-600 text-white"
                            : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4",
                            active ? "text-white" : "text-slate-400",
                          )}
                        />
                        <span className="flex-1">{n.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-slate-200 border-t px-4 py-4">
          <div className="font-medium text-slate-900 text-xs">
            Harbor Behavioral Health
          </div>
          <div className="text-slate-500 text-xs">Lexington · Hopkinsville</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-slate-900 font-semibold text-white text-xs">
              TC
            </div>
            <div className="text-xs">
              <div className="font-medium text-slate-800">Tracy C.</div>
              <div className="text-slate-500">
                COO · signs nothing she hasn't read
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoTopbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
      <AskPanel />
    </div>
  );
}
