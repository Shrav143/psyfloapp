import type { EmrSystem, SystemStatus } from "@/data/emr";
import type { Tone } from "@/data/types";
import { duration } from "@/lib/time";

export const STATUS: Record<SystemStatus, { label: string; tone: Tone }> = {
  connected: { label: "Connected", tone: "good" },
  attention: { label: "Needs a quick look", tone: "mid" },
  disconnected: { label: "Disconnected", tone: "risk" },
};

/** The Last sync tile: how long since the most recent sync of a connected system. */
export function lastSyncTile(systems: EmrSystem[], clock: number): { value: string; sub: string; tone: Tone } {
  // A system that "needs a quick look" still answers; only a disconnected one changes the tile.
  const live = systems.filter((s) => s.status !== "disconnected");
  const off = systems.length - live.length;
  const sub = !systems.length ? "no system connected" : off === 0 ? "all systems answering" : `${off} ${off === 1 ? "system is" : "systems are"} disconnected`;
  if (!live.length) return { value: "None", sub, tone: "risk" };
  const newest = Math.max(...live.map((s) => s.lastSyncAt));
  const value = clock - newest < 1 ? "Just now" : duration(clock - newest).replace(" m", " min");
  return { value, sub, tone: off === 0 ? "good" : "mid" };
}
