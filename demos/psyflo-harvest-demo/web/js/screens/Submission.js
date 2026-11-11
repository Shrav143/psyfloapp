// 19 · Submission (route Submission) · retired as a page: the Authorizations drawer replaces it (activity log, attachments, Send).
// The route stays registered so old links keep working; it forwards to Authorizations?open=<request id> and leaves no history entry.
import { register, Screen, hrefFor } from '../app.js';

register('Submission', class extends Screen {
  init() {
    const id = this.params.id || this.params.request;
    const target = hrefFor('Authorizations.dc.html', id ? { open: id } : {});
    setTimeout(() => { location.replace(target); }, 0);
  }
  renderVals() { return {}; }
});
