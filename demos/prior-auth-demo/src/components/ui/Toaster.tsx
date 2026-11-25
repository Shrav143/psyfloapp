import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useStore } from "@/store";
import type { Toast, Tone } from "@/data/types";
import { cn } from "@/lib/cn";

const ICON = { good: CheckCircle2, mid: AlertTriangle, risk: XCircle, neutral: Info } as const;
const COLOR: Record<Tone, string> = { good: "text-good", mid: "text-mid", risk: "text-risk", neutral: "text-ink2" };

function Item({ t }: { t: Toast }) {
  const dismiss = useStore((s) => s.dismissToast);
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), 4200);
    return () => clearTimeout(id);
  }, [t.id, dismiss]);
  const Icon = ICON[t.tone];
  return (
    <button type="button" onClick={() => dismiss(t.id)} className="psy-fade-up flex w-[340px] items-start gap-3 rounded-2xl border border-edge bg-white px-4 py-3 text-left shadow-[0_12px_32px_rgba(21,27,36,0.14)]">
      <Icon size={20} className={cn("ico mt-0.5", COLOR[t.tone])} />
      <div className="min-w-0">
        <div className="font-semibold">{t.title}</div>
        {t.body ? <div className="text-[13px] text-muted">{t.body}</div> : null}
      </div>
    </button>
  );
}

/** Mounted once in the shell. Anything can call useStore.getState().toast({...}). */
export function Toaster() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-6 bottom-6 z-[80] flex flex-col gap-2.5 [&>*]:pointer-events-auto">
      {toasts.map((t) => (
        <Item key={t.id} t={t} />
      ))}
    </div>
  );
}
