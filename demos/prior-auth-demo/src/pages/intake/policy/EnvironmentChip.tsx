import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe2 } from "lucide-react";
import { Button, useEscape } from "@/components/ui";
import { cn } from "@/lib/cn";
import { clockTime, toDate } from "@/lib/time";
import { useStore } from "@/store";

/** The demo's environment, in the top bar on every page: post-transition (policy rules as of July 1, 2027) by default, or today's policy. It is the one
    place the switch lives. The demo clock never moves with it; only the policy date every screen evaluates its rules on changes. */
export function EnvironmentChip() {
  const preview = useStore((s) => s.policyPreview);
  const setPreview = useStore((s) => s.setPolicyPreview);
  const clock = useStore((s) => s.clock);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const post = preview === "redesign";
  const word = post ? "post-transition" : "today";
  const day = toDate(clock);
  const clockText = `${day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${clockTime(day)}`;
  const tip = post
    ? `Policy rules are evaluated as of July 1, 2027, when the redesigned services start. The demo clock stays ${clockText}; only policy rules are evaluated as of July 1, 2027.`
    : `Policy rules are evaluated as of the demo clock (${clockText}). Redesigned services show as preparation and retiring services as available.`;

  useEscape(open, () => {
    setOpen(false);
    btn.current?.focus();
  });
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

  const flip = () => {
    const next = post ? "today" : "redesign";
    setPreview(next);
    setOpen(false);
    btn.current?.focus();
    toast({ title: next === "today" ? "Showing today's policy" : "Showing post-transition policy", body: next === "today" ? "Pages re-evaluate their rules as of the demo clock." : "Pages re-evaluate their rules as of July 1, 2027.", tone: "neutral" });
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={btn}
        type="button"
        data-env={preview}
        title={tip}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn("flex h-9 items-center gap-2 rounded-full border px-3 whitespace-nowrap transition-colors", post ? "border-forest bg-[#EEF7F6] text-forest hover:bg-sage-bg" : "border-field bg-white text-ink2 hover:bg-tile")}
      >
        <Globe2 size={15} className="ico shrink-0" aria-hidden="true" />
        <span className="sr-only">Environment: {word}</span>
        <span aria-hidden="true" className="text-[13px] font-medium min-[1400px]:hidden">{post ? "Post-transition" : "Today"}</span>
        <span aria-hidden="true" className="hidden text-[13px] font-medium min-[1400px]:inline">Environment: {word}</span>
        <ChevronDown size={14} className={cn("ico shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div role="dialog" aria-label="Demo environment" className="psy-fade-up absolute top-11 right-0 z-40 w-[min(340px,calc(100vw-32px))] rounded-2xl border border-field bg-white p-4 shadow-[0_12px_32px_rgba(21,27,36,0.14)]">
          <div className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Demo environment</div>
          <div className="mt-1 text-[14px] font-semibold">{post ? "Post-transition" : "Today"}</div>
          <p className="mt-1 text-[13px] text-ink2">{tip}</p>
          <Button className="mt-3 w-full" onClick={flip}>{post ? "Show today's policy instead" : "Show post-transition policy instead"}</Button>
        </div>
      ) : null}
    </div>
  );
}
