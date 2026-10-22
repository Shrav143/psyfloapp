import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { InfoTip } from "@/components/ui";
import { cn } from "@/lib/cn";
import { toDate } from "@/lib/time";
import { useScope } from "@/lib/scope";
import { SITES, sitesLabel } from "@/data/sites";
import { useStore } from "@/store";
import type { SiteScope } from "@/store/session";

const OPTIONS: { value: SiteScope; label: string }[] = [{ value: "both", label: "Both sites" }, ...SITES.map((s) => ({ value: s.id as SiteScope, label: s.name }))];

/** The site switcher in the top bar, with the date the page is "as of". Staff who may see one site get a locked label and a note on why, instead of a switch.
    The group is a set of toggle buttons (Tab to reach, Enter or Space to choose), the chosen one says it is pressed, and a polite status line announces the change. */
export function SiteSwitcher() {
  const { scope, restricted, viewer, sites, label } = useScope();
  const setScope = useStore((s) => s.setSiteScope);
  const asOf = toDate(useStore((s) => s.clock)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  // Announce a change of site or viewer, but stay quiet on first load.
  const [said, setSaid] = useState("");
  const seen = useRef(`${scope}|${viewer.id}`);
  useEffect(() => {
    const now = `${scope}|${viewer.id}`;
    if (seen.current === now) return;
    seen.current = now;
    setSaid(restricted ? `${viewer.name} sees ${label} only.` : `Showing ${label}. Every screen follows this choice.`);
  }, [scope, restricted, viewer.id, viewer.name, label]);

  return (
    <div className="flex min-w-0 items-center gap-2 lg:gap-3">
      <span className="hidden text-[11.5px] font-medium tracking-[0.1em] whitespace-nowrap text-muted uppercase lg:inline">As of</span>
      <span className="hidden text-[13px] font-medium whitespace-nowrap text-ink lg:inline">{asOf}</span>
      {restricted ? (
        <>
          <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-field bg-white px-3 text-[13px] font-medium whitespace-nowrap text-ink">
            <Lock size={14} className="ico text-muted" aria-hidden="true" />
            {sitesLabel(sites)} only
          </span>
          <InfoTip label={`Why ${viewer.name} sees one site`}>
            {viewer.name} works at {sitesLabel(sites)}, so {sitesLabel(sites)} is the only site this role can see. Access is by site (minimum necessary): the other site's patients, requests and records are not listed, counted or searchable, and a link to one shows a notice instead.
          </InfoTip>
        </>
      ) : (
        <>
          <div role="group" aria-label="Site" className="inline-flex h-9 items-center rounded-xl border border-field bg-white p-0.5">
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={scope === o.value}
                onClick={() => setScope(o.value)}
                className={cn("h-8 rounded-[10px] px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors lg:px-3", scope === o.value ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}
              >
                {o.label}
              </button>
            ))}
          </div>
          <InfoTip label="About the site view">
            Both sites shows everything you may see. Choose one site to narrow every list, count and chart on every screen to it. Staff limited to one site see only that site, with no switch.
          </InfoTip>
        </>
      )}
      <span role="status" className="sr-only">{said}</span>
    </div>
  );
}
