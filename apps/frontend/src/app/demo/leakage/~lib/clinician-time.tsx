"use client";

import { useState } from "react";
import { Input } from "@/lib/core-ui/input";
import { CLINICIAN_RATE, money } from "@/lib/demo/format";
import { clinicianTime } from "@/lib/demo/leakage";
import { Panel } from "@/lib/demo-ui/primitives";
import { cn } from "@/lib/tailwind-utils";

const P2P_HOURS = 0.75;
const APPEAL_HOURS = 4;

function hrs(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)} h`;
}

function Row({
  label,
  formula,
  hours,
  bold,
}: {
  label: string;
  formula: string;
  hours: number;
  bold?: boolean;
}) {
  return (
    <tr className={cn("border-slate-100 border-b", bold && "font-semibold")}>
      <td className="py-2 text-slate-800">{label}</td>
      <td className="py-2 text-slate-500 text-xs">{formula}</td>
      <td className="py-2 text-right tabular-nums">{hrs(hours)}</td>
      <td className="py-2 text-right tabular-nums">
        {money(hours * CLINICIAN_RATE)}
      </td>
    </tr>
  );
}

export function ClinicianTime({ days }: { days: number }) {
  const t = clinicianTime(days);
  const [raw, setRaw] = useState("");
  const entered = Number.parseFloat(raw);
  const valid = raw.trim() !== "" && Number.isFinite(entered) && entered >= 0;
  const modelHours = t.packets * t.perPacketHours;
  const todayHours = t.packets * entered;
  const delta = (todayHours - modelHours) * CLINICIAN_RATE;
  return (
    <Panel
      title="Clinician time, costed"
      description={`Events counted in the ledger for the last ${days} days, priced at ${money(CLINICIAN_RATE)} per clinician hour. Hours per event are the modelled figures shown in each row.`}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wide">
            <th className="pb-2 font-medium">Work</th>
            <th className="pb-2 font-medium">Count × time</th>
            <th className="pb-2 text-right font-medium">Hours</th>
            <th className="pb-2 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          <Row
            label="Packets drafted and signed"
            formula={`${t.packets} × ${hrs(t.perPacketHours)}`}
            hours={modelHours}
          />
          <Row
            label="Peer-to-peers held"
            formula={`${t.p2ps} × 45 min`}
            hours={t.p2ps * P2P_HOURS}
          />
          <Row
            label="Written appeals filed"
            formula={`${t.appeals} × ${hrs(APPEAL_HOURS)}`}
            hours={t.appeals * APPEAL_HOURS}
          />
          <Row label="Total" formula="" hours={t.hours} bold />
        </tbody>
      </table>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <label
          htmlFor="hours-per-packet"
          className="font-medium text-slate-800 text-sm"
        >
          Hours per packet today
        </label>
        <div className="mt-1 text-slate-500 text-xs">
          What a renewal packet costs a clinician without the engine. The packet
          line re-prices live against the {hrs(t.perPacketHours)} modelled.
        </div>
        <Input
          id="hours-per-packet"
          type="number"
          min={0}
          step={0.5}
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Tracy fills this in"
          className="mt-2 max-w-[220px] bg-white"
        />
        {valid ? (
          <div className="mt-3 space-y-1 text-sm">
            <div className="text-slate-800">
              At {hrs(entered)} per packet, {t.packets} packets cost{" "}
              <span className="font-semibold">
                {money(todayHours * CLINICIAN_RATE)}
              </span>{" "}
              ({hrs(todayHours)}) versus {money(modelHours * CLINICIAN_RATE)} at{" "}
              {hrs(t.perPacketHours)}.
            </div>
            {delta >= 0 ? (
              <div className="font-medium text-emerald-700">
                What your engine saved: {money(delta)} ·{" "}
                {hrs(todayHours - modelHours)} of clinician time in {days} days.
              </div>
            ) : (
              <div className="font-medium text-amber-700">
                Your packets already beat the model by{" "}
                {hrs(modelHours - todayHours)} ({money(-delta)}). Tell us the
                figure and the model re-prices.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 text-slate-400 text-xs">
            Nothing is assumed until a number is entered.
          </div>
        )}
      </div>
    </Panel>
  );
}
