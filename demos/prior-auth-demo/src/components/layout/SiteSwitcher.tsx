import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { toDate } from "@/lib/time";
import { useScope } from "@/lib/scope";
import { SITES } from "@/data/sites";
import { useStore } from "@/store";
import type { SiteScope } from "@/store/session";

const OPTIONS: { value: SiteScope; label: string }[] = [{ value: "both", label: "Both sites" }, ...SITES.map((s) => ({ value: s.id as SiteScope, label: s.name }))];

/** The site switcher in the top bar, with the date the page is "as of". Staff who may see one site get a locked label instead of a switch. */
export function SiteSwitcher() {
  const { scope, restricted, viewer, sites } = useScope();
  const setScope = useStore((s) => s.setSiteScope);
  const asOf = toDate(useStore((s) => s.clock)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="hidden text-[11.5px] font-medium tracking-[0.1em] text-muted uppercase lg:inline">As of</span>
      <span className="hidden text-[13px] font-medium text-ink lg:inline">{asOf}</span>
      {restricted ? (
        <span
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-field bg-white px-3 text-[13px] font-medium text-ink"
          title={`${viewer.name} can see ${sites[0] === "A" ? "Site A" : "Site B"} only. The other site's patients and records are not available to this role.`}
        >
          <Lock size={14} className="ico text-muted" aria-hidden="true" />
          Site {sites[0]} only
        </span>
      ) : (
        <div role="group" aria-label="Site" className="inline-flex h-9 items-center rounded-xl border border-field bg-white p-0.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={scope === o.value}
              onClick={() => setScope(o.value)}
              className={cn("h-8 rounded-[10px] px-3 text-[13px] font-medium transition-colors", scope === o.value ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
