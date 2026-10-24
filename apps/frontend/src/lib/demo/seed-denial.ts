import { addDays, DEMO_TODAY } from "./format";
import { APPEAL_WIN, P2P_REVERSAL, PAYER_BY_ID } from "./payers";
import type { Ctx } from "./seed-base";
import { ev } from "./seed-packets";
import type { AuthEvent, AuthVersion } from "./types";

/** After a denial: peer-to-peer, then a written appeal if needed. Returns the resolving version. */
export function resolveDenial(
  ctx: Ctx,
  denied: AuthVersion,
  events: AuthEvent[],
  n: number,
): {
  version?: AuthVersion;
  nextN: number;
  closed: boolean;
  resumeAt?: string;
} {
  const payer = PAYER_BY_ID[ctx.patient.payerId];
  const decided = denied.decidedAt as string;
  const p2pAt = addDays(decided, ctx.rng.int(3, 8));
  events.push(
    ev(
      addDays(decided, 1),
      "p2p_scheduled",
      "staff",
      `Peer-to-peer requested with ${payer.short}`,
      undefined,
      denied.number,
    ),
  );
  if (ctx.rng.next() < P2P_REVERSAL[payer.id]) {
    const v: AuthVersion = {
      ...denied,
      id: `${denied.id}-p2p`,
      number: n,
      kind: "p2p",
      decision: "approved",
      unitsGranted: Math.min(denied.unitsAsked, 45),
      decidedAt: p2pAt,
      reason: "Overturned on peer-to-peer review.",
      reasonCategory: undefined,
      packet: [],
    };
    events.push(
      ev(
        p2pAt,
        "p2p_held",
        "clinician",
        "Peer-to-peer held · overturned",
        `${v.signedBy} · 40 min · approved ${v.unitsGranted} units`,
        n,
      ),
    );
    return { version: v, nextN: n + 1, closed: false };
  }
  events.push(
    ev(
      p2pAt,
      "p2p_held",
      "clinician",
      "Peer-to-peer held · upheld",
      "Payer reviewer maintained denial",
      denied.number,
    ),
  );
  const filedAt = addDays(p2pAt, ctx.rng.int(4, 12));
  const decidedRaw = addDays(filedAt, ctx.rng.int(24, 48));
  // Recent denials are shaped by the denied bucket, so every generated appeal has a decision.
  const appealDecided =
    decidedRaw < DEMO_TODAY ? decidedRaw : addDays(DEMO_TODAY, -1);
  events.push(
    ev(
      filedAt,
      "appeal_filed",
      "staff",
      `Written appeal sent by ${payer.appealChannel}`,
      undefined,
      n,
    ),
  );
  if (payer.appealChannel === "fax") {
    events.push(
      ev(
        addDays(filedAt, 3),
        "receipt_confirmed",
        "agent",
        "Receipt confirmed by phone",
        "Payer confirmed 3-part packet on file",
        n,
      ),
    );
  }
  const canLose = appealDecided < addDays(DEMO_TODAY, -60);
  if (ctx.rng.next() < APPEAL_WIN[payer.id] || !canLose) {
    const v: AuthVersion = {
      ...denied,
      id: `${denied.id}-ap`,
      number: n,
      kind: "appeal",
      decision: "approved",
      unitsGranted: 30,
      submittedAt: filedAt,
      decidedAt: appealDecided,
      windowStart: appealDecided,
      windowEnd: addDays(appealDecided, 90),
      reason: "Appeal upheld in provider's favour.",
      reasonCategory: undefined,
      packet: [],
    };
    events.push(
      ev(
        appealDecided,
        "appeal_decided",
        "payer",
        "Appeal won · 30 units",
        `Window restarted ${appealDecided}`,
        n,
      ),
    );
    return { version: v, nextN: n + 1, closed: false };
  }
  events.push(
    ev(
      appealDecided,
      "appeal_decided",
      "payer",
      "Appeal lost · final adverse determination",
      undefined,
      n,
    ),
  );
  const resumeRaw = addDays(appealDecided, ctx.rng.int(30, 75));
  const resumeLatest = addDays(DEMO_TODAY, -20);
  const resumeAt = resumeRaw < resumeLatest ? resumeRaw : resumeLatest;
  events.push(
    ev(
      addDays(appealDecided, 2),
      "note",
      "clinician",
      "Paused after final denial",
      `Returned for re-intake ${resumeAt}`,
    ),
  );
  return { version: undefined, nextN: n + 1, closed: true, resumeAt };
}
