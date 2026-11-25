import { LayoutDashboard, PanelRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";

/** The switch between the two things this demo shows: the Psyflo extension (docked in Lauris, the clinic's EHR) and the Psyflo platform (the web app). It sits at the top of both,
    so one click goes either way, and each side remembers where it was. Going to the platform returns to the page the person came from there. */
export function ViewToggle({ on, className }: { on: "extension" | "platform"; className?: string }) {
  const nav = useNavigate();
  const returnTo = useStore((s) => s.ehr.returnTo);
  const seg = "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition-colors";
  return (
    <div role="group" aria-label="Switch between the extension and the platform" data-testid="view-toggle" className={cn("inline-flex items-center gap-0.5 rounded-xl border border-field bg-white p-0.5", className)}>
      <button type="button" aria-pressed={on === "extension"} data-testid="view-extension" onClick={() => on !== "extension" && nav(paths.lauris())} className={cn(seg, on === "extension" ? "bg-navy text-white" : "text-ink2 hover:bg-tile")}>
        <PanelRight size={15} className="ico" aria-hidden="true" />Extension
      </button>
      <button type="button" aria-pressed={on === "platform"} data-testid="view-platform" onClick={() => on !== "platform" && nav(returnTo ?? paths.dashboard())} className={cn(seg, on === "platform" ? "bg-navy text-white" : "text-ink2 hover:bg-tile")}>
        <LayoutDashboard size={15} className="ico" aria-hidden="true" />Psyflo platform
      </button>
    </div>
  );
}
