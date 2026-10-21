import { cn } from "@/lib/cn";

interface PayerTab<T extends string> { id: T; label: string; waiting?: number }

/** The Process | Rules | Documents | Changes switch. Changes carries an ochre count when something is waiting. */
export function PayerTabs<T extends string>({ tabs, value, onChange }: { tabs: PayerTab<T>[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" aria-label="Payer sections" className="inline-flex self-start rounded-xl border border-field bg-white p-0.5">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.id)} className={cn("flex h-[30px] items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-medium", on ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}>
            {t.label}
            {t.waiting ? <span className={cn("inline-grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[11px] font-semibold", on ? "bg-white/25 text-white" : "bg-mid-bg text-mid-ink")} aria-label={`${t.waiting} waiting`}>{t.waiting}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
