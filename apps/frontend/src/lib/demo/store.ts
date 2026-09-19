"use client";

import { create } from "zustand";
import type { LocationId } from "./types";

export type AskMessage = {
  role: "user" | "psyflo";
  text: string;
  sources?: string[];
};

type DemoState = {
  location: LocationId | "both";
  setLocation: (l: LocationId | "both") => void;
  signoffQueue: string[];
  addToSignoff: (id: string) => void;
  signed: string[];
  markSigned: (id: string) => void;
  submitted: string[];
  markSubmitted: (id: string) => void;
  acknowledgedPolicies: string[];
  acknowledgePolicy: (id: string) => void;
  answeredQuestions: Record<string, string>;
  answerQuestion: (runId: string, answer: string) => void;
  askOpen: boolean;
  setAskOpen: (open: boolean) => void;
  askMessages: AskMessage[];
  pushAsk: (m: AskMessage) => void;
  leadBufferDays: number;
  setLeadBufferDays: (n: number) => void;
};

/** Session-only state so every button on the demo does something visible. Nothing persists. */
export const useDemoStore = create<DemoState>((set) => ({
  location: "both",
  setLocation: (location) => set({ location }),
  signoffQueue: [],
  addToSignoff: (id) =>
    set((s) => ({
      signoffQueue: s.signoffQueue.includes(id)
        ? s.signoffQueue
        : [...s.signoffQueue, id],
    })),
  signed: [],
  markSigned: (id) => set((s) => ({ signed: [...s.signed, id] })),
  submitted: [],
  markSubmitted: (id) => set((s) => ({ submitted: [...s.submitted, id] })),
  acknowledgedPolicies: [],
  acknowledgePolicy: (id) =>
    set((s) => ({ acknowledgedPolicies: [...s.acknowledgedPolicies, id] })),
  answeredQuestions: {},
  answerQuestion: (runId, answer) =>
    set((s) => ({
      answeredQuestions: { ...s.answeredQuestions, [runId]: answer },
    })),
  askOpen: false,
  setAskOpen: (askOpen) => set({ askOpen }),
  askMessages: [],
  pushAsk: (m) => set((s) => ({ askMessages: [...s.askMessages, m] })),
  leadBufferDays: 5,
  setLeadBufferDays: (leadBufferDays) => set({ leadBufferDays }),
}));
