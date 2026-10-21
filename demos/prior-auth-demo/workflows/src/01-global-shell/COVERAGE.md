# Coverage: Global shell

Source: `src/App.tsx`, `src/routes.ts`, `src/components/layout/*`, `src/store/core.ts`, `src/lib/time.ts`, `src/lib/hosted.ts`, `src/components/ui/Toaster.tsx`.

| Control | Where | Diagram |
|---|---|---|
| Logo 'psyflo.' and caption 'Prior auth & UR' (label only) | Sidebar top | 10 (note) |
| Captions 'Main', 'Connections' (labels only) | Sidebar | 10 (note) |
| 'Dashboard' | Sidebar | 10, 12 |
| 'Authorizations' (opens the group) | Sidebar | 10, 12 |
| 'New case' (sub row) | Sidebar | 10, 12 |
| 'Eligibility & Benefits' (sub row) | Sidebar | 10, 12 |
| 'Denial Intelligence' | Sidebar | 10, 12 |
| 'Case Manager' | Sidebar | 10, 12 |
| 'Analytics' (no badge) | Sidebar | 10, 12 |
| 'EMR Connect' (no badge) | Sidebar | 10, 12 |
| 'Payers' | Sidebar | 10, 12 |
| Number bubbles on Dashboard, Authorizations, New case, Eligibility & Benefits, Denial Intelligence, Case Manager, Payers | Sidebar | 11 |
| Chevron right / down on 'Authorizations' | Sidebar | 12 |
| Green highlight rules, bubble colour on the green row | Sidebar | 11, 12 |
| 'Demo data' tile (label only) | Sidebar footer | 10 (note), 50 |
| 'Settings' | Sidebar footer | 10, 50 |
| 'Help' (toast) | Sidebar footer | 50 |
| 'Sign out' (toast) | Sidebar footer | 50 |
| User card 'JP', 'Jordan Perez', 'UR coordinator' (label only) | Sidebar footer | 50 |
| 'Demo' button with clock pill | Top bar | 20, 40 |
| 'Ask FLO' button | Top bar | 20, 21 |
| 'Notifications' bell and red dot | Top bar | 20, 30 |
| Dimmed area, 'X', Escape on both drawers | Drawers | 20, 21, 30 |
| Demo menu: 'Time' text | Demo menu | 40 |
| 'Fast-forward 1 hour', 'Fast-forward 1 day' | Demo menu | 41 |
| 'Suggested path' steps 1 to 7 | Demo menu | 42 |
| 'Reset demo data' | Demo menu | 43 |
| Close by outside click, 'Demo' again; Escape does nothing | Demo menu | 40 |
| Four suggestion chips | Ask FLO | 21, 22 |
| 'Ask a question' box, 'Send', Enter | Ask FLO | 21 |
| 'FLO is working…', greeting, chat memory | Ask FLO | 21 |
| Answer rules and the five links under answers | Ask FLO | 22 |
| Notification row click (mark read, close, go) | Notifications | 30 |
| 'Mark all read' | Notifications | 30 |
| Subtitle '4 unread' / 'You are all caught up' | Notifications | 30 |
| What creates a notification | Store events | 31 |
| '/' to /dashboard | Address | 60 |
| '/active' to /manager | Address | 60 |
| '/referrals' to /authorizations/new | Address | 60 |
| '/referrals/:id' to /authorizations/new/referral/:id | Address | 60 |
| Unknown address: 'Page not found' | Address | 60 |
| Unknown record on a known page (case, draft) | Address | 60 (hand-off) |
| Toast: stack, tones, 4 s fade, click to dismiss | Bottom right | 70 |
| Toasts raised by the shell (Help, Sign out, clock, reset, hosted preview) | Bottom right | 70 |

## Not drawn

- Hover colours, keyboard focus order and screen reader text: no flow of their own.
- Ask FLO and Notifications are made exclusive by the store, but the dimmed area covers the top bar buttons, so a person cannot switch from one to the other with one click. Drawn as a note in 20.
- The hosted preview's in-memory router is only mentioned in 60's note.
- No privacy-mode switch exists anywhere in the shell. Privacy mode is always on (stated on Settings).

## Things that look broken or odd (for the report)

- Escape does not close the Demo menu, unlike both drawers.
- Ask FLO fallback reply says 'Try one of the suggestions below', but the chips are gone by then (they show only while the chat has fewer than three messages). It also ends '(Clock: just now.)', which reads '1 h ago' after a fast-forward.
- Fast-forward changes only the clock. It never makes a payer reply, a referral or a notification happen.
- The notification 'Drafts updated' says drafts return to Case Manager for a new signature, but Case Manager's lists do not change (the redraft only touches Dashboard requests).
