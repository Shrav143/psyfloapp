import { SYNC_EVERY_MIN, type EmrSystem, type SystemStatus } from "@/data/emr";
import type { Tone } from "@/data/types";
import { duration } from "@/lib/time";

export const STATUS: Record<SystemStatus, { label: string; tone: Tone }> = {
  connected: { label: "Connected", tone: "good" },
  attention: { label: "Needs attention", tone: "mid" },
  disconnected: { label: "Disconnected", tone: "risk" },
};

/** The Last sync tile: how long since the most recent sync of a connected system. */
export function lastSyncTile(systems: EmrSystem[], clock: number): { value: string; sub: string; tone: Tone } {
  // A system that "needs attention" still answers; only a disconnected one changes the tile.
  const live = systems.filter((s) => s.status !== "disconnected");
  const off = systems.length - live.length;
  const sub = !systems.length ? "no system connected" : off === 0 ? "all systems answering" : `${off} ${off === 1 ? "system is" : "systems are"} disconnected`;
  if (!live.length) return { value: "None", sub, tone: "risk" };
  const newest = Math.max(...live.map((s) => s.lastSyncAt));
  const value = clock - newest < 1 ? "Just now" : duration(clock - newest).replace(" m", " min");
  return { value, sub, tone: off === 0 ? "good" : "mid" };
}

/** What a system that is not connected means for New Authorization, and what to do about it. Empty for a connected system. */
export function pullNote(s: EmrSystem): string {
  if (s.status === "connected") return "";
  const next = s.status === "attention" ? " First step: renew the sign-in with Fix." : s.fixIssue ? " Reconnect starts with a fix." : "";
  return `${s.issue ?? ""}${next} New Authorization cannot pull a chart from it until it is connected.`;
}

/** Syncs a system has missed since its last good one (one per SYNC_EVERY_MIN, demo values). Null for a disconnected system: it is not asked at all. */
export function syncFailures(s: EmrSystem, clock: number): number | null {
  if (s.status === "disconnected") return null;
  return s.status === "attention" ? Math.floor(Math.max(0, clock - s.lastSyncAt) / SYNC_EVERY_MIN) : 0;
}
