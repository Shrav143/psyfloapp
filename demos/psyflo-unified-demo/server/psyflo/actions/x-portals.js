// Portal / phone group actions (screens 3–5, 8, 11, 12, 20–22, 30, 31, 39).
// core 'dictation.save' keeps spoken, rewritten, chips and checks only; the phone also has the daily-note
// paragraph and the boxes it implies (objective, interventions, mood, progress). This merges them into the
// waiting dictation so the daily-note panel can drop them into the open Lauris form unchanged.
const ALLOWED = ['narrative', 'objective', 'interventions', 'mood', 'progress', 'fixed', 'edited', 'block'];

export default {
  'dictation.annotate'(s, { id, patch = {} }) {
    const d = s.dictations.find(x => x.id === id);
    if (!d) throw new Error('Dictation not found');
    if (d.staff !== this.who() && this.actor?.role !== 'clinician') throw new Error('A dictation can be changed only by the person who made it');
    if (d.status === 'used') throw new Error('A dictation that was used in a note cannot be changed');
    for (const k of ALLOWED) if (patch[k] !== undefined) d[k] = patch[k];
  }
};
