import { useId, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { useEscape } from "@/components/ui";

/** A small info button whose text shows on hover or keyboard focus, and goes away on blur or Escape. It sits in the top right
    corner of its (relative) parent, so a tile keeps its layout. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEscape(open, () => setOpen(false));
  return (
    <span className="absolute top-2.5 right-2.5" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="grid h-6 w-6 place-items-center rounded-full text-current opacity-70 hover:bg-white/70 hover:opacity-100"
      >
        <Info size={15} className="ico" aria-hidden="true" />
      </button>
      <span id={id} role="tooltip" className={open ? "absolute top-full right-0 z-30 mt-1 block w-64 rounded-xl border border-edge bg-white p-3 text-left text-[12.5px] font-normal normal-case leading-snug tracking-normal text-ink2 shadow-lg" : "hidden"}>
        {children}
      </span>
    </span>
  );
}
