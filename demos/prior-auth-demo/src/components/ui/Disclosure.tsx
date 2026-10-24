import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface DisclosureProps {
  title: ReactNode;
  /** One line that stays visible when the section is closed, such as a count or the most important fact. */
  summary?: ReactNode;
  /** Shown at the right of the header, left of the chevron. Keep it to a count or a single pill. */
  right?: ReactNode;
  defaultOpen?: boolean;
  /** Keep the content in the page (hidden) while closed, so typed text and scroll positions survive. */
  keepMounted?: boolean;
  /** "card" draws the section as its own bordered card, "plain" is a heading row with a rule for use inside a card. */
  variant?: "card" | "plain";
  className?: string;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}

/** A section that shows its title and one summary line, and opens to the detail on request. The whole header is the button. */
export function Disclosure({ title, summary, right, defaultOpen = false, keepMounted = false, variant = "card", className, onToggle, children }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const toggle = () => {
    setOpen((o) => {
      onToggle?.(!o);
      return !o;
    });
  };
  return (
    <section className={cn(variant === "card" ? "rounded-[20px] border border-edge bg-white" : "border-t border-line", className)}>
      <h3 className="m-0">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-4 rounded-[20px] px-6 py-4 text-left hover:bg-tile focus-visible:outline-2"
        >
          <span className="min-w-0">
            <span className="block font-serif text-[18px] font-semibold leading-tight tracking-tight">{title}</span>
            {summary ? <span className="mt-[3px] block text-[13px] font-normal text-muted">{summary}</span> : null}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {right}
            <ChevronDown size={18} className={cn("ico text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
          </span>
        </button>
      </h3>
      <div id={id} hidden={!open} className={cn(open && "border-t border-line")}>
        {open || keepMounted ? children : null}
      </div>
    </section>
  );
}
