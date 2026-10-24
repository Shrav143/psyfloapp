"use client";

import { ArrowLeft, FileSignature, Gavel, PhoneCall } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { authById, patientByMrn, visitDatesFor } from "@/lib/demo/dataset";
import { clocksFor } from "@/lib/demo/derive";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { useDemoStore } from "@/lib/demo/store";
import { EmptyState, PayerChip } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";
import { AttendanceChart } from "./attendance-chart";
import { HistoryTimeline } from "./history-timeline";
import { SidePanel } from "./side-panel";
import { TwoClocks } from "./two-clocks";

export function DetailClient({ id }: { id: string }) {
  const auth = authById(id);
  const patient = auth ? patientByMrn(auth.mrn) : undefined;
  const addToSignoff = useDemoStore((s) => s.addToSignoff);
  const setAskOpen = useDemoStore((s) => s.setAskOpen);
  if (!auth || !patient) {
    return (
      <EmptyState
        title="Authorization not found"
        body="Pick one from the board."
      />
    );
  }
  const visits = visitDatesFor(patient.mrn);
  const clocks = clocksFor(patient, auth, visits);
  const payer = PAYER_BY_ID[auth.payerId];
  const denied = auth.versions[auth.versions.length - 1]?.decision === "denied";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/demo/authorizations"
            className="inline-flex items-center gap-1 text-slate-500 text-xs hover:text-slate-800"
          >
            <ArrowLeft className="size-3" /> Board
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-semibold text-2xl text-slate-900 tracking-tight">
              {patient.mrn}
            </h1>
            <span className="text-slate-500">{patient.initials}</span>
            <StatusBadge status={auth.status} />
            <PayerChip color={payer.color} name={payer.name} />
            {patient.dualEligible ? (
              <StatusBadge status="medicare_first" />
            ) : null}
          </div>
          <div className="mt-1 text-slate-500 text-sm">
            H2020 · Therapeutic rehabilitation program ·{" "}
            {patient.location === "lex" ? "Lexington" : "Hopkinsville"} ·{" "}
            {patient.diagnosisCode} {patient.diagnosisLabel} · plan{" "}
            {patient.plannedPerWeek}/wk, attending {patient.actualPerWeek}/wk
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setAskOpen(true)}>
            Ask about this patient
          </Button>
          {denied ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/demo/appeals">
                <Gavel className="size-4" /> Open appeal
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.success("Peer-to-peer requested", {
                  description: `${payer.short} · Heather M. will be offered the next available slot`,
                })
              }
            >
              <PhoneCall className="size-4" /> Request peer-to-peer
            </Button>
          )}
          <Button
            asChild
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              addToSignoff(auth.id);
              toast.success("Renewal started", {
                description:
                  "Packet will be drafted from Sunwave and land in the clinician sign-off queue. Nothing is sent.",
              });
            }}
          >
            <Link
              href={`/demo/authorizations/new?mrn=${patient.mrn}&kind=renewal`}
            >
              <FileSignature className="size-4" /> Start renewal
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          {clocks ? (
            <TwoClocks clocks={clocks} payer={payer} />
          ) : (
            <EmptyState
              title="No decided authorization yet"
              body={auth.nextAction}
            />
          )}
          {clocks ? (
            <AttendanceChart
              clocks={clocks}
              visits={visits}
              perWeekPlanned={patient.plannedPerWeek}
            />
          ) : null}
          <HistoryTimeline auth={auth} />
        </div>
        <SidePanel auth={auth} patient={patient} clocks={clocks} />
      </div>
    </div>
  );
}
