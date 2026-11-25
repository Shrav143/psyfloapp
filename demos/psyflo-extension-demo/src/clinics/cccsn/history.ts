import type { HistoryItem } from "../../types";

/* What Psyflo did before today, newest first. Items with a docId open that document in Lauris; the rest are earlier documents of the roster. */
export const history: HistoryItem[] = [
  { id: "h-c01", type: "session", doc: "dpn", consumerId: "c101", date: "2026-10-28", by: "K. Hale", status: "Scribed: 6 fields typed into Lauris, then saved", time: "9:12 AM", length: "14m", mode: "live" },
  { id: "h-c02", type: "document", doc: "dpn", consumerId: "c105", date: "2026-10-28", by: "J. Perez", status: "Saved in Lauris" },
  { id: "h-c03", type: "document", doc: "dpn", consumerId: "c103", date: "2026-10-27", by: "R. Owens", status: "Saved in Lauris with 2 open alerts", docId: "dpn-c103" },
  { id: "h-c04", type: "session", doc: "dpn", consumerId: "c101", date: "2026-10-27", by: "K. Hale", status: "Scribed: 7 fields typed into Lauris, then saved", time: "10:40 AM", length: "9m", mode: "live" },
  { id: "h-c05", type: "document", doc: "dpn", consumerId: "c101", date: "2026-10-27", by: "K. Hale", status: "Scanned: nothing to fix" },
  { id: "h-c06", type: "session", doc: "admission", consumerId: "c104", date: "2026-10-26", by: "J. Perez", status: "Scribed: 14 fields typed into Lauris, then saved", time: "1:05 PM", length: "22m", mode: "live" },
  { id: "h-c07", type: "session", doc: "assessment", consumerId: "c104", date: "2026-10-26", by: "J. Perez", status: "Scribed: 5 rationale boxes typed into Lauris, then saved", time: "2:30 PM", length: "6m", mode: "dictation" },
  { id: "h-c08", type: "document", doc: "sra", consumerId: "c104", date: "2026-10-26", by: "J. Perez", status: "Scanned: 3 to review, then saved" },
  { id: "h-c09", type: "document", doc: "sra", consumerId: "c106", date: "2026-10-12", by: "J. Perez", status: "Scanned: nothing to fix, then saved" },
  { id: "h-c10", type: "session", doc: "assessment", consumerId: "c105", date: "2026-09-11", by: "J. Perez", status: "Scribed: 6 rationale boxes typed into Lauris, then saved", time: "3:15 PM", length: "31m", mode: "live" },
  { id: "h-11", type: "session", doc: "dpn", consumerId: "", date: "2026-10-26", by: "J. Perez", status: "Recorded; no patient assigned yet", time: "8:03 AM", length: "1m", mode: "dictation" },
];
