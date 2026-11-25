/** The review screen of a draft, on the Create Referral page. The routes file has no helper for it, so it lives here. */
export const draftPath = (id: string): string => `/intake/new?draft=${id}`;
export const methodPath = (m: string): string => `/intake/new?method=${m}`;
