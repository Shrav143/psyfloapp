import { CircleAlert, CircleCheck, Clock, Hourglass, Scale, Send, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import type { Tier } from "./model";

/* The summary: six icons with a number each. Colour carries the meaning (red needs you now, yellow is coming up), the word under the number is one word.
   The first four filter the table; the last two count approved authorizations and open Case Manager. */

export interface TileSpec {
  id: string;
  icon: LucideIcon;
  /** One word. The full sentence is the tooltip. */
  label: string;
  hint: string;
  count: number;
  tone: "risk" | "mid" | "neutral" | "good";
  /** A tier tile filters the table; a link tile goes to Case Manager. */
  tier?: Tier | "payer" | "denied";
  to?: string;
}

const TONE: Record<TileSpec["tone"], { ico: string; ring: string; num: string }> = {
  risk: { ico: "bg-risk-bg text-risk-ink", ring: "border-risk-edge", num: "text-risk-ink" },
  mid: { ico: "bg-mid-bg text-mid-ink", ring: "border-mid-edge", num: "text-mid-ink" },
  neutral: { ico: "bg-neutral-bg text-neutral-ink", ring: "border-edge", num: "text-ink" },
  good: { ico: "bg-good-bg text-good-ink", ring: "border-good-edge", num: "text-good-ink" },
};

function Body({ t }: { t: TileSpec }) {
  const Icon = t.icon;
  const c = TONE[t.tone];
  return (
    <>
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", c.ico)}><Icon size={22} className="ico" aria-hidden="true" /></span>
      <span className="min-w-0">
        <span className={cn("block text-[28px] leading-none font-semibold tabular-nums", c.num)}>{t.count}</span>
        <span className="mt-1 block truncate text-[12px] text-muted">{t.label}</span>
      </span>
    </>
  );
}

export function Tiles({ tiles, active, onPick }: { tiles: TileSpec[]; active: string | null; onPick: (id: string) => void }) {
  const base = "flex min-w-0 items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left transition-colors hover:bg-tile";
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" role="group" aria-label="Summary" data-testid="dash-tiles">
      {tiles.map((t) =>
        t.to ? (
          <Link key={t.id} to={t.to} data-tile={t.id} title={`${t.hint} Opens Case Manager.`} aria-label={`${t.label}: ${t.count}. ${t.hint}`} className={cn(base, TONE[t.tone].ring)}><Body t={t} /></Link>
        ) : (
          <button key={t.id} type="button" data-tile={t.id} aria-pressed={active === t.id} title={t.hint} aria-label={`${t.label}: ${t.count}. ${t.hint}`} onClick={() => onPick(t.id)} className={cn(base, active === t.id ? "border-forest outline-1 outline-forest" : TONE[t.tone].ring)}><Body t={t} /></button>
        ),
      )}
    </div>
  );
}

export const TILE_ICONS = { attention: CircleAlert, upcoming: Clock, payer: Send, denied: Scale, active: CircleCheck, expiring: Hourglass };
