import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardPen, FilePlus2, FileCheck2, Plus, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEscape } from "@/components/ui";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";

interface Entry {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  to: () => string;
}
/** The four ways to start work. Each goes to its own flow; none embeds another's form. */
const ENTRIES: Entry[] = [
  { id: "referral", label: "New Referral", hint: "Upload, import, enter or take a referral", icon: FilePlus2, to: () => paths.createReferral() },
  { id: "intake", label: "New Clinical Intake", hint: "Start an assessment for a patient", icon: ClipboardPen, to: () => paths.newIntake() },
  { id: "authorization", label: "New Authorization", hint: "Request a service from a payer", icon: FileCheck2, to: () => paths.newCase() },
  { id: "eligibility", label: "New Eligibility Check", hint: "Check coverage and benefits", icon: ShieldCheck, to: () => paths.eligibilityVerify() },
];

/** The global + New button. Opens on click or the arrow keys, closes on Escape, Tab or a click outside, moves with the arrow keys, Home and End,
    and returns focus to the button. */
export function NewMenu() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  useEscape(open, () => close());
  useEffect(() => {
    if (!open) return;
    items.current[0]?.focus();
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

  const move = (to: number) => items.current[(to + ENTRIES.length) % ENTRIES.length]?.focus();
  const onMenuKey = (e: KeyboardEvent) => {
    const at = items.current.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); move(at + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(at - 1); }
    else if (e.key === "Home") { e.preventDefault(); move(0); }
    else if (e.key === "End") { e.preventDefault(); move(ENTRIES.length - 1); }
    else if (e.key === "Tab") setOpen(false);
  };
  const go = (e: Entry) => {
    close();
    nav(e.to());
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true); }
        }}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-transparent bg-forest pr-3.5 pl-3 whitespace-nowrap text-white transition-colors hover:bg-forest-dark"
      >
        <Plus size={17} className="ico" aria-hidden="true" />
        <span className="font-semibold">New</span>
      </button>
      {open ? (
        <div id={id} role="menu" aria-label="New" onKeyDown={onMenuKey} className="psy-fade-up absolute top-11 right-0 z-40 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-field bg-white p-1.5 shadow-[0_12px_32px_rgba(21,27,36,0.14)]">
          {ENTRIES.map((e, i) => (
            <button
              key={e.id}
              ref={(el) => { items.current[i] = el; }}
              type="button"
              role="menuitem"
              data-new={e.id}
              onClick={() => go(e)}
              className={cn("flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left hover:bg-tile focus-visible:bg-tile")}
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-bg text-forest"><e.icon size={16} className="ico" aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">{e.label}</span>
                <span className="block text-[12px] text-muted">{e.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
