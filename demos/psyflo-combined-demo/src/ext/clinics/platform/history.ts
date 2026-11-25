import type { HistoryItem } from "../../types";

/* Past scribed sessions and scanned documents (sample data, initials only), newest first. */
export const history: HistoryItem[] = [
  { id: "h-01", type: "session", doc: "admission", consumerId: "4042", date: "2026-10-16", by: "J. Perez", status: "Typed into Lauris and saved", time: "9:40 AM", length: "18m", mode: "live", docId: "adm-4042" },
  { id: "h-02", type: "document", doc: "admission", consumerId: "4042", date: "2026-10-16", by: "J. Perez", status: "Saved in Lauris, not scanned", docId: "adm-4042" },
  { id: "h-03", type: "document", doc: "dpn", consumerId: "4207", date: "2026-10-19", by: "S. Okafor", status: "Saved in Lauris, not scanned", docId: "dpn-4207" },
  { id: "h-04", type: "session", doc: "dpn", consumerId: "4207", date: "2026-10-19", by: "S. Okafor", status: "Typed into Lauris and saved", time: "3:20 PM", length: "7m", mode: "dictation" },
  { id: "h-05", type: "document", doc: "assessment", consumerId: "4042", date: "2026-10-19", by: "A. Morgan", status: "Draft started in Lauris, not scanned", docId: "asm-4042" },
  { id: "h-06", type: "session", doc: "dpn", consumerId: "4988", date: "2026-10-18", by: "D. Rivera", status: "Typed into Lauris and saved", time: "1:10 PM", length: "11m", mode: "live" },
  { id: "h-07", type: "document", doc: "dpn", consumerId: "4988", date: "2026-10-18", by: "D. Rivera", status: "Scanned: nothing to fix" },
  { id: "h-08", type: "session", doc: "intake", consumerId: "", date: "2026-10-17", by: "J. Perez", status: "Recorded; no patient assigned yet", time: "4:02 PM", length: "1m", mode: "dictation" },
];
