import { BadgeCheck, CalendarClock, Compass, FileText, Funnel, Gauge, History, Layers, ListChecks, PenLine, Phone, Radar, ScanText, Scale, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import type { AgentKey, CrewKey } from "./types";

export const CREW: Record<CrewKey, { label: string; sub: string; color: string; bg: string }> = {
  coverage: { label: "Coverage", sub: "Knows who pays and files with them", color: "#1D4F43", bg: "#E6F2EE" },
  documentation: { label: "Documentation", sub: "Reads the chart, writes the case", color: "#5E8A7B", bg: "#EDF4F1" },
  intelligence: { label: "Intelligence", sub: "Knows how each payer behaves", color: "#805E25", bg: "#F6EED6" },
  casework: { label: "Case work", sub: "Moves each case to done", color: "#6B4E3A", bg: "#F2EAE2" },
};

export const AGENTS: Record<AgentKey, { name: string; crew: CrewKey; icon: LucideIcon; role: string }> = {
  verify: { name: "Verify", crew: "coverage", icon: ShieldCheck, role: "Checks coverage and benefits" },
  caller: { name: "Caller", crew: "coverage", icon: Phone, role: "Makes payer calls" },
  navigator: { name: "Navigator", crew: "coverage", icon: Compass, role: "Files and tracks requests" },
  reader: { name: "Reader", crew: "documentation", icon: ScanText, role: "Reads the chart, protects identifiers" },
  criteria: { name: "Criteria", crew: "documentation", icon: ListChecks, role: "Reviews payer policy" },
  placement: { name: "Placement", crew: "documentation", icon: Layers, role: "Maps the chart to ASAM levels" },
  scribe: { name: "Scribe", crew: "documentation", icon: PenLine, role: "Drafts the medical-necessity case" },
  integrity: { name: "Integrity", crew: "documentation", icon: BadgeCheck, role: "Checks every sentence against the chart" },
  historian: { name: "Historian", crew: "intelligence", icon: History, role: "Reviews how this payer has ruled" },
  forecaster: { name: "Forecaster", crew: "intelligence", icon: Gauge, role: "Estimates the approval chance" },
  sentinel: { name: "Sentinel", crew: "intelligence", icon: Radar, role: "Watches for policy changes" },
  analyst: { name: "Analyst", crew: "intelligence", icon: Sparkles, role: "Answers questions, builds reports" },
  packet: { name: "Packet", crew: "casework", icon: FileText, role: "Assembles forms and attachments" },
  scrubber: { name: "Scrubber", crew: "casework", icon: Funnel, role: "Scrubs requests and claims" },
  cadence: { name: "Cadence", crew: "casework", icon: CalendarClock, role: "Schedules concurrent reviews" },
  advocate: { name: "Advocate", crew: "casework", icon: Scale, role: "Handles denials, P2P and appeals" },
};
