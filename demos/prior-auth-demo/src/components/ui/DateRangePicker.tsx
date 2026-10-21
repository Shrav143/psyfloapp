import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, daysInMonth, firstOfMonth, fullDate, monthTitle, rangeLabel, shortDay, weekdayOf, type DateRange } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface RangePreset {
  label: string;
  range: DateRange;
}

interface Props {
  value: DateRange;
  onChange: (r: DateRange) => void;
  /** The range that means "no filter"; the control looks active when value differs from it. */
  defaultValue?: DateRange;
  /** Days after `max` or before `min` cannot be picked. */
  min?: string;
  max?: string;
  presets?: RangePreset[];
  ariaLabel?: string;
  className?: string;
}

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const same = (a: DateRange, b: DateRange): boolean => a.from === b.from && a.to === b.to;

/** One month of days. Picked ends are filled forest, days between are tinted, days outside min and max are dimmed. */
function Month({ month, from, to, hover, min, max, focus, onPick, onHover, onFocusDay }: { month: string; from: string | null; to: string | null; hover: string | null; min?: string; max?: string; focus: string; onPick: (d: string) => void; onHover: (d: string | null) => void; onFocusDay: (d: string) => void }) {
  const lead = weekdayOf(firstOfMonth(month));
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => `${month.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`);
  const end = to ?? hover;
  const lo = from && end ? (from <= end ? from : end) : from;
  const hi = from && end ? (from <= end ? end : from) : from;
  return (
    <div className="w-[252px]" role="grid" aria-label={monthTitle(month)}>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-muted uppercase" role="row">
        {WEEK.map((w) => (
          <span key={w} role="columnheader" className="grid h-7 place-items-center">{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7" role="rowgroup">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} className="h-9" />
        ))}
        {days.map((d) => {
          const off = (!!min && d < min) || (!!max && d > max);
          const isEnd = d === from || d === to;
          const inside = !!lo && !!hi && d > lo && d < hi;
          return (
            <span key={d} role="gridcell" className={cn("grid h-9 place-items-center", inside && "bg-[#EAF1EC]", d === lo && hi !== lo && "rounded-l-full bg-[#EAF1EC]", d === hi && hi !== lo && "rounded-r-full bg-[#EAF1EC]")}>
              <button
                type="button"
                data-day={d}
                tabIndex={d === focus ? 0 : -1}
                disabled={off}
                aria-label={fullDate(d)}
                aria-pressed={isEnd}
                onClick={() => onPick(d)}
                onMouseEnter={() => onHover(d)}
                onFocus={() => onFocusDay(d)}
                className={cn("grid h-9 w-9 place-items-center rounded-full text-sm", isEnd ? "bg-forest font-semibold text-white" : off ? "text-faint" : "hover:bg-[#DCE8E0]")}
              >
                {Number(d.slice(8))}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** A date range with a calendar: click a start day, then an end day. Presets on the left apply at once. Esc or a click outside closes it. */
export function DateRangePicker({ value, onChange, defaultValue, min, max, presets = [], ariaLabel = "Date range", className }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string | null>(value.from);
  const [to, setTo] = useState<string | null>(value.to);
  const [hover, setHover] = useState<string | null>(null);
  const [left, setLeft] = useState(addMonths(value.to, -1));
  const [focus, setFocus] = useState(value.to);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const active = defaultValue !== undefined && !same(value, defaultValue);

  /* Opening starts from the applied range, so a half-finished pick never lingers. */
  const show = () => {
    setFrom(value.from);
    setTo(value.to);
    setHover(null);
    setLeft(addMonths(value.to, -1));
    setFocus(value.to);
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const right = addMonths(left, 1);
  const tabDay = focus >= left && focus < addMonths(left, 2) ? focus : firstOfMonth(left);
  const pick = (d: string) => {
    if (from && !to && d >= from) setTo(d);
    else {
      setFrom(d);
      setTo(null);
    }
  };
  const apply = (r: DateRange) => {
    onChange(r);
    setOpen(false);
  };
  const ready = !!from && !!to;
  const preview = useMemo(() => (from && to ? { from, to } : null), [from, to]);

  const move = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" ? -7 : e.key === "ArrowDown" ? 7 : 0;
    if (!step) return;
    e.preventDefault();
    let next = addDays(focus, step);
    if (min && next < min) next = min;
    if (max && next > max) next = max;
    setFocus(next);
    if (next < left) setLeft(firstOfMonth(next));
    else if (next >= addMonths(left, 2)) setLeft(addMonths(firstOfMonth(next), -1));
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus());
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${ariaLabel}: ${rangeLabel(value)}`}
        onClick={() => (open ? setOpen(false) : show())}
        className={cn("flex h-[38px] items-center gap-2 rounded-xl border bg-white px-3 text-sm text-ink transition-colors hover:bg-tile", active ? "border-forest bg-[#F3F7F4] font-semibold" : "border-field")}
      >
        <CalendarDays size={16} className="ico text-muted" />
        {rangeLabel(value)}
      </button>
      {open ? (
        <div id={id} role="dialog" aria-label={`Choose ${ariaLabel.toLowerCase()}`} onKeyDown={move} className="absolute top-[44px] right-0 z-40 flex rounded-2xl border border-edge bg-white shadow-[0_12px_40px_rgba(40,30,15,0.14)]">
          {presets.length ? (
            <ul className="flex w-[150px] flex-col gap-0.5 border-r border-line p-2.5">
              {presets.map((p) => (
                <li key={p.label}>
                  <button type="button" onClick={() => apply(p.range)} className={cn("w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-tile", same(p.range, value) && "bg-[#F3F7F4] font-semibold text-forest")}>
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="p-4" onMouseLeave={() => setHover(null)}>
            <div className="mb-2 flex items-center justify-between">
              <button type="button" aria-label="Earlier months" onClick={() => setLeft(addMonths(left, -1))} className="grid h-8 w-8 place-items-center rounded-lg border border-field hover:bg-tile">
                <ChevronLeft size={16} className="ico" />
              </button>
              <div className="flex flex-1 justify-around text-sm font-semibold" aria-live="polite">
                <span>{monthTitle(left)}</span>
                <span>{monthTitle(right)}</span>
              </div>
              <button type="button" aria-label="Later months" disabled={!!max && addMonths(right, 1) > max} onClick={() => setLeft(addMonths(left, 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-field hover:bg-tile disabled:opacity-40">
                <ChevronRight size={16} className="ico" />
              </button>
            </div>
            <div className="flex gap-6">
              {[left, right].map((m) => (
                <Month key={m} month={m} from={from} to={to} hover={from && !to ? hover : null} min={min} max={max} focus={tabDay} onPick={pick} onHover={setHover} onFocusDay={setFocus} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3">
              <div className="text-[13px] text-muted" aria-live="polite">
                {!from ? "Pick a start day" : !to ? <>Start <b className="text-ink">{shortDay(from, true)}</b>. Now pick an end day.</> : <><b className="text-ink">{shortDay(from, true)}</b> to <b className="text-ink">{shortDay(to, true)}</b></>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" variant="primary" disabled={!ready} onClick={() => preview && apply(preview)}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
