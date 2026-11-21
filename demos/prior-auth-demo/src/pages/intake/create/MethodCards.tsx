import { AudioLines, ClipboardPaste, Database, FileUp, PenLine, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type CreateMethod = "upload" | "emr" | "manual" | "voice" | "paste";

const CARDS: { id: CreateMethod; icon: LucideIcon; title: string; line: string; simulated?: string }[] = [
  { id: "upload", icon: FileUp, title: "Upload Documents", line: "Import referral PDFs, discharge summaries, clinical assessments, or other records.", simulated: "Simulated extraction" },
  { id: "emr", icon: Database, title: "Import from EMR", line: "Select an existing patient or import referral information.", simulated: "Simulated EMR import" },
  { id: "manual", icon: PenLine, title: "Manual Entry", line: "Create a referral by entering the required information." },
  { id: "voice", icon: AudioLines, title: "Voice-Assisted Intake", line: "Capture information during a referral call or conversation.", simulated: "Simulated voice" },
];

/** The four ways to start a referral, and the fifth: paste text or a screenshot. The chosen one stays marked while its steps open below. */
export function MethodCards({ value, onChange }: { value: CreateMethod | null; onChange: (m: CreateMethod) => void }) {
  return (
    <div className="flex flex-col gap-3" data-method-cards>
      <div role="radiogroup" aria-label="How to create the referral" className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2 min-[1200px]:grid-cols-4">
        {CARDS.map((c) => {
          const on = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-method={c.id}
              onClick={() => onChange(c.id)}
              className={cn("flex flex-col gap-3 rounded-[20px] border px-5 py-5 text-left transition-colors", on ? "border-forest bg-sage-bg" : "border-edge bg-white hover:bg-tile")}
            >
              <span className={cn("grid h-10 w-10 place-items-center rounded-full", on ? "bg-forest text-white" : "bg-neutral-bg text-ink2")}>
                <c.icon size={20} className="ico" />
              </span>
              <span>
                <span className="block text-[16px] font-semibold">{c.title}</span>
                <span className="mt-1 block text-[13px] text-muted">{c.line}</span>
              </span>
              {c.simulated ? <span className="mt-auto text-[12px] font-medium text-muted">{c.simulated}</span> : null}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        role="radio"
        aria-checked={value === "paste"}
        data-method="paste"
        onClick={() => onChange("paste")}
        className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors", value === "paste" ? "border-forest bg-sage-bg" : "border-edge bg-white hover:bg-tile")}
      >
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", value === "paste" ? "bg-forest text-white" : "bg-neutral-bg text-ink2")}><ClipboardPaste size={16} className="ico" /></span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold">Paste text or a screenshot</span>
          <span className="block text-[13px] text-muted">Paste a referral email or a screenshot of one. Simulated reading.</span>
        </span>
      </button>
    </div>
  );
}
