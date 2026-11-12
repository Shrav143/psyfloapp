/* Small per-viewer conveniences (the assistant open or closed, the header's details). Storage can be blocked or full, so every read and write is guarded and
   the page works the same without it. */
export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writePref(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Blocked or full: the choice lasts until the page is closed.
  }
}
