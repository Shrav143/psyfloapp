// Peer-to-peer call recording (screen 38, Nov 8 product call: "record the peer-to-peer call here and then just log the
// outcome"). Optional, and only once everyone on the call has agreed to be recorded. The transcript (speech-to-text
// in the browser, or typed notes) is kept on the request and offered as the outcome note; nothing is sent anywhere.
const byId = (arr, id) => (arr || []).find(x => x.id === id);

export default {
  'request.p2pRecording'(s, { id, transcript = '', consent = false, by = 'jperez', typed = false }) {
    const r = byId(s.requests, id); if (!r) throw new Error('Request not found');
    if (!typed && !consent) throw new Error('Confirm that everyone on the call agreed to be recorded');
    const text = String(transcript).trim(); if (!text) throw new Error('Nothing recorded yet');
    r.p2p_recording = { at: this.now(), by, transcript: text, typed: !!typed, consent: !!consent };
    this.event(typed ? 'Peer-to-peer call notes saved (typed during the call)' : 'Peer-to-peer call recorded with everyone\'s consent · transcript saved', by, id);
  }
};
