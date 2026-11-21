import type { HistoryItem } from "../../types";

/* Past scribed sessions and scanned documents, 2026-10-20 to 2026-10-28 (sample data, initials only), newest first.
   Only the two items that match a document open in the demo carry a docId. */

export const history: HistoryItem[] = [
  { id: "h-01", type: "document", doc: "dpn", consumerId: "4458", date: "2026-10-28", by: "R. Diaz", status: "Saved in Lauris, not scanned", docId: "dpn-4458" },
  { id: "h-02", type: "document", doc: "sra", consumerId: "4471", date: "2026-10-28", by: "J. Perez", status: "Draft started in Lauris, not scanned", docId: "sra-4471" },
  { id: "h-03", type: "session", doc: "dpn", consumerId: "4441", date: "2026-10-28", by: "K. Hale", status: "Typed into Lauris and saved", time: "9:12 AM", length: "14m", mode: "live" },
  { id: "h-04", type: "session", doc: "dpn", consumerId: "4426", date: "2026-10-28", by: "S. Ortiz", status: "Typed into Lauris and saved", time: "10:40 AM", length: "9m", mode: "live" },
  { id: "h-05", type: "session", doc: "dpn", consumerId: "4471", date: "2026-10-27", by: "K. Hale", status: "Typed into Lauris and saved", time: "1:05 PM", length: "22m", mode: "live" },
  { id: "h-06", type: "document", doc: "dpn", consumerId: "4471", date: "2026-10-27", by: "K. Hale", status: "Scanned: nothing to fix" },
  { id: "h-07", type: "document", doc: "sra", consumerId: "4430", date: "2026-10-26", by: "J. Perez", status: "Scanned: 3 open" },
  { id: "h-08", type: "session", doc: "intake", consumerId: "4466", date: "2026-10-24", by: "J. Perez", status: "Typed into Lauris and saved", time: "2:30 PM", length: "6m", mode: "dictation" },
  { id: "h-09", type: "document", doc: "intake", consumerId: "4466", date: "2026-10-24", by: "J. Perez", status: "Scanned: 2 open" },
  { id: "h-10", type: "session", doc: "assessment", consumerId: "4466", date: "2026-10-23", by: "J. Perez", status: "Typed into Lauris and saved", time: "3:15 PM", length: "31m", mode: "live" },
  { id: "h-11", type: "document", doc: "assessment", consumerId: "4466", date: "2026-10-23", by: "J. Perez", status: "Saved in Lauris with 1 open alert" },
  { id: "h-12", type: "session", doc: "admission", consumerId: "4449", date: "2026-10-20", by: "J. Perez", status: "Typed into Lauris and saved", time: "11:20 AM", length: "12m", mode: "live" },
  { id: "h-13", type: "document", doc: "admission", consumerId: "4449", date: "2026-10-20", by: "J. Perez", status: "Saved in Lauris with 1 open alert" },
  { id: "h-14", type: "session", doc: "dpn", consumerId: "", date: "2026-10-27", by: "J. Perez", status: "Recorded; no patient assigned yet", time: "7:58 AM", length: "1m", mode: "dictation" },
];
