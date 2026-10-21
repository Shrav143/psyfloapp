import { CHANNEL_LABEL, SOURCE_KIND_LABEL, STATUS_LABEL, URGENCY_LABEL, issueCount, staffById, type Referral } from "@/data/referrals";
import { PROGRAM_LABEL } from "@/data/types";
import { payerById } from "@/data/seed";
import { longDate } from "@/lib/time";
import { coverageVerdict } from "./metrics";

const esc = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const CSV_HEAD = ["Referral", "Received", "Patient", "Age", "Source", "Source type", "Channel", "Requested program", "Payer", "Coverage", "Urgency", "Document issues", "Status", "Owner"];

function referralsCsv(rows: Referral[]): string {
  const lines = rows.map((r) =>
    [r.id, longDate(r.receivedAt), r.patient.initials, r.patient.age, r.source.name, SOURCE_KIND_LABEL[r.source.kind], CHANNEL_LABEL[r.channel], PROGRAM_LABEL[r.program], r.payerId ? payerById(r.payerId).name : "None listed", coverageVerdict(r).label, URGENCY_LABEL[r.urgency], issueCount(r.checks), STATUS_LABEL[r.status], r.owner ? staffById(r.owner).name : "Unassigned"].map(esc).join(","),
  );
  return [CSV_HEAD.join(","), ...lines].join("\n");
}

/** Hands the rows to the browser as a real file download. */
export function downloadCsv(rows: Referral[], name = "referrals.csv"): void {
  const url = URL.createObjectURL(new Blob([referralsCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
