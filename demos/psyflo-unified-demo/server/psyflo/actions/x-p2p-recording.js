// Peer-to-peer call notes (screen 38). Recording the call is OFF unless the rule p2p.recording_enabled is switched on (legal review
// first: NEXT-STEPS open question, RC-3). Typed notes taken during the call are always allowed, are kept as notes (never as a
// transcript), and the reply is clinical staff only. Nothing is sent anywhere.
import { rule } from '../../../web/js/shared/rules.js';
import { refuse } from '../gates.js';
const byId = (arr, id) => (arr || []).find(x => x.id === id);

export default {
  'request.p2pRecording'(s, { id, transcript = '', consent = false, typed = false }) {
    const r = byId(s.requests, id); if (!r) throw new Error('Request not found');
    const by = this.who();
    const text = String(transcript).trim(); if (!text) throw new Error('Nothing recorded yet');
    if (r.p2p_recording) refuse('Call notes are already saved for this request; they cannot be replaced.', { record: id, code: 'write_once' });
    if (!typed) {
      const en = rule(s, 'p2p.recording_enabled');
      if (!en.value) refuse('Recording peer-to-peer calls is switched off (rule p2p.recording_enabled, ' + en.verification.toLowerCase() + '). Type notes during the call instead.', { record: id, status: 403 });
      if (!consent) refuse('Confirm that everyone on the call agreed to be recorded.', { record: id, status: 422, audit: false });
    }
    r.p2p_recording = { at: this.now(), by, transcript: typed ? undefined : text, notes: typed ? text : undefined, typed: !!typed, consent: typed ? null : !!consent };
    this.event(typed ? 'Peer-to-peer call notes saved (typed during the call)' : 'Peer-to-peer call recorded with everyone\'s consent · transcript saved', by, id);
  }
};
