import type { StateCreator } from "zustand";
import type { AgentKey } from "@/data/types";
import type { AppState } from "./index";

/* Context the clinic gives the agents about a payer: anything Psyflo does not already know. It is plain text, written the way you would tell a new colleague.
   Each note says which agents read it (all of them, or a few) and can be paused without being deleted. The agents read the active notes with the payer's rules on the next request. */

export interface PayerNote {
  id: string;
  payerId: string;
  text: string;
  /** "all", or the agents that read it. */
  agents: "all" | AgentKey[];
  at: number;
  by: string;
  active: boolean;
  /** A note that came with the demo, so it says Sample. */
  sample?: boolean;
}

export interface PayerNotesSlice {
  payerNotes: PayerNote[];
  addPayerNote: (payerId: string, text: string, agents: "all" | AgentKey[]) => void;
  togglePayerNote: (id: string) => void;
  removePayerNote: (id: string) => void;
}

const SEED: PayerNote[] = [
  { id: "pn-1", payerId: "cardinal", text: "Peer-to-peer slots fill by noon. Book the call before 10 am on the day the denial letter arrives.", agents: ["advocate", "caller"], at: -3 * 24 * 60, by: "Jordan Perez", active: true, sample: true },
  { id: "pn-2", payerId: "evergreen", text: "Evergreen only takes requests by phone. Ask for a reference number and write it on the case.", agents: "all", at: -9 * 24 * 60, by: "Jordan Perez", active: true, sample: true },
];

export const createPayerNotesSlice: StateCreator<AppState, [], [], PayerNotesSlice> = (set, get) => ({
  payerNotes: SEED,
  addPayerNote: (payerId, text, agents) => {
    const clock = get().clock;
    set((s) => ({ payerNotes: [{ id: `pn-${s.payerNotes.length + 1}-${clock}`, payerId, text: text.trim(), agents, at: clock, by: "You", active: true }, ...s.payerNotes] }));
    get().toast({ title: "Added for the agents", body: "They will read it with this payer's rules on the next request.", tone: "good" });
  },
  togglePayerNote: (id) => set((s) => ({ payerNotes: s.payerNotes.map((n) => (n.id === id ? { ...n, active: !n.active } : n)) })),
  removePayerNote: (id) => set((s) => ({ payerNotes: s.payerNotes.filter((n) => n.id !== id) })),
});
