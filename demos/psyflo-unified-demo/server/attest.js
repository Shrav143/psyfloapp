// Demo-grade attestation of page-bridge events.
//
// A real deployment would carry a proof from the Lauris page session (and the clinician's Psyflo session) with every
// bridge event. In this demo the mock Lauris and the mock portals run in the same process, so the server checks a
// reported event against what the mock itself shows before Psyflo believes it. Nothing read here is shown to a user
// that the open page did not show; this only stops a forged POST from creating a "processed" or "signed" fact.
// (Label for the UI and notes: "page bridge to the open Lauris page", never an API.)
export const attest = {
  // set by server/index.js: ev => ({ ok, reason, session?, signed_by? })
  lauris: null,
  portalRefs: new Map(),
  portalIssued(ref, info = {}) { this.portalRefs.set(String(ref), { ...info, at: Date.now() }); },
  portalKnown(ref) { return this.portalRefs.get(String(ref)) || null; },
  reset() { this.portalRefs.clear(); }
};
