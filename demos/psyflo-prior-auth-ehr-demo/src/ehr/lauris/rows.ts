import { useMemo } from "react";
import { QUEUE_ITEMS, type Phase, type QueueItem } from "@/data/queue";
import { siteName, siteOf } from "@/data/sites";
import { useScope } from "@/lib/scope";
import { toDate } from "@/lib/time";
import { consumerNo } from "@/ehr/model";

/* What the Lauris lists show: the cases at the sites in view, read from the same queue the Psyflo Authorizations list uses. */

/** The staff Lauris assigns consumers to: the people of the demo, written the Lauris way. */
export const STAFF = ["J. Perez", "D. Rivera", "A. Morgan", "S. Okafor"];
export const staffOf = (caseId: string): string => STAFF[(parseInt(caseId.replace(/\D/g, ""), 10) || 0) % STAFF.length];

export interface LaurisRow {
  item: QueueItem;
  caseId: string;
  no: string;
  staff: string;
  group: string;
}

/** Every consumer at the sites in view, in queue order. */
export function useLaurisRows(): LaurisRow[] {
  const scope = useScope();
  return useMemo(
    () => scope.filter(QUEUE_ITEMS, (i) => i.id).map((item) => ({ item, caseId: item.id, no: consumerNo(item.id), staff: staffOf(item.id), group: `${item.levelLabel} – ${siteName(siteOf(item.id))}` })),
    [scope],
  );
}

/** Where the authorization stands, in Lauris's words and its chip color (g green, y amber, r red, n grey). */
export const PHASE_CHIP: Record<Phase, { text: string; tone: "g" | "y" | "r" | "n" }> = {
  preparing: { text: "Request in progress", tone: "y" },
  ready: { text: "Ready to sign", tone: "g" },
  payer: { text: "With the payer", tone: "n" },
  denial: { text: "Denied", tone: "r" },
};

const pad = (n: number): string => String(n).padStart(2, "0");
/** "10/20/2026 10:42", the header clock. */
export function laurisStamp(clock: number): string {
  const d = toDate(clock);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
