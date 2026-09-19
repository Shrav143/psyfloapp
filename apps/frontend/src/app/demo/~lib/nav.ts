import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  CalendarClock,
  FileWarning,
  Gavel,
  Landmark,
  ShieldCheck,
  Waves,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  hint?: string;
};

export const NAV: NavItem[] = [
  {
    href: "/demo/today",
    label: "Today",
    icon: Activity,
    group: "Overview",
    hint: "Who can we bill for today",
  },
  {
    href: "/demo/eligibility",
    label: "Eligibility",
    icon: ShieldCheck,
    group: "Verify",
    hint: "Rolling 7-day verification",
  },
  {
    href: "/demo/authorizations",
    label: "Authorizations",
    icon: Landmark,
    group: "Authorize",
    hint: "Every request, one board",
  },
  {
    href: "/demo/renewals",
    label: "Renewal radar",
    icon: CalendarClock,
    group: "Authorize",
    hint: "What must be filed, by which clock",
  },
  {
    href: "/demo/denials",
    label: "Denials",
    icon: FileWarning,
    group: "Defend",
    hint: "Validity, route, deadline",
  },
  {
    href: "/demo/appeals",
    label: "Appeals",
    icon: Gavel,
    group: "Defend",
    hint: "Where is my appeal",
  },
  {
    href: "/demo/payers",
    label: "Payers",
    icon: BarChart3,
    group: "Learn",
    hint: "Observed behaviour, never overwritten",
  },
  {
    href: "/demo/leakage",
    label: "Leakage",
    icon: Waves,
    group: "Learn",
    hint: "The waterfall, continuously",
  },
  {
    href: "/demo/agents",
    label: "Agents",
    icon: Bot,
    group: "Automate",
    hint: "What runs, what never sends",
  },
];

export function titleFor(pathname: string): string {
  const item = [...NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => pathname.startsWith(n.href));
  if (pathname.startsWith("/demo/authorizations/new")) {
    return "New authorization request";
  }
  return item?.label ?? "Auth Cockpit";
}
