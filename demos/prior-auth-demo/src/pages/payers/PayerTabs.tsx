import { type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

interface PayerTab<T extends string> { id: T; label: string; waiting?: number }

/** The Workflow Builder | Rules & Instructions | Test Workflow | History & Changes switch. History & Changes carries an ochre count when something is waiting.
    Left and Right move between the tabs. */
export function PayerTabs<T extends string>({ tabs, value, onChange }: { tabs: PayerTab<T>[]; value: T; onChange: (t: T) => void }) {
  const move = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };
  return (
    <div role="tablist" aria-label="Payer sections" className="flex max-w-full flex-wrap self-start rounded-xl border border-field bg-white p-0.5">
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button key={t.id} type="button" role="tab" id={`payer-tab-${t.id}`} aria-selected={on} aria-controls="payer-panel" tabIndex={on ? 0 : -1} onKeyDown={(e) => move(e, i)} onClick={() => onChange(t.id)} className={cn("flex h-[30px] items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-medium whitespace-nowrap", on ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}>
            {t.label}
            {t.waiting ? <span className={cn("inline-grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[11px] font-semibold", on ? "bg-white/25 text-white" : "bg-mid-bg text-mid-ink")} aria-label={`${t.waiting} waiting`}>{t.waiting}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
