import type { AnchorHTMLAttributes, ReactNode } from "react";
import { usDate } from "@/engine";
import type { ClinicConfig, Consumer, DocSeed } from "@/types";

/** The name Lauris lists a document under: the seed's own title, else the form's Lauris name and the date. */
export const docTitle = (clinic: ClinicConfig, seed: DocSeed): string => {
  if (seed.title) return seed.title;
  const spec = clinic.forms[seed.kind];
  return `${spec ? spec.laurisName : seed.kind} · ${usDate(seed.date)}`;
};

export const payerName = (clinic: ClinicConfig, id: string): string => clinic.profile.payers.find((p) => p.id === id)?.name ?? id;

/** "12 units available until 11/20/2026", or "No authorizations available". */
export const unitsText = (c: Consumer): { text: string; none: boolean } =>
  c.units
    ? { text: `${c.units.left} ${c.units.left === 1 ? "unit" : "units"} available until ${c.units.ends}`, none: false }
    : { text: "No authorizations available", none: true };

/** The latest date Lauris has anything on for the consumer (a chart record or a document), as Lauris prints it. */
export const updatedOf = (clinic: ClinicConfig, c: Consumer): string => {
  const dates = [...c.chart.map((r) => r.date), ...clinic.docs.filter((d) => d.consumerId === c.id).map((d) => d.date)].sort();
  return dates.length ? usDate(dates[dates.length - 1]) : "—";
};

/** "M.R." → "MR" for the round avatar. */
export const avatarOf = (ini: string): string => ini.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();

/** A link inside the mock: it looks and works like a link (focus, keyboard, hover) but moves through the store, not the address bar. */
export function Go({ onGo, children, ...rest }: { onGo: () => void; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onClick">) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        e.preventDefault();
        onGo();
      }}
    >
      {children}
    </a>
  );
}
