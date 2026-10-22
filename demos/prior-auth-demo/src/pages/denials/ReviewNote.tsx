import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { REVIEW_NOTE } from "./lib/format";

/** Sits next to every letter, brief and recommendation FLO's agents generate: a person signs before anything leaves. */
export function ReviewNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-[12.5px] text-muted", className)}>
      <ShieldCheck size={14} className="ico mt-px" aria-hidden="true" />
      <span>{REVIEW_NOTE}</span>
    </p>
  );
}
